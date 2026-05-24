import { logger, configureLogger } from '@abd/satellite-sdk';

export interface LogPayload {
  tenantId: string;
  action: string;
  entityType: 'USER' | 'TENANT' | 'SSO' | 'EXAM' | 'CONFIG' | 'SYSTEM' | 'SPACE' | 'BRANDING' | 'QUESTION' | 'ALLEGATION';
  entityId: string;
  userId: string;
  userEmail: string;
  changedFields?: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export class LogsClient {
  private static initialized = false;

  private static init() {
    if (this.initialized) return;

    if (!process.env.LOGS_SECRET_TOKEN) {
      throw new Error('LOGS_SECRET_TOKEN is not defined in the environment variables');
    }

    configureLogger({
      endpoint: process.env.LOGS_SERVICE_URL || 'http://localhost:3600/api/logs',
      token: process.env.LOGS_SECRET_TOKEN,
      appId: process.env.NEXT_PUBLIC_APP_ID || 'quiz',
    });
    this.initialized = true;
  }

  /**
   * 📡 Envía un log de forma asíncrona (fire-and-forget) al microservicio ABDLogs usando el Logger centralizado
   */
  static async log(payload: LogPayload): Promise<void> {
    this.init();
    logger.audit(payload);
  }
}
