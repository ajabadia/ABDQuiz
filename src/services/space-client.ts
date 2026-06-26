/**
 * @purpose Gestiona el arrastre y soltar de Espacios desde ABDtenantGobernance a través de S2S.
 * @purpose_en Manages fetching and caching of Spaces from ABDtenantGobernance via S2S.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:8xip5d
 * @lastUpdated 2026-06-26T10:03:33.560Z
 */

/**
 * HTTP client for fetching Spaces from ABDtenantGobernance via S2S.
 * Replaces direct MongoDB access to the shared Space collection.
 */

import { getCache, setCache } from '@ajabadia/satellite-sdk/auth-middleware';

interface SpaceOption {
  _id: string;
  name: string;
  slug: string;
  type: string;
  isActive: boolean;
  parentSpaceId?: string;
  materializedPath?: string;
  collaborators: Array<{
    subjectId: string;
    subjectType: 'USER' | 'GROUP';
    role: 'VIEWER' | 'EDITOR' | 'ADMIN';
    propagates: boolean;
  }>;
}

const GOVERNANCE_URL = process.env.GOVERNANCE_API_URL || 'http://localhost:5002';
const INTERNAL_SECRET = process.env.ABD_INTERNAL_SECRET;

const ACTIVE_CACHE_TTL = 60 * 60; // 1 hour
const SINGLE_CACHE_TTL = 60 * 60; // 1 hour

function cacheKeyActive(tenantId: string): string {
  return `spaces:${tenantId}:active`;
}

function cacheKeySingle(tenantId: string, spaceId: string): string {
  return `spaces:${tenantId}:${spaceId}`;
}

export const SpaceServiceClient = {
  async getActiveSpaces(tenantId: string): Promise<SpaceOption[]> {
    if (!tenantId) return [];

    const ck = cacheKeyActive(tenantId);
    const cached = await getCache<SpaceOption[]>(ck);
    if (cached) return cached;

    try {
      const res = await fetch(
        `${GOVERNANCE_URL}/api/internal/spaces?tenantId=${encodeURIComponent(tenantId)}`,
        {
          headers: INTERNAL_SECRET
            ? { 'x-abd-internal-secret': INTERNAL_SECRET }
            : undefined,
        },
      );

      if (!res.ok) throw new Error(`Gobernance API returned ${res.status}`);

      const data = await res.json() as { spaces: SpaceOption[] };
      const activeSpaces = data.spaces.filter((s) => s.isActive);

      await setCache(ck, activeSpaces, ACTIVE_CACHE_TTL);

      return activeSpaces;
    } catch (err) {
      console.error('[SpaceServiceClient] Failed to fetch active spaces:', err);
      return [];
    }
  },

  async getSpaceById(spaceId: string, tenantId: string): Promise<SpaceOption | null> {
    if (!spaceId || !tenantId) return null;

    const ck = cacheKeySingle(tenantId, spaceId);
    const cached = await getCache<SpaceOption>(ck);
    if (cached) return cached;

    try {
      const res = await fetch(
        `${GOVERNANCE_URL}/api/internal/spaces?tenantId=${encodeURIComponent(tenantId)}&spaceId=${encodeURIComponent(spaceId)}`,
        {
          headers: INTERNAL_SECRET
            ? { 'x-abd-internal-secret': INTERNAL_SECRET }
            : undefined,
        },
      );

      if (!res.ok) throw new Error(`Gobernance API returned ${res.status}`);

      const data = await res.json() as { space: SpaceOption | null };

      if (data.space) {
        await setCache(ck, data.space, SINGLE_CACHE_TTL);
      }

      return data.space;
    } catch (err) {
      console.error('[SpaceServiceClient] Failed to fetch space by ID:', err);
      return null;
    }
  },
};
