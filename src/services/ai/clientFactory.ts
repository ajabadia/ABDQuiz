/**
 * @purpose Gestiona la creación y caché de un proveedor de inteligencia artificial según variables ambientales disponibles y contexto del inquilino.
 * @purpose_en Manages the creation and caching of an AI provider based on available environment variables and tenant context.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1pl3x90
 * @lastUpdated 2026-06-26T10:03:15.128Z
 */

import type { AIProvider } from './types';
import { GeminiProvider } from './providers/gemini';

/**
 * Create an AI provider based on available environment variables.
 * Priority: Gemini (GEMINI_API_KEY) → OpenAI (OPENAI_API_KEY).
 * A new instance is created per call to ensure per-tenant isolation.
 */
export function createAIProvider(tenantId: string): AIProvider {
  if (process.env.GEMINI_API_KEY) {
    return new GeminiProvider(tenantId);
  }

  // Future: OpenAI support
  // if (process.env.OPENAI_API_KEY) {
  //   return new OpenAIProvider(tenantId);
  // }

  throw new Error(
    'No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY environment variable.'
  );
}
