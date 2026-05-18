# ABDQuiz: Project Progress

## 🚀 Phase 1: Foundation & Industrialization (COMPLETED)
- ✅ **Core Engine:** Quiz logic with dual-timers (Global & Task).
- ✅ **Infrastructure:** MongoDB Atlas connection with Singleton pattern.
- ✅ **UI System:** Tech-Noir / Cyber-Industrial design system.
- ✅ **Governance:** `abd-audit` system certification (SYS_READY).

## 🛠️ Phase 2: Ingesta & Corpus Admin (COMPLETED)
- ✅ **2.1 Pipeline de Ingesta:** Validación Zod + De-duplicación por Hash SHA-256.
- ✅ **2.2 Corpus Console & Ingestor:** Dashboard de ingesta con KPIs de estado.
- ✅ **2.3 Asistente de Subsanación de Metadatos:** Wizard interactivo client-side para corregir Módulo, Fuente y Dificultad (Bulk y secuencial Pregunta a Pregunta) con desplegables inteligentes y persistencia transaccional.
- ✅ **2.4 Parametrización Avanzada:** Lógicas de puntuación Simple, Penalizada y Ponderada integradas en la consola administrativa.
- ✅ **2.5 Tolerancia a Fallos:** Auto-ajuste dinámico de lotes e indicación visual de tiempos ilimitados (`∞`).
- ✅ **2.6 Industrial Guard:** Blindaje automático de i18n, a11y y pureza arquitectónica (Zero-Noise y 100% traducido con modularización estricta por debajo de 150 líneas).
- ✅ **2.7 Panel de Control Desplegable (Sidebar Navigation):** Reemplazo de tarjeta flotante por un menú lateral izquierdo reactivo y colapsable, unificando la identidad del usuario y accesos de administración en un solo bloque no-intrusivo.
- ✅ **2.8 Ruteo Táctico en Inglés:** Reubicación de la consola de lanzamiento a la nueva ruta localizada `/exams`, estandarizando rutas en inglés en conformidad con los patrones arquitectónicos modernos.
- ✅ **2.9 Single Sign-Out Federado (SSO):** Diseñado e implementado el flujo de cierre de sesión unificado en `ABDQuiz` y `ABDAuth` (manejadores custom `/api/auth/logout`) para resolver bucles infinitos de logueo.
- ✅ **2.10 Selector de Ajustes Flotante (SystemSettings):** Implementación del botón flotante en la esquina superior derecha (`fixed top-6 right-6 z-40`). Completamente localizado, integrado con Next-Intl y blindado con retardo de montaje (`mounted` guard) contra fallos de hidratación en React 19.
- ✅ **2.11 Arquitectura de Temas Dual (Light & Dark):** Habilitada una arquitectura basada en variables HSL en `globals.css` (con modo oscuro Tech-Noir como predeterminado en `:root` y canvas técnico claro bajo la clase `.light`), purgando colores hardcodeados a favor de tokens semánticos en todos los sub-componentes.
- ✅ **2.12 Simplificación de Gobernanza:** Purga de botones y accesos redundantes (como el botón "Close" del portal de administración), mejorando la simetría y limpieza visual.
- ✅ **2.13 Rediseño de la Landing Page Principal:** Convertida la raíz `/` en una landing de presentación premium de grado industrial, detallando las capacidades del sistema y ofreciendo un botón central de acción para acceder al simulador.
- ✅ **2.14 Consola de Lanzamiento Especializada (`/exams`):** Rediseñada la página `/exams` para actuar exclusivamente como una consola limpia y táctica para el inicio de simulaciones, provista de una introducción simplificada de dos líneas tal como solicitó el usuario.
- ✅ **2.15 Seguridad Perimetral y Sincronización en Vivo**: Implementación de la validación rápida de estado (60s Temporal Cookie Guard) contra el endpoint centralizado de `ABDAuth` en `src/proxy.ts`, previniendo el desfase de roles e inhabilitaciones tardías de cuentas.
- ✅ **2.16 Front-Channel Single Sign-Out (SLO)**: Integración del logout silencioso (`silent=true`) en el satélite, permitiendo que la pasarela central purgue las sesiones en paralelo en todo el ecosistema federado sin bucles de redirección.

## 🚀 Phase 3: Immutability, Traceability & Advanced Parameterization (IN PROGRESS)
- ✅ **3.1 MongoDB Partial Compound Index**: Partial uniqueness constraint `{ tenantId, contentHash }` filtering on active questions to support parallel historical revisions.
- ✅ **3.2 Versioned Question Repository**: Dedicated administrative view (`/admin/questions`) listing paginated reactivos with filters.
- ✅ **3.3 Real-Time Traceability Banner**: Automated modal system checking past student attempts to warn between in-place modification or version fork bifurcation.
- ✅ **3.4 Copy-On-Write (COW) Lifecycle**: Archiving mutated active questions (`active: false`) and spawning a new active clone (`version + 1`) to preserve audit consistency of past exams.
- ✅ **3.5 Complete i18n, a11y, and TSC Auditing**: Zero hardcoded strings, proper ARIA labels, and mapped types resolving all Era 11 pipeline criteria.
- ✅ **3.6 Advanced Exam Navigation & Flow**: Free navigation (backwards revision), auto-advance upon selection, and closed-loop review of omitted/unanswered questions before final delivery.
- ✅ **3.7 Attempts Cap & Extraordinary Reset**: Configurable maximum attempts per exam and professor-level capability to invalidate/reset specific attempts for students.

## 📈 Current Status
- **Audit Results:** **SYS_CERTIFIED (Era 11 - Zero Warnings / Zero Errors)**.
- **Rules Enforced:** Max 150 lines, No Hardcoded Strings, No Local CSS, No Embedded Scripts.
- **Data Status:** Ingestador modular, panel lateral táctico, ruteo de exámenes `/exams`, landing de presentación, SSO federado, selector de tema dual, Editor de Preguntas Inmutable (COW), Centro de Analítica Avanzada e Historial con Gráficas SVG, y Parametrización Avanzada con Reset Extraordinario de Intentos.

## 🔮 Phase 4: Analytics, Multi-Tenancy & Claims (IN PROGRESS)
- ✅ **4.1 Analytics V1:** Historial detallado y mapas de calor de rendimiento cognitivo con gráficas SVG interactivas (Zero-Bloat).
- ✅ **4.2 Dynamic White-Label Engine (@abd/styles):** Integración del motor dinámico de marca blanca. Inyección SSR de estilos HSL, bordes redondeados y logotipos corporativos por Tenant con cero parpadeo (FOUC).
- ✅ **4.3 Subdomain Isolation & Cross-Tenant Guards:** Detección dinámica de subdominios, aislamiento estricto de sesiones cruzadas (`cross-tenant`) y pre-vesting del flujo SSO federado.
- ✅ **4.4 Claims, Invalidation, & Retroactive Exam Recalculation:** Formulario de alegación en AuditDetail, consola de arbitraje en `/admin/allegations` con 3 estrategias de recálculo dinámico en lote excluyendo preguntas anuladas ($N-1$).
- [ ] **4.5 RBAC Infrastructure:** Gobernanza por academia y profesor (Rol PROFESSOR).
- [ ] **4.6 AI Orchestrator:** Generación y validación semántica de bancos.
- [ ] **4.7 Dynamic Branding Console:** Panel administrativo interactivo en ABDAuth para carga de logotipos y paletas HSL con previsualización en tiempo real.

---
*Last Update: 2026-05-18 22:47 | Certification: SYS_CERTIFIED*
