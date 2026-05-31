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
