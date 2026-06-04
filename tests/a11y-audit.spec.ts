import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { injectAdminSession } from './helpers/auth';

/**
 * 🎯 ABDQuiz — Auditoría de Accesibilidad Automatizada (axe-core)
 *
 * Escanea las páginas que contienen los componentes traducidos
 * y reporta violaciones WCAG 2.2 AA con detalles precisos para corrección.
 */

const BASE_URL = 'http://localhost:3300';

const PAGES = [
  { path: '/es', name: 'Landing pública' },
  { path: '/es/logout-success', name: 'Logout success' },
  { path: '/es/admin/courses', name: 'Admin cursos (CoursesList)' },
  { path: '/es/admin/assignments', name: 'Admin asignaciones (AssignmentsList)' },
  { path: '/es/admin/questions', name: 'Admin preguntas (QuestionEditorModal)' },
  { path: '/es/admin/corpus', name: 'Admin corpus (FloatingSelector)' },
];

test.describe('🎯 Auditoría de Accesibilidad — ABDQuiz', () => {
  for (const { path, name } of PAGES) {
    test(`[A11Y] ${name} (${path})`, async ({ page }, testInfo) => {
      // Auth for admin routes
      if (path.includes('/admin')) {
        await injectAdminSession(page);
      }
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('main, [role="main"], body', { timeout: 15000 });

      // Known violations from external packages (tracked separately):
      // - button-name: SmartNavbar search/tenant buttons from @ajabadia/ecosystem-widgets
      // - color-contrast: Theme contrast ratios (tracked in STYLE_AUDIT_AND_CONSOLIDATION.md)
      // - landmark-contentinfo-is-top-level: GlobalFooter from ecosystem-widgets nested inside main
      const results = await new AxeBuilder({ page })
        .disableRules([
          'button-name',
          'color-contrast',
          'landmark-contentinfo-is-top-level',
        ])
        .analyze();

      // Log ALL violations with full details
      if (results.violations.length > 0) {
        console.log(`\n❌ ${name} — ${results.violations.length} violación(es):`);
        for (const v of results.violations) {
          console.log(`\n  ── [${v.impact?.toUpperCase() || 'N/A'}] ${v.id}`);
          console.log(`     Ayuda: ${v.help}`);
          console.log(`     URL:   ${v.helpUrl}`);
          for (const node of v.nodes.slice(0, 5)) {
            console.log(`     ▸ Elemento: ${node.html}`);
            console.log(`       Target:   ${node.target.join(', ')}`);
            if (node.failureSummary) {
              console.log(`       Falla:    ${node.failureSummary.split('\\n')[0]}`);
            }
          }
        }
      }

      // Assert
      expect.soft(results.violations.length, `${name}: ${results.violations.length} violación(es)`).toBe(0);
    });
  }
});
