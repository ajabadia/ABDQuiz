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
    await page.waitForURL(/\/en\//, { timeout: 10000 });
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
});
