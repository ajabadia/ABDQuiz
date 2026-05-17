# ROADMAP - ABDQuiz

## 📍 Fase 1: Cimentación e Industrialización (COMPLETADA)
- [x] Inicialización de `web/src/` con Next.js 16 y Tailwind 4.
- [x] Configuración del sistema de i18n por namespaces (ES/EN).
- [x] Conexión a MongoDB Atlas y Modelos base (User, Tenant, Question, CorpusImport).
- [x] Desarrollo del Motor de Examen Tipo Test (Timers + Auto-ajuste de lotes + Puntuaciones complejas).
- [x] UI Responsive de Grado Industrial (Uncodixfy Style).
- [x] Asistente de Subsanación Interactiva de Metadatos (Wizard de Ingestión en cliente).

## 📍 Fase 2: Multitenant, Marca y Seguridad (PRÓXIMAMENTE)
- [ ] Integración Centralizada con Pasarela de Identidad **ABDAuth** (Single Sign-On federado, tokens JWT y RBAC centralizado).
- [ ] Implementación de detección de subdominios (`academia.abdquiz.com`).
- [ ] Orquestador de Estilos dinámicos (Inyección de variables CSS por Tenant).
- [ ] Panel de Administración para Academias (Carga de logos/colores).

## 📍 Fase 3: Multi-modelo, Colaboración y Gestión de Preguntas (FUTURO)
- [x] **Módulo Editor de Preguntas con Control de Versiones Históricas (Auditoría Inmutable)**:
  - *Edición en el Lugar (In-Place)*: Modificación directa para preguntas que **nunca** han sido respondidas en intentos de examen.
  - *Versionado por Trazabilidad (Copy-On-Write)*: Si la pregunta **ya ha sido contestada** en algún intento de examen, la edición generará un nuevo registro de pregunta con `version = version + 1`.
  - *Inmutabilidad de Auditoría*: La pregunta anterior no se elimina, se conserva archivada (`active: false`) a efectos de auditoría y certificación de exámenes pasados.
  - *Exclusión de Motor*: El motor de selección de preguntas filtrará únicamente versiones activas (`active: true`), evitando que la versión anterior sea usada en nuevos exámenes.
- [ ] Preguntas de Desarrollo y sistema de subida de archivos.
- [ ] Chat ligero alumno-profesor.
- [ ] Sistema de Alegaciones de exámenes.
- [ ] Integración inicial de IA para tutoría.

## 📍 Fase 4: Analítica, Impugnaciones y Multitenancy Avanzado (EN PROGRESO)
- [ ] **Analítica Avanzada y Mapas de Calor (Fase 4.1 - EN PROGRESO)**:
  - [ ] Historial detallado de intentos de simulación para alumnos y profesores.
  - [ ] KPIs desglosados de porcentaje de acierto por módulo técnico o tema.
  - [ ] Mapas de calor dinámicos de rendimiento cognitivo (áreas fuertes vs débiles).
  - [ ] Gráficas de evolución temporal de puntuaciones en simulacros simulados.
- [ ] **Sistema de Reclamaciones e Impugnaciones (Fase 4.2)**:
  - [ ] Formulario de alegación técnica en la vista de resultados de examen.
  - [ ] Consola de control para profesores/admins para auditar las impugnaciones.
  - [ ] Recálculo transaccional de notas del alumno tras corrección inmutable (COW).
- [ ] **Robustecimiento RBAC y Multi-Tenant Segregado (Fase 4.3)**:
  - [ ] Incorporación del rol `PROFESSOR` con privilegios restringidos de edición.
  - [ ] Aislamiento lógico y personalización por subdominios de academia.
  - [ ] Generación de Certificados PDF firmados digitalmente.
  - [ ] Dashboards de KPIs para Academias y Facturación.
  - [ ] Seguimiento avanzado de progreso del alumno.
