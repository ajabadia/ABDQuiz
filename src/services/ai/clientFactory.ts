/**
 * @purpose Gestiona la creación y caché de un proveedor de inteligencia artificial basado en variables ambientales disponibles.
 * @purpose_en Manages the creation and caching of an AI provider based on available environment variables.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:2,imports:2,sig:b2czf5
 * @lastUpdated 2026-06-23T23:23:34.102Z
 */

import type { AIProvider } from './types';
import { GeminiProvider } from './providers/gemini';

let cachedProvider: AIProvider | null = null;

/**
 * Create an AI provider based on available environment variables.
 * Priority: Gemini (GEMINI_API_KEY) → OpenAI (OPENAI_API_KEY).
 */
export function createAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;

  if (process.env.GEMINI_API_KEY) {
    cachedProvider = new GeminiProvider();
    return cachedProvider;
  }

  // Future: OpenAI support
  // if (process.env.OPENAI_API_KEY) {
  //   cachedProvider = new OpenAIProvider();
  //   return cachedProvider;
  // }

  throw new Error(
    'No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY environment variable.'
  );
}

/**
 * Reset the cached provider (useful for testing).
 */
export function resetAIProvider(): void {
  cachedProvider = null;
}
