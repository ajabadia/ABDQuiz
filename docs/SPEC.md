# [SPEC.md] ABDQuiz - Sistema de Entrenamiento de Exámenes Industrial

## 🎯 Objetivo
Plataforma web multitenant de alto rendimiento para el entrenamiento de exámenes, con escalabilidad para múltiples modelos de evaluación y gestión de academias/centros.

---

## 🏗️ Estado Actual: PRESENTE (Fase 1 - MVP e Industrialización de Exámenes)

### 1. Motor de Examen Parametrizado (Core)
- **Engine Dinámico:** Desacoplado de variables fijas mediante plantillas técnicas `ExamConfig`.
- **Lote de Preguntas:** Configurable por plantilla, con soporte para selección estratificada por dificultad y filtros por módulo.
- **Tiempos Límite:** Soporta límites de tiempo globales y cuentas atrás por pregunta individual (con saltado automático).
- **Lógica Flexible:** Opciones de navegación libre (mapa no lineal numerado con guardado de seguridad en segundo plano) o secuencial estricta.
- **Modos de Puntuación:** Algoritmo dinámico con soporte de modos simple, con penalización (`penalty`) y con pesos por dificultad (`weighted`).
- **Consola Admin:** Dashboard administrativo para crear, editar, borrar y clonar configuraciones técnicas al instante.
- **Reporte:** Reporte dinámico de resultados evaluado contra la puntuación máxima del lote y umbrales dinámicos.

### 2. Gestión de Datos e i18n
- **Formato:** Carga vía JSON persistido en MongoDB.
- **i18n:** Soporte nativo ES/EN mediante archivos divididos por namespaces.
- **Estética:** Modo Claro/Oscuro nativo.

### 3. Stack Tecnológico
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript.
- **UI:** Tailwind 4 + Shadcn UI + Lucide Icons.
- **BD:** MongoDB Atlas (Modelo de Membresía inicial).

---

## 🚀 Visión de Futuro: FUTURO (Fase 2+)

### 1. Multitenancy Industrial (Opción B)
- **Aislamiento:** Gestión por subdominios (`academia.abdquiz.com`).
- **Personalización:** Orquestador de estilos dinámicos (colores y logo vía variables CSS).
- **Jerarquía:** Soporte para Academias -> Centros -> Usuarios.

### 2. Multi-modelo de Evaluación
- **Desarrollo:** Preguntas de respuesta corta y larga.
- **IA Tutor:** Pre-corrección de respuestas abiertas y tutoría personalizada.
- **Archivos:** Alumnos suben archivos; profesores evalúan y dan feedback.

### 3. Comunicación y Gestión
- **Chat:** Conversaciones ligeras alumno-profesor por examen.
- **Alegaciones:** Sistema formal para reclamar correcciones.
- **Certificados:** Emisión automática de certificados de superación.

### 4. Negocio y Analítica
- **Planes Pro:** Basados inicialmente en número de alumnos y luego en uso de IA.
- **KPIs:** Cuadros de mando para facturación, uso de tokens y seguimiento de profesores.

---

## ⚖️ Leyes de Hierro (Fire Rules)
1.  **[FIRE] Max 150 Lines**: Prohibidos archivos monolíticos.
2.  **[FIRE] DRY Philosophy**: Reutilización obligatoria.
3.  **[FIRE] Centralized Styles**: Solo tokens y orquestador. No estilos locales.
4.  **[CODE] No `any`**: Tipado estricto al 100%.
5.  **[i18n] No Hardcoded**: Todo literal debe estar en archivos de mensajes.
6.  **[ARCH] Multitenant First**: Toda query debe considerar el aislamiento de datos.
