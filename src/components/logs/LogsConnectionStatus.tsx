'use client';

/**
 * @purpose Renderiza un componente UI que muestra el estado de conectividad real tiempo del servicio ABDLogs y el conteo de registros desincronizados bufferizados pendientes de retransmisión.
 * @purpose_en Renders a UI component that displays the real-time connectivity status of the ABDLogs microservice and the count of offline-buffered logs pending retransmission.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1nut38p
 * @lastUpdated 2026-06-23T23:21:55.926Z
 */

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw, HardDrive } from 'lucide-react';
import { logger } from '@ajabadia/satellite-sdk';

type ConnectionStatus = 'unknown' | 'connected' | 'disconnected';

/**
 * 🩺 LogsConnectionStatus — §12.C.1 + §12.C.2 UI Indicator
 *
 * Displays the real-time connectivity status of ABDLogs microservice
 * and the count of offline-buffered logs pending retransmission.
 *
 * - Green dot + "Connected": ABDLogs reachable, buffer empty
 * - Yellow dot + "Offline (N)": ABDLogs unreachable, N logs buffered
 * - Red dot + "Disconnected": ABDLogs unreachable, no buffer or critical
 * - Grey dot: Checking...
 *
 * Auto-checks every 60 seconds. Manual refresh via click on the status dot.
 */
export function LogsConnectionStatus() {
  const t = useTranslations('logs');
  const [status, setStatus] = useState<ConnectionStatus>('unknown');
  const [bufferSize, setBufferSize] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  const updateBufferSize = useCallback(() => {
    setBufferSize(logger.getBufferSize());
  }, []);

  const check = useCallback(async () => {
    setChecking(true);
    const result = await logger.checkConnection();
    setStatus(result.connected ? 'connected' : 'disconnected');
    setLatency(result.latency);
    updateBufferSize();
    setChecking(false);
  }, [updateBufferSize]);

  // Initial check + periodic polling
  useEffect(() => {
    // Initial check — inline to avoid sync setChecking(true) in effect body
    logger.checkConnection().then((result) => {
      setStatus(result.connected ? 'connected' : 'disconnected');
      setLatency(result.latency);
      updateBufferSize();
    });

    const interval = setInterval(check, 60_000); // every 60s
    const bufferInterval = setInterval(updateBufferSize, 5_000); // buffer size polling

    // Listen for connection changes from log() method
    const unsubscribe = logger.onConnectionChange((newStatus) => {
      setStatus(newStatus);
      updateBufferSize();
    });

    // Also flush buffer when connection is restored (detected via online event)
    const handleOnline = () => {
      logger.flushBuffer().then((result) => {
        if (result.flushed > 0) {
          // Re-check status after flush
          check();
        }
        updateBufferSize();
      });
    };

    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      clearInterval(bufferInterval);
      unsubscribe();
      window.removeEventListener('online', handleOnline);
    };
  }, [check, updateBufferSize]);

  const statusColor = status === 'connected' ? 'bg-emerald-500' : 'bg-red-500';
  const statusPulse = status === 'connected' ? '' : 'animate-pulse';
  const hasBuffer = bufferSize > 0;

  return (
    <div className="flex items-center gap-3 text-[9px] font-mono uppercase tracking-wider">
      {/* Connection Status Dot */}
      <button
        onClick={check}
        disabled={checking}
        aria-label={t('checkConnection')}
        className="flex items-center gap-2 group"
        title={
          status === 'connected'
            ? t('connectedTooltip', { latency: latency ?? 0 })
            : status === 'disconnected'
              ? t('disconnectedTooltip')
              : t('checkingTooltip')
        }
      >
        {checking ? (
          <RefreshCw className="w-2.5 h-2.5 text-muted-foreground animate-spin" />
        ) : (
          <span
            className={`inline-block w-2 h-2 rounded-full ${statusColor} ${statusPulse} transition-colors`}
          />
        )}
        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
          {status === 'connected'
            ? t('connectedLabel')
            : status === 'disconnected'
              ? t('disconnectedLabel')
              : t('checkingLabel')}
        </span>
      </button>

      {/* Latency (when connected) */}
      {status === 'connected' && latency !== null && !checking && (
        <span className="text-muted-foreground/50">
          {latency}ms
        </span>
      )}

      {/* Offline Buffer Indicator */}
      {hasBuffer && (
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400"
          title={t('bufferTooltip', { count: bufferSize })}
        >
          <HardDrive className="w-2.5 h-2.5" />
          <span className="text-[8px] font-bold tracking-wider">
            {bufferSize}
          </span>
        </div>
      )}
    </div>
  );
}
