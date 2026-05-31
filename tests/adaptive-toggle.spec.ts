import { test, expect } from '@playwright/test';
import { injectAdminSession } from './helpers/auth';

/**
 * 🎭 Exam Config — adaptiveQuestionSelection Toggle E2E Tests
 *
 * Coverage:
 *   ✓ Toggle renders with correct i18n label and description
 *   ✓ Toggle click activates/deactivates visual state
 *   ✓ Toggle persists after form submission and re-entry (ON → ON)
 *   ✓ Toggle off when previously saved as on (ON→OFF → OFF)
 *   ✓ Both adaptive + excludePreviouslyCorrect toggles can be active simultaneously
 *
 * ⚙️ Authentication:
 *   Uses injectAdminSession() helper to set a properly signed abd_session JWT
 *   + abd_session_verified cookie to bypass the verifySessionExpiry call.
 */

const ADMIN_NEW_EXAM = '/es/admin/exams/new';

test.describe('adaptiveQuestionSelection Toggle (Selección Adaptativa)', () => {

  test.beforeEach(async ({ page }) => {
    await injectAdminSession(page);
    await page.goto(ADMIN_NEW_EXAM, { waitUntil: 'load' });
  });

  test('should render the toggle with correct label and description', async ({ page }) => {
    await page.waitForSelector('form', { timeout: 15000 });

    // The 7th toggle card should be visible with label "Selección Adaptativa"
    const toggleLabel = page.locator('text=Selección Adaptativa').first();
    await expect(toggleLabel).toBeVisible({ timeout: 10000 });

    // The description text should also be visible
    const descText = page.locator('text=módulos y dificultades con peor rendimiento histórico');
    await expect(descText).toBeVisible();
  });

  test('should toggle active/inactive visual state on click', async ({ page }) => {
    await page.waitForSelector('form', { timeout: 15000 });

    // Find the toggle by its label text within the TogglesCard
    const toggleCard = page.locator('div.cursor-pointer').filter({ hasText: 'Selección Adaptativa' });
    await expect(toggleCard.first()).toBeVisible();

    // Initial state should be inactive (no primary background)
    const toggleDiv = toggleCard.first();
    await expect(toggleDiv).not.toHaveClass(/bg-primary\/5/);

    // Click to activate (force:true to bypass any child element interception)
    await toggleDiv.click({ force: true });
    await page.waitForTimeout(500);

    // Now it should have active styling
    await expect(toggleDiv).toHaveClass(/bg-primary\/5/);

    // Click again to deactivate
    await toggleDiv.click({ force: true });
    await page.waitForTimeout(500);

    // Should be back to inactive
    await expect(toggleDiv).not.toHaveClass(/bg-primary\/5/);
  });

  test('should persist adaptive selection after form submission', async ({ page }) => {
    await page.waitForSelector('form', { timeout: 15000 });

    // 1. Fill in name (input has id="name" in BasicInfoCard)
    const nameInput = page.locator('#name');
    await expect(nameInput).toBeVisible();
    const uniqueName = `E2E_adaptive_ON_${Date.now()}`;
    await nameInput.fill(uniqueName);

    // 2. Toggle "Selección Adaptativa" ON with force:true
    const toggleDiv = page.locator('div.cursor-pointer').filter({ hasText: 'Selección Adaptativa' }).first();
    await toggleDiv.click({ force: true });
    await page.waitForTimeout(300);
    await expect(toggleDiv).toHaveClass(/bg-primary\/5/);

    // 3. Submit the form
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 4. Wait for redirect to exams list (server action + router.push)
    await page.waitForURL(/\/es\/admin\/exams(\?|$)/, { timeout: 30000 });
    await page.waitForTimeout(3000);

    // 5. Find the newly created config by its unique name and click the edit pencil
    const configCard = page.locator('.group').filter({ hasText: uniqueName });
    await expect(configCard.first()).toBeVisible({ timeout: 15000 });
    await configCard.locator('a[href*="/edit"]').click();

    // 6. Wait for edit page to load the form (full navigation + server components)
    await page.waitForTimeout(3000);
    await page.waitForSelector('form', { timeout: 30000 });
    await page.waitForTimeout(500);
    
    // 7. On the edit page, verify the toggle is still active
    const editToggleDiv = page.locator('div.cursor-pointer').filter({ hasText: 'Selección Adaptativa' }).first();
    await expect(editToggleDiv).toBeVisible();
    await expect(editToggleDiv).toHaveClass(/bg-primary\/5/);
  });

  test('should toggle off when previously saved as on', async ({ page }) => {
    await page.waitForSelector('form', { timeout: 15000 });

    // 1. Fill in name
    const nameInput = page.locator('#name');
    const uniqueName = `E2E_adaptive_OFF_${Date.now()}`;
    await nameInput.fill(uniqueName);

    // 2. Toggle ON first (default is OFF)
    const toggleDiv = page.locator('div.cursor-pointer').filter({ hasText: 'Selección Adaptativa' }).first();
    await toggleDiv.click({ force: true });
    await page.waitForTimeout(300);
    await expect(toggleDiv).toHaveClass(/bg-primary\/5/);

    // 3. Now toggle OFF
    await toggleDiv.click({ force: true });
    await page.waitForTimeout(300);
    await expect(toggleDiv).not.toHaveClass(/bg-primary\/5/);

    // 4. Submit
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // 5. Redirect to exams list
    await page.waitForURL(/\/es\/admin\/exams(\?|$)/, { timeout: 30000 });
    await page.waitForTimeout(3000);

    // 6. Click edit on the new config
    const configCard = page.locator('.group').filter({ hasText: uniqueName });
    await expect(configCard.first()).toBeVisible({ timeout: 15000 });
    await configCard.locator('a[href*="/edit"]').click();

    // 7. Wait for edit page to load the form
    await page.waitForTimeout(3000);
    await page.waitForSelector('form', { timeout: 30000 });
    await page.waitForTimeout(500);
    
    // 8. Verify toggle is OFF (inactive styling)
    const editToggleDiv = page.locator('div.cursor-pointer').filter({ hasText: 'Selección Adaptativa' }).first();
    await expect(editToggleDiv).not.toHaveClass(/bg-primary\/5/);
  });

  test('should work simultaneously with exclude previously correct toggle', async ({ page }) => {
    await page.waitForSelector('form', { timeout: 15000 });

    // 1. Fill in name
    const nameInput = page.locator('#name');
    const uniqueName = `E2E_both_ON_${Date.now()}`;
    await nameInput.fill(uniqueName);

    // 2. Toggle "Excluir Acertadas" ON
    const excludeToggle = page.locator('div.cursor-pointer').filter({ hasText: 'Excluir Acertadas' }).first();
    await excludeToggle.click({ force: true });
    await page.waitForTimeout(300);
    await expect(excludeToggle).toHaveClass(/bg-primary\/5/);

    // 3. Toggle "Selección Adaptativa" ON
    const adaptiveToggle = page.locator('div.cursor-pointer').filter({ hasText: 'Selección Adaptativa' }).first();
    await adaptiveToggle.click({ force: true });
    await page.waitForTimeout(300);
    await expect(adaptiveToggle).toHaveClass(/bg-primary\/5/);

    // 4. Verify BOTH are active simultaneously
    await expect(excludeToggle).toHaveClass(/bg-primary\/5/);
    await expect(adaptiveToggle).toHaveClass(/bg-primary\/5/);

    // 5. Submit
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // 6. Redirect to exams list
    await page.waitForURL(/\/es\/admin\/exams(\?|$)/, { timeout: 30000 });
    await page.waitForTimeout(3000);

    // 7. Click edit on the new config
    const configCard = page.locator('.group').filter({ hasText: uniqueName });
    await expect(configCard.first()).toBeVisible({ timeout: 15000 });
    await configCard.locator('a[href*="/edit"]').click();

    // 8. Wait for edit page to load the form
    await page.waitForTimeout(3000);
    await page.waitForSelector('form', { timeout: 30000 });
    await page.waitForTimeout(500);
    
    // 9. Verify BOTH toggles persisted as active
    const editExcludeToggle = page.locator('div.cursor-pointer').filter({ hasText: 'Excluir Acertadas' }).first();
    const editAdaptiveToggle = page.locator('div.cursor-pointer').filter({ hasText: 'Selección Adaptativa' }).first();
    await expect(editExcludeToggle).toHaveClass(/bg-primary\/5/);
    await expect(editAdaptiveToggle).toHaveClass(/bg-primary\/5/);
  });
});
