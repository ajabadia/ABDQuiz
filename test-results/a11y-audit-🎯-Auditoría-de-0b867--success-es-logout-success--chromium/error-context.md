# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y-audit.spec.ts >> 🎯 Auditoría de Accesibilidad — ABDQuiz >> [A11Y] Logout success (/es/logout-success)
- Location: tests\a11y-audit.spec.ts:25:9

# Error details

```
Error: Logout success: 5 violación(es)

expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 5
```

# Page snapshot

```yaml
- generic [ref=e2]: Internal Server Error
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | import { injectAdminSession } from './helpers/auth';
  4  | 
  5  | /**
  6  |  * 🎯 ABDQuiz — Auditoría de Accesibilidad Automatizada (axe-core)
  7  |  *
  8  |  * Escanea las páginas que contienen los componentes traducidos
  9  |  * y reporta violaciones WCAG 2.2 AA con detalles precisos para corrección.
  10 |  */
  11 | 
  12 | const BASE_URL = 'http://localhost:5020';
  13 | 
  14 | const PAGES = [
  15 |   { path: '/es', name: 'Landing pública' },
  16 |   { path: '/es/logout-success', name: 'Logout success' },
  17 |   { path: '/es/admin/courses', name: 'Admin cursos (CoursesList)' },
  18 |   { path: '/es/admin/assignments', name: 'Admin asignaciones (AssignmentsList)' },
  19 |   { path: '/es/admin/questions', name: 'Admin preguntas (QuestionEditorModal)' },
  20 |   { path: '/es/admin/corpus', name: 'Admin corpus (FloatingSelector)' },
  21 | ];
  22 | 
  23 | test.describe('🎯 Auditoría de Accesibilidad — ABDQuiz', () => {
  24 |   for (const { path, name } of PAGES) {
  25 |     test(`[A11Y] ${name} (${path})`, async ({ page }, testInfo) => {
  26 |       // Auth for admin routes
  27 |       if (path.includes('/admin')) {
  28 |         await injectAdminSession(page);
  29 |       }
  30 |       await page.goto(path);
  31 |       await page.waitForLoadState('domcontentloaded');
  32 |       await page.waitForSelector('main, [role="main"], body', { timeout: 15000 });
  33 | 
  34 |       // Known violations from external packages (tracked separately):
  35 |       // - button-name: SmartNavbar search/tenant buttons from @ajabadia/ecosystem-widgets
  36 |       // - color-contrast: Theme contrast ratios (tracked in STYLE_AUDIT_AND_CONSOLIDATION.md)
  37 |       // - landmark-contentinfo-is-top-level: GlobalFooter from ecosystem-widgets nested inside main
  38 |       const results = await new AxeBuilder({ page })
  39 |         .disableRules([
  40 |           'button-name',
  41 |           'color-contrast',
  42 |           'landmark-contentinfo-is-top-level',
  43 |         ])
  44 |         .analyze();
  45 | 
  46 |       // Log ALL violations with full details
  47 |       if (results.violations.length > 0) {
  48 |         console.log(`\n❌ ${name} — ${results.violations.length} violación(es):`);
  49 |         for (const v of results.violations) {
  50 |           console.log(`\n  ── [${v.impact?.toUpperCase() || 'N/A'}] ${v.id}`);
  51 |           console.log(`     Ayuda: ${v.help}`);
  52 |           console.log(`     URL:   ${v.helpUrl}`);
  53 |           for (const node of v.nodes.slice(0, 5)) {
  54 |             console.log(`     ▸ Elemento: ${node.html}`);
  55 |             console.log(`       Target:   ${node.target.join(', ')}`);
  56 |             if (node.failureSummary) {
  57 |               console.log(`       Falla:    ${node.failureSummary.split('\\n')[0]}`);
  58 |             }
  59 |           }
  60 |         }
  61 |       }
  62 | 
  63 |       // Assert
> 64 |       expect.soft(results.violations.length, `${name}: ${results.violations.length} violación(es)`).toBe(0);
     |                                                                                                     ^ Error: Logout success: 5 violación(es)
  65 |     });
  66 |   }
  67 | });
  68 | 
```