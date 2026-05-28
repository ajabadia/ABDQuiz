import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

// ── Mocks ──────────────────────────────────────────────

// Set env vars before any test triggers the SDK logger (vi.hoisted runs before ESM imports)
vi.hoisted(() => {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  process.env.LOGS_SECRET_TOKEN = 'test-secret-token';
  process.env.LOGS_SERVICE_URL = 'http://localhost:3600/api/logs';
  process.env.NEXT_PUBLIC_APP_ID = 'quiz';
});

import { LogsClient } from './logs-client';

// ── Helpers ────────────────────────────────────────────

let fetchMock: ReturnType<typeof vi.fn>;

/**
 * Creates a minimal mock for the browser environment (window + localStorage).
 */
function enableBrowserEnv() {
  const store: Record<string, string> = {};
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  });
  return store; // Exposed for test assertions
}

function disableBrowserEnv() {
  vi.unstubAllGlobals();
}

/** @returns A jest-style mock matcher that accepts `mockResolvedValue` */
function mockFetch() {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function makeHealthResponse(ok = true): Response {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: ok ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeLogResponse(ok = true): Response {
  return new Response(JSON.stringify({ success: ok, id: 'log-1', hash: 'abc123' }), {
    status: ok ? 201 : 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

const samplePayload = {
  tenantId: 'tenant-1',
  action: 'TEST_ACTION',
  entityType: 'SYSTEM' as const,
  entityId: 'entity-1',
  userId: 'user-1',
  userEmail: 'test@abd.com',
};

// ── Tests ──────────────────────────────────────────────

describe('LogsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    LogsClient._resetForTest();
    LogsClient.clearBuffer();
  });

  afterEach(() => {
    disableBrowserEnv();
  });

  // ───── checkConnection ─────

  describe('checkConnection() — §12.C.1 Pre-flight Check', () => {
    it('should return connected=true when health endpoint responds with 200', async () => {
      const mockedFetch = mockFetch();
      mockedFetch.mockResolvedValue(makeHealthResponse(true));

      const result = await LogsClient.checkConnection();

      expect(result.connected).toBe(true);
      expect(result.error).toBeUndefined();
      expect(typeof result.latency).toBe('number');
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3600/api/logs/health',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should return connected=false when health endpoint returns non-200', async () => {
      mockFetch().mockResolvedValue(makeHealthResponse(false));

      const result = await LogsClient.checkConnection();

      expect(result.connected).toBe(false);
      expect(result.error).toContain('HTTP 503');
    });

    it('should return connected=false when fetch throws', async () => {
      mockFetch().mockRejectedValue(new Error('Network error'));

      const result = await LogsClient.checkConnection();

      expect(result.connected).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should detect AbortError and return timeout message', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch().mockRejectedValue(abortError);

      const result = await LogsClient.checkConnection();

      expect(result.connected).toBe(false);
      expect(result.error).toBe('Connection timeout (5s)');
    });

    it('should update internal status to connected on success', async () => {
      mockFetch().mockResolvedValue(makeHealthResponse(true));

      expect(LogsClient.getConnectionStatus()).toBe('unknown');

      await LogsClient.checkConnection();

      expect(LogsClient.getConnectionStatus()).toBe('connected');
    });

    it('should update internal status to disconnected on failure', async () => {
      mockFetch().mockRejectedValue(new Error('Network error'));

      await LogsClient.checkConnection();

      expect(LogsClient.getConnectionStatus()).toBe('disconnected');
    });

    it('should notify subscribers when status changes', async () => {
      const callback = vi.fn();
      LogsClient.onConnectionChange(callback);
      mockFetch().mockResolvedValue(makeHealthResponse(true));

      await LogsClient.checkConnection();

      expect(callback).toHaveBeenCalledWith('connected');
    });
  });

  // ───── onConnectionChange ─────

  describe('onConnectionChange()', () => {
    it('should call callback on status change', async () => {
      const callback = vi.fn();
      LogsClient.onConnectionChange(callback);
      mockFetch().mockRejectedValue(new Error('fail'));

      await LogsClient.checkConnection();

      expect(callback).toHaveBeenCalledWith('disconnected');
    });

    it('should not call callback after unsubscribe', async () => {
      const callback = vi.fn();
      const unsubscribe = LogsClient.onConnectionChange(callback);
      unsubscribe();

      mockFetch().mockResolvedValue(makeHealthResponse(true));
      await LogsClient.checkConnection();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ───── getConnectionStatus ─────

  describe('getConnectionStatus()', () => {
    it('should return unknown initially', () => {
      expect(LogsClient.getConnectionStatus()).toBe('unknown');
    });

    it('should return connected after successful check', async () => {
      mockFetch().mockResolvedValue(makeHealthResponse(true));
      await LogsClient.checkConnection();
      expect(LogsClient.getConnectionStatus()).toBe('connected');
    });

    it('should return disconnected after failed check', async () => {
      mockFetch().mockRejectedValue(new Error('fail'));
      await LogsClient.checkConnection();
      expect(LogsClient.getConnectionStatus()).toBe('disconnected');
    });
  });

  // ───── getBufferSize / clearBuffer ─────

  describe('getBufferSize() / clearBuffer()', () => {
    it('should return 0 when buffer is empty', () => {
      // Only works in browser env (localStorage)
      enableBrowserEnv();
      LogsClient.clearBuffer();
      expect(LogsClient.getBufferSize()).toBe(0);
    });

    it('should return 0 in server-side environment', () => {
      // No window/localStorage available
      expect(LogsClient.getBufferSize()).toBe(0);
    });

    it('should clear buffer on clearBuffer()', () => {
      enableBrowserEnv();
      LogsClient.clearBuffer();

      // Simulate offline buffering by forcing a failed log
      mockFetch().mockRejectedValue(new Error('offline'));
      // Log will buffer the payload
      LogsClient.log(samplePayload).catch(() => {});

      // Wait for async operations
      return vi.waitFor(
        () => {
          expect(LogsClient.getBufferSize()).toBeGreaterThan(0);
          LogsClient.clearBuffer();
          expect(LogsClient.getBufferSize()).toBe(0);
        },
        { timeout: 2000, interval: 50 }
      );
    });
  });

  // ───── flushBuffer ─────

  describe('flushBuffer() — §12.C.2 Offline Buffer Flush', () => {
    it('should return zeros when buffer is empty', async () => {
      const result = await LogsClient.flushBuffer();
      expect(result).toEqual({ flushed: 0, failed: 0, dropped: 0 });
    });

    it('should flush buffered entries on successful POST', async () => {
      enableBrowserEnv();
      LogsClient.clearBuffer();

      // Force a failed log to populate the buffer
      mockFetch().mockRejectedValue(new Error('offline'));
      await LogsClient.log(samplePayload);
      // Catch silent errors from fire-and-forget flushBuffer calls inside log()

      // Wait for buffer to have 1 entry
      await vi.waitFor(
        () => {
          expect(LogsClient.getBufferSize()).toBe(1);
        },
        { timeout: 2000, interval: 50 }
      );

      // Now mock fetch to succeed and flush
      mockFetch().mockResolvedValue(makeLogResponse(true));

      const result = await LogsClient.flushBuffer();

      expect(result.flushed).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.dropped).toBe(0);
      expect(LogsClient.getBufferSize()).toBe(0);
    });

    it('should retry failed entries and drop after MAX_RETRIES', async () => {
      enableBrowserEnv();
      LogsClient.clearBuffer();

      // Force a failed log to populate the buffer
      mockFetch().mockRejectedValue(new Error('offline'));
      await LogsClient.log(samplePayload);

      // Wait for buffer to have 1 entry
      await vi.waitFor(
        () => {
          expect(LogsClient.getBufferSize()).toBe(1);
        },
        { timeout: 2000, interval: 50 }
      );

      // Try to flush multiple times — each time the fetch fails, retry increments
      mockFetch().mockRejectedValue(new Error('still offline'));
      for (let i = 0; i < 5; i++) {
        await LogsClient.flushBuffer();
      }

      // 6th flush: entry should be dropped (retries >= 5)
      const result = await LogsClient.flushBuffer();
      expect(result.flushed).toBe(0);
      expect(result.dropped).toBe(1);
      expect(result.failed).toBe(0);
      expect(LogsClient.getBufferSize()).toBe(0);
    });
  });

  // ───── log ─────

  describe('log()', () => {
    it('should send POST to ABDLogs on success', async () => {
      mockFetch().mockResolvedValue(makeLogResponse(true));

      await LogsClient.log(samplePayload);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3600/api/logs',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-secret-token',
            'Content-Type': 'application/json',
          }),
        })
      );

      // Verify the body contains the payload data
      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      expect(body.tenantId).toBe('tenant-1');
      expect(body.action).toBe('TEST_ACTION');
      expect(body.appId).toBe('quiz');
    });

    it('should update connection status to connected on success', async () => {
      mockFetch().mockResolvedValue(makeLogResponse(true));

      await LogsClient.log(samplePayload);

      expect(LogsClient.getConnectionStatus()).toBe('connected');
    });

    it('should buffer payload on failure in browser environment', async () => {
      enableBrowserEnv();
      LogsClient.clearBuffer();
      mockFetch().mockRejectedValue(new Error('offline'));

      await LogsClient.log(samplePayload);

      // Wait for the buffer to be populated (fire-and-forget flushBuffer inside)
      await vi.waitFor(
        () => {
          expect(LogsClient.getBufferSize()).toBe(1);
        },
        { timeout: 2000, interval: 50 }
      );
    });

    it('should update connection status to disconnected on failure in browser', async () => {
      enableBrowserEnv();
      mockFetch().mockRejectedValue(new Error('offline'));

      await LogsClient.log(samplePayload);

      expect(LogsClient.getConnectionStatus()).toBe('disconnected');
    });

    it('should NOT buffer payload on failure in server-side environment', async () => {
      // Ensure no browser globals (server-side = no window/localStorage)
      disableBrowserEnv();
      mockFetch().mockRejectedValue(new Error('server error'));

      await LogsClient.log(samplePayload);

      expect(LogsClient.getBufferSize()).toBe(0);
    });

    it('should handle HTTP error status codes from ABDLogs', async () => {
      mockFetch().mockResolvedValue(makeLogResponse(false));

      // This should not throw — log() is fire-and-forget
      await expect(LogsClient.log(samplePayload)).resolves.toBeUndefined();
    });

    it('should automatically flush existing buffer on successful log', async () => {
      enableBrowserEnv();
      LogsClient.clearBuffer();

      // First: populate buffer with a failed log
      mockFetch().mockRejectedValue(new Error('offline'));
      await LogsClient.log({ ...samplePayload, action: 'BUFFERED' });

      // Wait for buffer to be populated
      await vi.waitFor(
        () => {
          expect(LogsClient.getBufferSize()).toBe(1);
        },
        { timeout: 2000, interval: 50 }
      );

      // Reset fetch mock and verify it's called again (for the buffered flush)
      mockFetch().mockResolvedValue(makeLogResponse(true));

      // Now send a new log — this should trigger flushBuffer internally
      await LogsClient.log({ ...samplePayload, action: 'SECOND' });

      // After the flush, the buffer should be empty
      await vi.waitFor(
        () => {
          expect(LogsClient.getBufferSize()).toBe(0);
        },
        { timeout: 2000, interval: 50 }
      );
    });

    it('should notify subscribers on status change in browser', async () => {
      enableBrowserEnv();
      const callback = vi.fn();
      LogsClient.onConnectionChange(callback);

      mockFetch().mockRejectedValue(new Error('offline'));
      await LogsClient.log(samplePayload);

      expect(callback).toHaveBeenCalledWith('disconnected');
    });

    it('should work with minimal payload', async () => {
      mockFetch().mockResolvedValue(makeLogResponse(true));

      const minimalPayload = {
        tenantId: 't1',
        action: 'HEARTBEAT',
        entityType: 'SYSTEM' as const,
        entityId: 'sys-1',
        userId: 'system',
        userEmail: 'system@abd.com',
      };

      await expect(LogsClient.log(minimalPayload)).resolves.toBeUndefined();
    });

    it('should handle abort/timeout on log send', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch().mockRejectedValue(abortError);

      await expect(LogsClient.log(samplePayload)).resolves.toBeUndefined();
    });
  });
});
