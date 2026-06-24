# ABDQuiz: Project Progress

## 🚀 Phase 1: Foundation & Industrialization (COMPLETED)
- ✅ **Core Engine:** Quiz logic with dual-timers (Global & Task).
- ✅ **Infrastructure:** MongoDB Atlas connection with Singleton pattern.
- ✅ **UI System:** Tech-Noir / Cyber-Industrial design system.
- ✅ **Governance:** `abd-audit` system certification (SYS_READY).

## 🛠️ Phase 2: Ingesta & Corpus Admin (COMPLETED)
- ✅ **2.1 Pipeline de Ingesta:** Validación Zod + De-duplicación por Hash SHA-256.
- ✅ **2.2 Corpus Console & Ingestor:** Dashboard de ingesta con KPIs de estado.
- ✅ **2.3 Asistente de Subsanación de Metadatos:** Wizard interactivo client-side.
- ✅ **2.4 Parametrización Avanzada:** Lógicas de puntuación Simple, Penalizada y Ponderada.
- ✅ **2.5 Tolerancia a Fallos:** Auto-ajuste dinámico de lotes e indicación visual de tiempos ilimitados.
- ✅ **2.6 Industrial Guard:** Blindaje automático de i18n, a11y y pureza arquitectónica.
- ✅ **2.7 Panel de Control Desplegable (Sidebar Navigation):** Menú lateral izquierdo reactivo.
- ✅ **2.8 Ruteo Táctico en Inglés:** Rutas estandarizadas en inglés (`/exams`).
- ✅ **2.9 Single Sign-Out Federado (SSO):** Cierre de sesión unificado federado.
- ✅ **2.10 Selector de Ajustes Flotante (SystemSettings):** Botón flotante localizado.
- ✅ **2.11 Arquitectura de Temas Dual (Light & Dark):** Variables HSL con modo oscuro Tech-Noir.
- ✅ **2.12 Simplificación de Gobernanza:** Purga de botones redundantes.
- ✅ **2.13 Rediseño de la Landing Page Principal:** Landing de presentación premium.
- ✅ **2.14 Consola de Lanzamiento Especializada (`/exams`):** Consola limpia para simulaciones.
- ✅ **2.15 Seguridad Perimetral y Sincronización en Vivo:** Temporal Cookie Guard (60s).
- ✅ **2.16 Front-Channel Single Sign-Out (SLO):** Logout silencioso federado.

## 🚀 Phase 3: Immutability, Traceability & Advanced Parameterization (COMPLETED)
- ✅ **3.1 MongoDB Partial Compound Index:** Partial uniqueness constraint on active questions.
- ✅ **3.2 Versioned Question Repository:** Vista administrativa de preguntas versionadas.
- ✅ **3.3 Real-Time Traceability Banner:** Modal automático de bifurcación de versiones.
- ✅ **3.4 Copy-On-Write (COW) Lifecycle:** Archivo y clonado de preguntas mutadas.
- ✅ **3.5 Complete i18n, a11y, and TSC Auditing:** Zero hardcoded strings, ARIA labels.
- ✅ **3.6 Advanced Exam Navigation & Flow:** Navegación libre, auto-avance, revisión final.
- ✅ **3.7 Attempts Cap & Extraordinary Reset:** Límite configurable y reseteo por profesor.

## 🚀 Phase 5: Ecosistema de Aprendizaje Jerárquico & Decoupled Analytics (COMPLETED)
- ✅ **5.1 Jerarquías y Roles:** Modelos `Course`, `ExamAssignment` y `QuizUserRole`.
- ✅ **5.2 Guardas de Acceso y AttemptToken:** Control multi-tenant + tokens efímeros.
- ✅ **5.3 Algoritmo de Slicing Seguro:** Barajado de respuestas preservando opción correcta.
- ✅ **5.4 Ingesta Canónica Resiliente:** Hashing semántico + transacciones Mongo con fallback.
- ✅ **5.5 Calificación Humana:** Preguntas `open_text` y panel `/admin/grading`.
- ✅ **5.6 Desacoplamiento de Analíticas:** `AnalyticsSyncService` asíncrono no bloqueante.

