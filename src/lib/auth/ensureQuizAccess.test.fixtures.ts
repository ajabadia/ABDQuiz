/**
 * @purpose Gestiona fijuras de usuario mock para pruebas de acceso a autenticación en la aplicación ABDQuiz.
 * @purpose_en Defines mock user fixtures for testing authentication access in the ABDQuiz application.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:6,imports:1,sig:x8sakx
 * @lastUpdated 2026-06-23T19:51:17.159Z
 */

import { vi } from 'vitest';

// ── Mock user fixtures ───────────────────────
export const ADMIN_USER = { id: 'admin-1', tenantId: 't1', email: 'admin@t1.com', role: 'ADMIN' };
export const PROFESSOR_USER = { id: 'prof-1', tenantId: 't1', email: 'prof@t1.com', role: 'PROFESSOR' };
export const SUPER_ADMIN_USER = { id: 'super-1', tenantId: 't1', email: 'super@abd.com', role: 'SUPER_ADMIN' };
export const USER_USER = { id: 'user-1', tenantId: 't1', email: 'user@t1.com', role: 'USER' };
export const AUDITOR_USER = { id: 'auditor-1', tenantId: 't1', email: 'auditor@t1.com', role: 'AUDITOR' };
export const OPERATOR_USER = { id: 'op-1', tenantId: 't1', email: 'op@t1.com', role: 'OPERATOR' };
