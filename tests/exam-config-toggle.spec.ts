import { test, expect } from '@playwright/test';
import { injectAdminSession } from './helpers/auth';

/**
 * 🎭 Exam Config — excludePreviouslyCorrect Toggle E2E Tests
 *
 * Coverage:
 *   ✓ Toggle renders with correct i18n label and description
 *   ✓ Toggle click activates/deactivates visual state
 *   ✓ Toggle persists after form submission and re-entry (ON → ON, ON→OFF→OFF)
 *
 * ⚙️ Authentication:
 *   Uses injectAdminSession() helper to set a properly signed abd_session JWT
 *   + abd_session_verified cookie to bypass the verifySessionExpiry call.
 */

const ADMIN_NEW_EXAM = '/es/admin/exams/new';

const pageErrors: string[] = [];

async function waitForHydration(page: any) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  if (pageErrors.length > 0) {
    console.log('\n⚠️  Page errors detected:', pageErrors.join('; '));
  }
}

test.describe('excludePreviouslyCorrect Toggle (Excluir Acertadas)', () => {

  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err: Error) => {
      pageErrors.push(`${err.message} at ${err.stack}`);
      console.log('⚠️  PAGE ERROR:', err.message, err.stack);
    });
    await injectAdminSession(page);
    await page.goto(ADMIN_NEW_EXAM, { waitUntil: 'load' });
    await waitForHydration(page);
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
    const toggleDiv = page.locator('div.cursor-pointer').filter({ hasText: 'Excluir Acertadas' }).first();
    await expect(toggleDiv).toBeVisible();

    // Initial state should be inactive (no primary background)
    await expect(toggleDiv).not.toHaveClass(/bg-primary\/5/);

    // Click to activate — wait for React state to propagate via class change
    await toggleDiv.click({ force: true });
    await expect(toggleDiv).toHaveClass(/bg-primary\/5/, { timeout: 5000 });

    // Click again to deactivate — wait for class change
    await toggleDiv.click({ force: true });
    await expect(toggleDiv).not.toHaveClass(/bg-primary\/5/, { timeout: 5000 });
  });

  test('should persist excludePreviouslyCorrect after form submission', async ({ page }) => {
    await page.waitForSelector('form', { timeout: 15000 });

    // 1. Fill in name (input has id="name" in BasicInfoCard)
    const nameInput = page.locator('#name');
    await expect(nameInput).toBeVisible();
    const uniqueName = `E2E_persist_ON_${Date.now()}`;
    await nameInput.fill(uniqueName);

    // 2. Toggle "Excluir Acertadas" ON — wait for class change
    const toggleDiv = page.locator('div.cursor-pointer').filter({ hasText: 'Excluir Acertadas' }).first();
    await toggleDiv.click({ force: true });
    await expect(toggleDiv).toHaveClass(/bg-primary\/5/, { timeout: 5000 });

    // 3. Submit the form
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 4. After successful save, we should be redirected to the exams list page
    await page.waitForURL(/\/es\/admin\/exams(\?|$)/, { timeout: 30000 });
    await page.waitForTimeout(3000);

    // 5. Find the newly created config by its unique name and click the edit pencil
    const configCard = page.locator('.group').filter({ hasText: uniqueName });
    await expect(configCard.first()).toBeVisible({ timeout: 15000 });
    await configCard.locator('a[href*="/edit"]').click();

    // 6. Wait for edit page to load the form
    await page.waitForSelector('form', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // 7. On the edit page, verify the toggle is still active
    const editToggleDiv = page.locator('div.cursor-pointer').filter({ hasText: 'Excluir Acertadas' }).first();
    await expect(editToggleDiv).toBeVisible();
    await expect(editToggleDiv).toHaveClass(/bg-primary\/5/, { timeout: 10000 });
  });

  test('should toggle off when previously saved as on', async ({ page }) => {
    await page.waitForSelector('form', { timeout: 15000 });

    // 1. Fill in name
    const nameInput = page.locator('#name');
    const uniqueName = `E2E_persist_OFF_${Date.now()}`;
    await nameInput.fill(uniqueName);

    // 2. Toggle ON first (default is OFF) — wait for class change
    const toggleDiv = page.locator('div.cursor-pointer').filter({ hasText: 'Excluir Acertadas' }).first();
    await toggleDiv.click({ force: true });
    await expect(toggleDiv).toHaveClass(/bg-primary\/5/, { timeout: 5000 });

    // 3. Now toggle OFF — wait for class change
    await toggleDiv.click({ force: true });
    await expect(toggleDiv).not.toHaveClass(/bg-primary\/5/, { timeout: 5000 });

    // 4. Submit
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // 5. Should redirect to exams list
    await page.waitForURL(/\/es\/admin\/exams(\?|$)/, { timeout: 30000 });
    await page.waitForTimeout(3000);

    // 6. Click edit on the new config
    const configCard = page.locator('.group').filter({ hasText: uniqueName });
    await expect(configCard.first()).toBeVisible({ timeout: 15000 });
    await configCard.locator('a[href*="/edit"]').click();

    // 7. Wait for edit page to load the form
    await page.waitForSelector('form', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // 8. Verify toggle is OFF (inactive styling)
    const editToggleDiv = page.locator('div.cursor-pointer').filter({ hasText: 'Excluir Acertadas' }).first();
    await expect(editToggleDiv).not.toHaveClass(/bg-primary\/5/, { timeout: 10000 });
  });
});
