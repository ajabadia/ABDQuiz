# ROADMAP - ABDQuiz

## 📍 Fase 1: Cimentación e Industrialización (COMPLETADA)
- [x] Inicialización de `web/src/` con Next.js 16 y Tailwind 4.
- [x] Configuración del sistema de i18n por namespaces (ES/EN).
- [x] Conexión a MongoDB Atlas y Modelos base (User, Tenant, Question, CorpusImport).
- [x] Desarrollo del Motor de Examen Tipo Test (Timers + Auto-ajuste de lotes + Puntuaciones complejas).
- [x] UI Responsive de Grado Industrial (Uncodixfy Style).
- [x] Asistente de Subsanación Interactiva de Metadatos (Wizard de Ingestión en cliente).

## 📍 Fase 2: Multitenant, Marca y Seguridad (COMPLETADA)
- [x] Integración Centralizada con Pasarela de Identidad **ABDAuth** (Single Sign-On federado, tokens JWT y RBAC centralizado con Bypass de Desfase de Roles y Front-Channel SLO).
- [x] Implementación de detección de subdominios (`academia.abdquiz.com`).
- [x] Orquestador de Estilos dinámicos (Inyección de variables CSS por Tenant con `@abd/styles`).
- [ ] Panel de Administración para Academias (Carga de logos/colores) — *Pendiente Consola Centralizada*.

## 📍 Fase 3: Multi-modelo, Colaboración y Parametrización Avanzada (EN PROGRESO)
- [x] **Módulo Editor de Preguntas con Control de Versiones Históricas (Auditoría Inmutable)**:
  - [x] *Edición en el Lugar (In-Place)*: Modificación directa para preguntas que **nunca** han sido respondidas en intentos de examen.
  - [x] *Versionado por Trazabilidad (Copy-On-Write)*: Si la pregunta **ya ha sido contestada** en algún intento de examen, la edición generará un nuevo registro de pregunta con `version = version + 1`.
  - [x] *Inmutabilidad de Auditoría*: La pregunta anterior no se elimina, se conserva archivada (`active: false`) a efectos de auditoría y certificación de exámenes pasados.
  - [x] *Exclusión de Motor*: El motor de selección de preguntas filtrará únicamente versiones activas (`active: true`), evitando que la versión anterior sea usada en nuevos exámenes.
- [ ] **Preguntas de Desarrollo**: Respuestas en texto libre y sistema de subida de archivos de respaldo.
- [ ] **Chat Ligero Alumno-Profesor**: Canal de comunicación directo sobre exámenes.
- [x] **Sistema de Alegaciones de exámenes y recálculo retroactivo**.
- [ ] **Tutoría con IA**: Integración inicial para feedback semántico del alumno.
- [x] **Parametrización y Control Avanzado de Exámenes**:
  - [x] *Navegación Libre (Volver Atrás)*: Posibilidad de retroceder en las preguntas para revisar y corregir respuestas antes de entregar.
  - [x] *Auto-Avance Instantáneo*: Modo en el que la interfaz salta directamente a la siguiente pregunta al hacer clic en una opción, agilizando el flujo del alumno.
  - [x] *Revisión Selectiva de Omitidas*: Si está activo, el examen presentará un bucle de cierre al final preguntando si desea responder las omitidas; al aceptar, se le presentarán exclusivamente los reactivos sin responder.
  - [x] *Límite de Intentos Configurable*: Parámetro a nivel de examen que limita el número máximo de intentos que un alumno puede realizar.
  - [x] *Anulación y Reactivación por Profesor*: Permite que un profesor anule un examen específico de un alumno para concederle un intento extraordinario desde cero.

## 📍 Fase 4: Analítica, Impugnaciones y Multitenancy Avanzado (EN PROGRESO)
- [x] **Analítica Avanzada y Mapas de Calor (Fase 4.1 - COMPLETADA)**:
  - [x] Historial detallado de intentos de simulación para alumnos y profesores.
  - [x] KPIs desglosados de porcentaje de acierto por módulo técnico o tema.
  - [x] Mapas de calor dinámicos de rendimiento cognitivo (áreas fuertes vs débiles).
  - [x] Gráficas de evolución temporal de puntuaciones en simulacros simulados.
- [x] **Sistema de Reclamaciones e Impugnaciones (Fase 4.2 - COMPLETADA)**:
  - [x] Formulario de alegación técnica en la vista de resultados de examen.
  - [x] Consola de control para profesores/admins para auditar las impugnaciones.
  - [x] Recálculo transaccional de notas del alumno tras corrección inmutable (COW).
- [ ] **Robustecimiento RBAC y Multi-Tenant Segregado (Fase 4.3 - EN PROGRESO)**:
  - [ ] Incorporación del rol `PROFESSOR` con privilegios restringidos de edición.
  - [x] Aislamiento lógico y personalización por subdominios de academia.
  - [ ] Generación de Certificados PDF firmados digitalmente.
  - [ ] Dashboards de KPIs para Academias y Facturación.
  - [ ] Seguimiento avanzado de progreso del alumno.
