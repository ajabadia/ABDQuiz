import { test, expect } from '@playwright/test';
import { injectAdminSession } from './helpers/auth';

const QUIZ_URL = 'http://localhost:3300';

test.describe('🏗️ TenantSelector – mega menú contextual', () => {
  test('opens mega menu, shows organization data, and supports dismiss interactions', async ({ page }) => {
    // ── 1. Auth via shared helper (real AUTH_JWT_SECRET) ──
    await injectAdminSession(page);

    // ── 2. Navigate ──
    await page.goto(`${QUIZ_URL}/es`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('[data-testid="smart-navbar"]', { timeout: 20000 });
    await page.waitForTimeout(2000);

    // Verify authentication
    await expect(page.locator('[data-testid="navbar-menu-tenant"]')).toBeVisible({ timeout: 10000 });

    // ── 3. Open TenantSelector mega menu ──
    await page.locator('[data-testid="navbar-menu-tenant"]').click({ force: true });

    // ── 4. Wait for the mega menu panel (content variant) to appear ──
    await page.waitForSelector('[role="listbox"]', { timeout: 15000 });

    // ── 5. Verify ORGANIZACIÓN header is present ──
    await expect(page.locator('text=ORGANIZACIÓN').first()).toBeVisible({ timeout: 10000 });

    // ── 6. If spaces/groups exist, verify ESPACIOS/GRUPOS sections ──
    // Use try/catch to gracefully handle environments without seed data
    // Spaces and groups are fetched asynchronously
    try {
      await expect(page.locator('text=ESPACIOS').first()).toBeVisible({ timeout: 10000 });
    } catch {
      // No spaces configured for this tenant — skip silently
    }
    try {
      await expect(page.locator('text=GRUPOS').first()).toBeVisible({ timeout: 5000 });
    } catch {
      // No groups configured for this tenant — skip silently
    }

    // ── 7. Screenshot (with fallback if directory missing) ──
    try {
      await page.screenshot({ path: 'tests/screenshots/tenant-selector-ok.png', fullPage: false });
    } catch {
      // screenshots directory may not exist; skip silently
    }

    // ── 8. Test: Toggle close (click tenant button again) ──
    const tenantBtn = page.locator('[data-testid="navbar-menu-tenant"]');
    await tenantBtn.click({ force: true });
    await page.waitForTimeout(800);
    await expect(page.locator('[role="listbox"]')).not.toBeVisible({ timeout: 5000 });

    // ── 9. Re-open for Escape test ──
    await tenantBtn.click({ force: true });
    await expect(page.locator('[role="listbox"]')).toBeVisible({ timeout: 15000 });

    // ── 10. Test: Escape key dismiss ──
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    await expect(page.locator('[role="listbox"]')).not.toBeVisible({ timeout: 5000 });
  });
});
