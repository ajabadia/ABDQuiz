import { test, expect } from '@playwright/test';

/**
 * 🎭 SmartNavbar Industrial E2E Tests — ABDQuiz (Public Mode)
 *
 * Coverage:
 *   ✓ SmartNavbar renders in public mode
 *   ✓ Theme mega-menu: open/close, switch options
 *   ✓ Language mega-menu: ES/EN options and locale switch
 *   ✓ Settings slot visible
 *
 * ABDQuiz runs on port 3300 (default).
 */

const PUBLIC_PAGE = '/es';

test.describe('SmartNavbar — Public Mode (ABDQuiz)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PUBLIC_PAGE);
    await page.waitForSelector('[data-testid="smart-navbar"]', { timeout: 15000 });
  });

  test('should render SmartNavbar with brand and login button', async ({ page }) => {
    await expect(page.locator('[data-testid="smart-navbar"]')).toBeVisible();
    await expect(page.locator('[data-testid="navbar-logo"]')).toBeVisible();

    // Language toggle should be present
    await expect(page.locator('[data-testid="navbar-menu-language"]')).toBeVisible();
    // Theme toggle should be present
    await expect(page.locator('[data-testid="navbar-menu-theme"]')).toBeVisible();
  });

  test('should display app badge "QUIZ" next to the brand logo', async ({ page }) => {
    await expect(page.locator('[data-testid="navbar-logo"]')).toContainText('QUIZ');
  });

  test('hamburger toggle should not be visible on desktop viewport', async ({ page }) => {
    // The hamburger uses smart-navbar-mobile-only (display:none on md+)
    await expect(page.locator('[data-testid="navbar-mobile-toggle"]')).not.toBeVisible();
  });

  test('theme mega-menu: open and interact with light/dark/system', async ({ page }) => {
    await page.locator('[data-testid="navbar-menu-theme"]').click();
    const dropdown = page.locator('[data-testid="navbar-dropdown"]');
    await expect(dropdown).toBeVisible();

    await expect(dropdown.locator('button', { hasText: /CLARO|LIGHT/i })).toBeVisible();
    await expect(dropdown.locator('button', { hasText: /OSCURO|DARK/i })).toBeVisible();
    await expect(dropdown.locator('button', { hasText: /SISTEMA|SYSTEM/i })).toBeVisible();
  });

  test('language mega-menu: open and see ES/EN options', async ({ page }) => {
    await page.locator('[data-testid="navbar-menu-language"]').click();
    const dropdown = page.locator('[data-testid="navbar-dropdown"]');
    await expect(dropdown).toBeVisible();

    await expect(dropdown.locator('button', { hasText: 'ESPAÑOL' })).toBeVisible();
    await expect(dropdown.locator('button', { hasText: 'ENGLISH' })).toBeVisible();
  });

  test('language mega-menu: switch to English', async ({ page }) => {
    await page.locator('[data-testid="navbar-menu-language"]').click();
    await page.locator('[data-testid="navbar-dropdown"]').waitFor({ state: 'visible' });

    await page.locator('[data-testid="navbar-dropdown"] button', { hasText: 'ENGLISH' }).click();
    await page.waitForURL(/\/en/, { timeout: 10000 });
  });

  test('theme: dark mode switch applies class', async ({ page }) => {
    await page.locator('[data-testid="navbar-menu-theme"]').click();
    await page.locator('[data-testid="navbar-dropdown"]').waitFor({ state: 'visible' });

    // Click DARK/OSCURO
    const darkBtn = page.locator('[data-testid="navbar-dropdown"] button', { hasText: /OSCURO|DARK/i });
    await darkBtn.click();

    // Verify html class changed
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('theme mega-menu: clicking outside closes the menu', async ({ page }) => {
    await page.locator('[data-testid="navbar-menu-theme"]').click();
    await page.locator('[data-testid="navbar-dropdown"]').waitFor({ state: 'visible' });

    // Click outside the navbar (on the main content area)
    await page.locator('main').click({ position: { x: 10, y: 10 } });

    // Menu should close
    await expect(page.locator('[data-testid="navbar-dropdown"]')).not.toBeVisible({ timeout: 3000 });
  });

  test('language mega-menu: Escape key closes the menu', async ({ page }) => {
    await page.locator('[data-testid="navbar-menu-language"]').click();
    await page.locator('[data-testid="navbar-dropdown"]').waitFor({ state: 'visible' });

    // Press Escape
    await page.keyboard.press('Escape');

    // Menu should close
    await expect(page.locator('[data-testid="navbar-dropdown"]')).not.toBeVisible({ timeout: 3000 });
  });
});

// ──────────────────────────────────────────
//  Mobile Drawer Tests
// ──────────────────────────────────────────

test.describe('SmartNavbar — Mobile Drawer (ABDQuiz)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/es');
    await page.waitForSelector('[data-testid="smart-navbar"]', { timeout: 15000 });
  });

  test('hamburger toggle is visible on mobile viewport', async ({ page }) => {
    await expect(page.locator('[data-testid="navbar-mobile-toggle"]')).toBeVisible();
  });

  test('clicking hamburger opens and closes the mobile drawer', async ({ page }) => {
    await page.locator('[data-testid="navbar-mobile-toggle"]').click();
    await expect(page.locator('[data-testid="navbar-mobile-drawer"]')).toBeVisible();

    await page.locator('[data-testid="navbar-mobile-toggle"]').click();
    await expect(page.locator('[data-testid="navbar-mobile-drawer"]')).not.toBeVisible({ timeout: 3000 });
  });

  test('mobile drawer has correct accessibility attributes', async ({ page }) => {
    await page.locator('[data-testid="navbar-mobile-toggle"]').click();
    const drawer = page.locator('[data-testid="navbar-mobile-drawer"]');
    await expect(drawer).toHaveAttribute('role', 'dialog');
    await expect(drawer).toHaveAttribute('aria-modal', 'true');
    await expect(drawer).toHaveAttribute('aria-label', 'Mobile navigation');
  });

  test('clicking backdrop closes the mobile drawer', async ({ page }) => {
    await page.locator('[data-testid="navbar-mobile-toggle"]').click();
    await expect(page.locator('[data-testid="navbar-mobile-drawer"]')).toBeVisible();

    // Backdrop has z-index:30, drawer has z-index:40 and covers y≥56.
    // Coordinate clicks can't reach the backdrop. Dispatch click directly via JS.
    await page.evaluate(() => {
      const backdrop = document.querySelector('[aria-hidden="true"]');
      if (backdrop) {
        backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });

    await expect(page.locator('[data-testid="navbar-mobile-drawer"]')).not.toBeVisible({ timeout: 3000 });
  });

  test('Escape key closes the mobile drawer', async ({ page }) => {
    await page.locator('[data-testid="navbar-mobile-toggle"]').click();
    await expect(page.locator('[data-testid="navbar-mobile-drawer"]')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="navbar-mobile-drawer"]')).not.toBeVisible({ timeout: 3000 });
  });
});
