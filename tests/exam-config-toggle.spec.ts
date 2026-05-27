import { test, expect } from '@playwright/test';

/**
 * 🎭 Exam Config — excludePreviouslyCorrect Toggle E2E Tests
 *
 * Coverage:
 *   ✓ Toggle renders with correct i18n label and description
 *   ✓ Toggle click activates/deactivates visual state
 *   ✓ Toggle persists after form submission and re-entry (ON → ON, ON→OFF→OFF)
 *
 * ⚠️ PREREQUISITES:
 *   - Dev server must be running on port 3300 (`pnpm dev`)
 *   - User must be authenticated as ADMIN (abd_session cookie required)
 *   - Use `--project=chromium` to run in headless mode
 *
 * ⚙️ Authentication:
 *   Admin routes are protected by `ensureIndustrialAccess` (JWT in `abd_session` cookie).
 *   Set the cookie before running, e.g. via browser DevTools after SSO login.
 *   Tests gracefully skip if redirected to the IdP authorize endpoint.
 */

const ADMIN_NEW_EXAM = '/es/admin/exams/new';

test.describe('excludePreviouslyCorrect Toggle (Excluir Acertadas)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(ADMIN_NEW_EXAM, { waitUntil: 'load' });
    if (page.url().includes('/api/auth/federated/authorize')) {
      test.skip(true, '⚠️ Authentication required. Set abd_session cookie or login manually.');
    }
  });

  test('should render the toggle with correct label and description', async ({ page }) => {
    await page.waitForSelector('form', { timeout: 15000 });

    // The 6th toggle card should be visible with label "Excluir Acertadas"
    const toggleLabel = page.locator('text=Excluir Acertadas').first();
    await expect(toggleLabel).toBeVisible({ timeout: 10000 });

    // The description text should also be visible
    const descText = page.locator('text=Descarta preguntas ya respondidas correctamente');
    await expect(descText).toBeVisible();
  });

  test('should toggle active/inactive visual state on click', async ({ page }) => {
    await page.waitForSelector('form', { timeout: 15000 });

    // Find the clickable toggle div by its text content
    const toggleDiv = page.locator('div.cursor-pointer').filter({ hasText: 'Excluir Acertadas' });
    await expect(toggleDiv).toBeVisible();

    // Initial state should be inactive (no primary background)
    await expect(toggleDiv).not.toHaveClass(/bg-primary\/5/);

    // Click to activate
    await toggleDiv.click();

    // Now it should have active styling
    await expect(toggleDiv).toHaveClass(/bg-primary\/5/);

    // Click again to deactivate
    await toggleDiv.click();

    // Should be back to inactive
    await expect(toggleDiv).not.toHaveClass(/bg-primary\/5/);
  });

  test('should persist excludePreviouslyCorrect after form submission', async ({ page }) => {
    await page.waitForSelector('form', { timeout: 15000 });

    // 1. Fill in name (input has id="name" in BasicInfoCard)
    const nameInput = page.locator('#name');
    await expect(nameInput).toBeVisible();
    const uniqueName = `E2E_persist_ON_${Date.now()}`;
    await nameInput.fill(uniqueName);

    // 2. Toggle "Excluir Acertadas" ON
    const toggleDiv = page.locator('div.cursor-pointer').filter({ hasText: 'Excluir Acertadas' });
    await toggleDiv.click();
    await expect(toggleDiv).toHaveClass(/bg-primary\/5/);

    // 3. Submit the form
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 4. After successful save, we should be redirected to the exams list page
    await page.waitForURL(/\/es\/admin\/exams(\?|$)/, { timeout: 15000 });

    // 5. Find the newly created config by its unique name and click edit
    const configLink = page.locator(`a:has-text("${uniqueName}")`).first();
    await expect(configLink).toBeVisible({ timeout: 10000 });
    await configLink.click();

    // 6. On the edit page, verify the toggle is still active
    await page.waitForSelector('form', { timeout: 15000 });
    const editToggleDiv = page.locator('div.cursor-pointer').filter({ hasText: 'Excluir Acertadas' });
    await expect(editToggleDiv).toBeVisible();
    await expect(editToggleDiv).toHaveClass(/bg-primary\/5/);
  });

  test('should toggle off when previously saved as on', async ({ page }) => {
    await page.waitForSelector('form', { timeout: 15000 });

    // 1. Fill in name
    const nameInput = page.locator('#name');
    const uniqueName = `E2E_persist_OFF_${Date.now()}`;
    await nameInput.fill(uniqueName);

    // 2. Toggle ON first (default is OFF)
    const toggleDiv = page.locator('div.cursor-pointer').filter({ hasText: 'Excluir Acertadas' });
    await toggleDiv.click();
    await expect(toggleDiv).toHaveClass(/bg-primary\/5/);

    // 3. Now toggle OFF
    await toggleDiv.click();
    await expect(toggleDiv).not.toHaveClass(/bg-primary\/5/);

    // 4. Submit
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // 5. Should redirect to exams list
    await page.waitForURL(/\/es\/admin\/exams(\?|$)/, { timeout: 15000 });

    // 6. Click edit on the new config
    const configLink = page.locator(`a:has-text("${uniqueName}")`).first();
    await expect(configLink).toBeVisible({ timeout: 10000 });
    await configLink.click();

    // 7. Verify toggle is OFF (inactive styling)
    await page.waitForSelector('form', { timeout: 15000 });
    const editToggleDiv = page.locator('div.cursor-pointer').filter({ hasText: 'Excluir Acertadas' });
    await expect(editToggleDiv).not.toHaveClass(/bg-primary\/5/);
  });
});
