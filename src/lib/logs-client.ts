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
  private static getApiConfig() {
    if (!process.env.LOGS_SECRET_TOKEN) {
      throw new Error('LOGS_SECRET_TOKEN is not defined in the environment variables');
    }
    return {
      endpoint: process.env.LOGS_SERVICE_URL || 'http://localhost:3600/api/logs',
      token: process.env.LOGS_SECRET_TOKEN,
      appId: process.env.NEXT_PUBLIC_APP_ID || 'quiz',
    };
  }

  /**
   * 📡 Envía un log de forma asíncrona (fire-and-forget) al microservicio ABDLogs
   */
  static async log(payload: LogPayload): Promise<void> {
    const { endpoint, token, appId } = this.getApiConfig();

    // Evitar bloqueos de ejecución en hilos principales del servidor
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        appId,
        createdAt: new Date(),
      }),
    }).catch(err => {
      console.error(`[LOGS_CLIENT_ERROR][${appId}] Failed to send log to central service:`, err);
    });
  }
}