## 🧹 Refactor & Maintenance (2026-05-28)
- ✅ **5.7 Refactor Modular — examAssignment.ts:** Dividido de ~340 líneas en 5 archivos modulares (`types.ts`, `utils.ts`, `list.ts`, `crud.ts`, `index.ts`).
- ✅ **5.8 Refactor Modular — grading.test.ts:** Dividido de ~370 líneas en 4 archivos (`grading.mocks.ts`, `grading.list.test.ts`, `grading.detail.test.ts`, `grading.submit.test.ts`).
- ✅ **5.9 Refactor Modular — AssignmentsList.tsx:** Reducido de ~530 a ~140 líneas extrayendo `AssignmentCard.tsx` y `AssignmentFormModal.tsx`.
- ✅ **5.10 i18n Completo:** Traducción de strings hardcodeados en `CoursesList.tsx`, `FloatingSelector.tsx`, y `QuestionEditorModal.tsx`.
- ✅ **5.11 Seguridad:** Fix a fallback hardcodeado en `SecurityService.ts`, 7 `|| ''` silenciosos, y token GitHub expuesto.

## 🚀 Phase 6: Curricular Coverage & Objective Management (2026-06-24)
- ✅ **6.1 Modelo de Currículum (`Course.objectives`):** Nuevo campo `objectives: ICourseObjective[]` en `Course.ts` con schema Mongoose (módulo, bloque, objetivos[]). Permite almacenar el temario completo por curso.
- ✅ **6.2 Refactor `ExamAuditorService`:** Eliminado `DEFAULT_OBJECTIVES` hardcodeado. El servicio ahora localiza el curso vinculado al examen (vía `ExamConfig.courseId` o `Course.learningPath`) y lee los objetivos desde MongoDB. Si no hay curso vinculado o no tiene objetivos, retorna `null` en lugar de fallback a datos embebidos.
- ✅ **6.3 Server Actions de Currículum:** `getCourseObjectivesAction` y `setCourseObjectivesAction` para CRUD de objetivos por curso, con auditoría y control multi-tenant.
- ✅ **6.4 Vinculación Examen↔Curso:** Nuevo componente `ExamCourseLink` en la página de edición de examen. Selector de curso con guardado directo vía `updateExamConfigAction` (aprovechando el campo `courseId` existente en `ExamConfig`).
- ✅ **6.5 Panel de Auditoría Enlazado:** `ExamAuditSection` wrappea el `ExamAuditPanel` en sección colapsable dentro de la edición del examen. Muestra cobertura curricular (suficiente/escaso/faltante) o enlaces contextuales si falta el vínculo o los objetivos.
- ✅ **6.6 Página de Edición de Currículum:** `/admin/courses/[id]/curriculum` con `CurriculumEditor` — editor visual completo: añadir/editar/eliminar módulos, bloques y objetivos de aprendizaje individuales.
- ✅ **6.7 Navegación a Currículum:** Botón `ClipboardList` en cada tarjeta de curso (`CourseCard`) que enlaza a la página de currículum.
- ✅ **6.8 Tests Actualizados:** `ExamAuditorLeitner.test.ts` actualizado con mocks de `Course.findOne()` y casos de prueba para curso sin objetivos y con objetivos completos (9 tests pasan).
- ⬜ **6.9 Plantillas de Prompts:** Pendiente — modelo `PromptTemplate`, seed de presets, admin CRUD.
- ⬜ **6.10 Objetivos Visibles para el Alumno:** Pendiente — dashboard con progreso por objetivo.
- ⬜ **6.11 Integración con Generación IA:** Pendiente — conectar templates al pipeline de feedback/generación.

## 📈 Current Status
- **Audit Results:** **SYS_CERTIFIED (Era 11 — Zero Warnings / Zero Errors)**.
- **Rules Enforced:** Max 150 lines per file, No Hardcoded Strings, No Local CSS, No Embedded Scripts.
- **Data Status:** Ecosistema de Aprendizaje Multi-Tenant completo con control de acceso contextual, tokens de intentos efímeros, ingesta canónica con fallback de transacciones, calificación manual, sincronización analítica asíncrona, y todos los módulos bajo el límite de pureza arquitectónica (150 líneas).
- **Curricular Coverage:** `DEFAULT_OBJECTIVES` hardcodeado eliminado. Todos los objetivos ahora residen en `Course.objectives` (MongoDB). Nuevo flujo: Curso → Objetivos → Examen vinculado → Auditoría de cobertura.

---
*Last Update: 2026-06-24 | Certification: SYS_CERTIFIED | Phase 6.1–6.8: Curricular Coverage | Tests: 350 (31 test files)*
