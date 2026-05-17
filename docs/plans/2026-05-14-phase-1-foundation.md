# Plan de Implementación - Fase 1: Cimentación (MVP)

Este plan detalla los pasos técnicos para construir el núcleo funcional de ABDQuiz, asegurando el cumplimiento de las **Fire Rules** y la arquitectura multitenant desde el inicio.

## 🎯 Objetivos de la Fase 1
1. Bootstrap del proyecto Next.js 16 en `web/`.
2. Capa de datos con MongoDB Atlas y modelos base.
3. Motor de examen con control de tiempos (global y por pregunta).
4. Interfaz base (Home, Examen, Resultados) con i18n y modo oscuro.

---

## 🛠️ Tareas de Implementación

### 1. Foundation & Tooling (Bootstrap)
- [ ] **Tarea 1.1: Inicializar Next.js 16**
    - **Files:** `web/`
    - **Action:** Ejecutar `npx create-next-app@latest web --typescript --tailwind --eslint`.
    - **Verify:** `pnpm dev` en puerto 3000.
- [ ] **Tarea 1.2: Configurar Tailwind CSS 4**
    - **Files:** `web/package.json`, `web/tailwind.config.js`
    - **Action:** Actualizar a v4 y configurar el orquestador de estilos base.
- [ ] **Tarea 1.3: Setup de Shadcn UI y Sonner**
    - **Files:** `web/components/ui/`
    - **Action:** `npx shadcn-ui@latest init` e instalar componentes base.
- [ ] **Tarea 1.4: Configurar i18n (next-intl) por Namespaces**
    - **Files:** `web/src/messages/[locale]/*.json`, `web/src/i18n.ts`
    - **Action:** Crear estructura de namespaces (common, quiz, auth).

### 2. Data Layer (MongoDB & Models)
- [ ] **Tarea 2.1: Conexión a MongoDB Atlas**
    - **Files:** `web/src/lib/mongodb.ts`, `web/.env.local`
    - **Action:** Configurar cliente de Mongoose.
- [ ] **Tarea 2.2: Definir Modelos Core (Zod + Mongoose)**
    - **Files:** `web/src/models/User.ts`, `web/src/models/Tenant.ts`, `web/src/models/Question.ts`
    - **Action:** Implementar esquemas con `tenantId` obligatorio.
- [ ] **Tarea 2.3: Script de Seed (Importación de JSON)**
    - **Files:** `web/scripts/seed-questions.ts`
    - **Action:** Script para cargar el JSON de ejemplo.

### 3. Quiz Engine (Lógica de Negocio)
- [ ] **Tarea 3.1: Servicio de Generación de Examen**
    - **Files:** `web/src/services/quizService.ts`
    - **Action:** Lógica de selección aleatoria (30 preguntas).
- [ ] **Tarea 3.2: Motor de Timers**
    - **Files:** `web/src/hooks/useQuizTimer.ts`
    - **Action:** Implementar contador global (10 min) y por pregunta (30s).
- [ ] **Tarea 3.3: Lógica de Scoring y Persistencia**
    - **Files:** `web/src/app/api/quiz/submit/route.ts`
    - **Action:** Calcular nota final y guardar snapshot.

### 4. UI Flow (Pantallas MVP)
- [ ] **Tarea 4.1: Home & Selección de Examen**
    - **Files:** `web/src/app/page.tsx`
    - **Action:** Pantalla limpia con botón "Comenzar".
- [ ] **Tarea 4.2: Interfaz de Examen Responsive**
    - **Files:** `web/src/app/quiz/[id]/page.tsx`
    - **Action:** Layout mobile-first con progreso y timers.
- [ ] **Tarea 4.3: Reporte de Resultados & Explicaciones**
    - **Files:** `web/src/app/quiz/[id]/results/page.tsx`
    - **Action:** Tabla de desglose con feedback.

### 5. Hardening & Audit
- [ ] **Tarea 5.1: Activar Guardianes (arch-guard)**
    - **Action:** Ejecutar `pnpm run arch-audit`.

---

## 📈 Criterios de Aceptación (Fase 1)
- [ ] El proyecto arranca sin errores de linting o tipos.
- [ ] Carga de preguntas vía JSON funcional.
- [ ] Examen con timers y auto-skip verificado.
- [ ] Interfaz responsive y accesible.
