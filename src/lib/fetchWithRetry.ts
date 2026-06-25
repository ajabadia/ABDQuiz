/**
 * @purpose Gestiona solicitudes HTTP con lógica de retry.
 * @purpose_en Handles HTTP requests with retry logic.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:19w2rbd
 * @lastUpdated 2026-06-25T09:19:31.567Z
 */

export interface FetchWithRetryOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { retries = 3, retryDelay = 1000, ...fetchOptions } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);
      if (response.ok || attempt === retries) {
        return response;
      }
    } catch {
      if (attempt === retries) {
        throw new Error(`Fallo después de ${retries} intentos: ${url}`);
      }
    }
    await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
  }

  throw new Error(`Fallo después de ${retries} intentos: ${url}`);
}
