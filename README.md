# ABDQuiz - Portal Web y Simulador de Exámenes de Grado Industrial

[![ERA 11 Certified](https://img.shields.io/badge/ERA%2011-CERTIFIED-brightgreen?style=for-the-badge&logo=shield)](../.github/workflows/audit.yml)

Este es el núcleo de la aplicación web de **ABDQuiz**, un portal de entrenamiento y gobernanza de exámenes tipo test de alto rendimiento técnico, construido con Next.js 16, Tailwind CSS 4 y MongoDB.

---

## 🌐 Despliegue Online (Producción)

La versión de producción oficial y federada del simulador está desplegada y totalmente operativa en:
👉 **[https://abd-quiz.vercel.app/](https://abd-quiz.vercel.app/)**

*Nota: La sesión y el inicio de sesión único (SSO) de esta versión de producción están federados contra la pasarela online de **[ABDAuth](https://abd-auth.vercel.app/)**.*

---

## 🚀 Puesta en Marcha Rápida (Local)

Para iniciar el servidor de desarrollo local de la aplicación directamente desde la raíz:

```bash
# 1. Instala las dependencias necesarias con pnpm
pnpm install

# 2. Arranca el servidor de desarrollo con soporte Turbopack en el puerto asignado (5020)
pnpm run dev -p 5020
```

El servidor estará disponible en **[http://localhost:5020](http://localhost:5020)**.
*(O bien puedes utilizar el script automatizado de un solo clic: `start.bat`)*.

---

## 🛠️ Stack Tecnológico

El portal está diseñado bajo la filosofía **Zero-Noise** y está compuesto por:
- **Framework Principal**: [Next.js 16 (Turbopack)](https://nextjs.org/) con App Router y Server Actions.
- **Diseño y Estilado**: [Tailwind CSS v4](https://tailwindcss.com/) (Reglas Uncodixfy puras, con tema dinámico Claro/Oscuro mediante variables HSL centralizadas).
- **Persistencia**: [MongoDB Atlas](https://www.mongodb.com/) gestionado mediante un ORM estricto y seguro con [Mongoose](https://mongoosejs.com/).
- **Internacionalización (i18n)**: [next-intl](https://next-intl-docs.vercel.app/) integrado mediante enrutamiento por prefijos de localización (`[locale]`) para soporte nativo completo en Español (`es`) e Inglés (`en`).
- **Validaciones**: Esquemas de tipos de datos en runtime estructurados con [Zod](https://zod.dev/).

---

## 📁 Estructura del Portal (`src/`)

Para mantener la **Pureza de Diseño**, el directorio de desarrollo está estrictamente compartimentado en la raíz:
*   `src/app/[locale]/`: Enrutador de páginas Next.js localizadas (`page.tsx`) y layouts compartidos (`layout.tsx`).
*   `src/actions/`: Acciones de servidor seguras (`'use server'`) para interacción transaccional con la base de datos (Ej: `corpus.ts`, `examConfig.ts`).
*   `src/components/`: Componentes modulares de UI.
    *   `src/components/admin/ingest/`: Subcomponentes modulares del Ingestador que respetan el límite de **150 líneas**.
    *   `src/components/common/`: Widgets globales reutilizables como `UserProfileWidget`.
*   `src/services/`: Capa lógica de negocio (Ej: `CorpusService`, `QuizService`).
*   `src/models/`: Esquemas físicos inmutables de Mongoose (Ej: `Question.ts`, `CorpusImport.ts`).
*   `src/lib/`: Controladores de infraestructura y bases de datos (Ej: `mongodb.ts`).

---

## 🛡️ Gobernanza y Certificación Industrial

Este proyecto sigue la especificación **`Era 11 - Zero Warnings / Zero Errors`** y se audita de forma continua.

Para iniciar el Pipeline de Certificación en 6 Fases (Estructura, i18n, a11y, Pureza, Tipado TSC y Calidad) desde la raíz:
```bash
pnpm run full-audit
```

---

## 📖 Documentación Relacionada (Disco Local)
*   [Especificación Técnica de Exámenes](./docs/SPEC.md)
*   [Manual de Parametrización y Tiempos](./docs/EXAM_PARAMETRIZATION.md)
*   [Manual de Lecciones Aprendidas (React 19 / Next.js 16)](./docs/LESSONS_LEARNED.md)
*   [Hoja de Ruta del Proyecto](./ROADMAP.md)
*   [Registro de Avances y Certificaciones](./PROGRESS.md)
