# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: adaptive-toggle.spec.ts >> adaptiveQuestionSelection Toggle (Selección Adaptativa) >> should render the toggle with correct label and description
- Location: tests\adaptive-toggle.spec.ts:43:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('form') to be visible

```

# Page snapshot

```yaml
- generic [ref=e2]: Internal Server Error
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { injectAdminSession } from './helpers/auth';
  3   | 
  4   | /**
  5   |  * 🎭 Exam Config — adaptiveQuestionSelection Toggle E2E Tests
  6   |  *
  7   |  * Coverage:
  8   |  *   ✓ Toggle renders with correct i18n label and description
  9   |  *   ✓ Toggle click activates/deactivates visual state
  10  |  *   ✓ Toggle persists after form submission and re-entry (ON → ON)
  11  |  *   ✓ Toggle off when previously saved as on (ON→OFF → OFF)
  12  |  *   ✓ Both adaptive + excludePreviouslyCorrect toggles can be active simultaneously
  13  |  *
  14  |  * ⚙️ Authentication:
  15  |  *   Uses injectAdminSession() helper to set a properly signed abd_session JWT
  16  |  *   + abd_session_verified cookie to bypass the verifySessionExpiry call.
  17  |  */
  18  | 
  19  | const ADMIN_NEW_EXAM = '/es/admin/exams/new';
  20  | 
  21  | const pageErrors: string[] = [];
  22  | 
  23  | async function waitForHydration(page: any) {
  24  |   await page.waitForLoadState('networkidle');
  25  |   await page.waitForTimeout(3000);
  26  |   if (pageErrors.length > 0) {
  27  |     console.log('\n⚠️  Page errors detected:', pageErrors.join('; '));
  28  |   }
  29  | }
  30  | 
  31  | test.describe('adaptiveQuestionSelection Toggle (Selección Adaptativa)', () => {
  32  | 
  33  |   test.beforeEach(async ({ page }) => {
  34  |     page.on('pageerror', (err: Error) => {
  35  |       pageErrors.push(`${err.message} at ${err.stack}`);
  36  |       console.log('⚠️  PAGE ERROR:', err.message, err.stack);
  37  |     });
  38  |     await injectAdminSession(page);
  39  |     await page.goto(ADMIN_NEW_EXAM, { waitUntil: 'load' });
  40  |     await waitForHydration(page);
  41  |   });
  42  | 
  43  |   test('should render the toggle with correct label and description', async ({ page }) => {
> 44  |     await page.waitForSelector('form', { timeout: 15000 });
      |                ^ TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
  45  | 
  46  |     // The 7th toggle card should be visible with label "Selección Adaptativa"
  47  |     const toggleLabel = page.locator('text=Selección Adaptativa').first();
  48  |     await expect(toggleLabel).toBeVisible({ timeout: 10000 });
  49  | 
  50  |     // The description text should also be visible
  51  |     const descText = page.locator('text=módulos y dificultades con peor rendimiento histórico');
  52  |     await expect(descText).toBeVisible();
  53  |   });
  54  | 
  55  |   test('should toggle active/inactive visual state on click', async ({ page }) => {
  56  |     await page.waitForSelector('form', { timeout: 15000 });
  57  | 
  58  |     // Find the toggle by its label text within the TogglesCard
  59  |     const toggleCard = page.locator('div.cursor-pointer').filter({ hasText: 'Selección Adaptativa' });
  60  |     await expect(toggleCard.first()).toBeVisible();
  61  | 
  62  |     // Initial state should be inactive (no primary background)
  63  |     const toggleDiv = toggleCard.first();
  64  |     await expect(toggleDiv).not.toHaveClass(/bg-primary\/5/);
  65  | 
  66  |     // Click to activate and wait for React state to propagate
  67  |     await toggleDiv.click({ force: true });
  68  |     await expect(toggleDiv).toHaveClass(/bg-primary\/5/, { timeout: 5000 });
  69  | 
  70  |     // Click again to deactivate
  71  |     await toggleDiv.click({ force: true });
  72  |     await expect(toggleDiv).not.toHaveClass(/bg-primary\/5/, { timeout: 5000 });
  73  |   });
  74  | 
  75  |   test('should persist adaptive selection after form submission', async ({ page }) => {
  76  |     await page.waitForSelector('form', { timeout: 15000 });
  77  | 
  78  |     // 1. Fill in name (input has id="name" in BasicInfoCard)
  79  |     const nameInput = page.locator('#name');
  80  |     await expect(nameInput).toBeVisible();
  81  |     const uniqueName = `E2E_adaptive_ON_${Date.now()}`;
  82  |     await nameInput.fill(uniqueName);
  83  | 
  84  |     // 2. Toggle "Selección Adaptativa" ON — wait for class change
  85  |     const toggleDiv = page.locator('div.cursor-pointer').filter({ hasText: 'Selección Adaptativa' }).first();
  86  |     await toggleDiv.click({ force: true });
  87  |     await expect(toggleDiv).toHaveClass(/bg-primary\/5/, { timeout: 5000 });
  88  | 
  89  |     // 3. Submit the form
  90  |     const submitBtn = page.locator('button[type="submit"]');
  91  |     await expect(submitBtn).toBeVisible();
  92  |     await submitBtn.click();
  93  | 
  94  |     // 4. Wait for redirect to exams list (server action + router.push)
  95  |     await page.waitForURL(/\/es\/admin\/exams(\?|$)/, { timeout: 30000 });
  96  |     await page.waitForTimeout(3000);
  97  | 
  98  |     // 5. Find the newly created config by its unique name and click the edit pencil
  99  |     const configCard = page.locator('.group').filter({ hasText: uniqueName });
  100 |     await expect(configCard.first()).toBeVisible({ timeout: 15000 });
  101 |     await configCard.locator('a[href*="/edit"]').click();
  102 | 
  103 |     // 6. Wait for edit page to load the form (full navigation + server components)
  104 |     await page.waitForSelector('form', { timeout: 30000 });
  105 |     await page.waitForTimeout(2000);
  106 | 
  107 |     // 7. On the edit page, verify the toggle is still active
  108 |     const editToggleDiv = page.locator('div.cursor-pointer').filter({ hasText: 'Selección Adaptativa' }).first();
  109 |     await expect(editToggleDiv).toBeVisible();
  110 |     await expect(editToggleDiv).toHaveClass(/bg-primary\/5/, { timeout: 10000 });
  111 |   });
  112 | 
  113 |   test('should toggle off when previously saved as on', async ({ page }) => {
  114 |     await page.waitForSelector('form', { timeout: 15000 });
  115 | 
  116 |     // 1. Fill in name
  117 |     const nameInput = page.locator('#name');
  118 |     const uniqueName = `E2E_adaptive_OFF_${Date.now()}`;
  119 |     await nameInput.fill(uniqueName);
  120 | 
  121 |     // 2. Toggle ON first (default is OFF) — wait for class to actually change
  122 |     const toggleDiv = page.locator('div.cursor-pointer').filter({ hasText: 'Selección Adaptativa' }).first();
  123 |     await toggleDiv.click({ force: true });
  124 |     await expect(toggleDiv).toHaveClass(/bg-primary\/5/, { timeout: 5000 });
  125 | 
  126 |     // 3. Now toggle OFF — wait for class to actually change
  127 |     await toggleDiv.click({ force: true });
  128 |     await expect(toggleDiv).not.toHaveClass(/bg-primary\/5/, { timeout: 5000 });
  129 | 
  130 |     // 4. Submit
  131 |     const submitBtn = page.locator('button[type="submit"]');
  132 |     await submitBtn.click();
  133 | 
  134 |     // 5. Redirect to exams list
  135 |     await page.waitForURL(/\/es\/admin\/exams(\?|$)/, { timeout: 30000 });
  136 |     await page.waitForTimeout(3000);
  137 | 
  138 |     // 6. Click edit on the new config
  139 |     const configCard = page.locator('.group').filter({ hasText: uniqueName });
  140 |     await expect(configCard.first()).toBeVisible({ timeout: 15000 });
  141 |     await configCard.locator('a[href*="/edit"]').click();
  142 | 
  143 |     // 7. Wait for edit page to load the form (full navigation + server components)
  144 |     await page.waitForSelector('form', { timeout: 30000 });
```