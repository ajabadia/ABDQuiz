# ABDQuiz - Portal Web y Simulador de Exámenes de Grado Industrial

Este es el núcleo de la aplicación web de **ABDQuiz**, un portal de entrenamiento y gobernanza de exámenes tipo test de alto rendimiento técnico, construido con Next.js 16, Tailwind CSS 4 y MongoDB.

## 🚀 Puesta en Marcha Rápida

Para iniciar el servidor de desarrollo local del portal:

```bash
# 1. Asegúrate de estar en el directorio de la aplicación
cd D:\desarrollos\ABDQuiz\web

# 2. Instala las dependencias necesarias
pnpm install

# 3. Arranca el servidor de desarrollo con soporte Turbopack
pnpm run dev
```

El servidor estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Stack Tecnológico

El portal está diseñado bajo la filosofía **Zero-Noise** y está compuesto por:
- **Framework Principal**: [Next.js 16 (Turbopack)](https://nextjs.org/) con App Router y Server Actions.
- **Diseño y Estilado**: [Tailwind CSS v4](https://tailwindcss.com/) (Reglas Uncodixfy puras, sin CSS en línea ni Tailwind heredado).
- **Persistencia**: [MongoDB Atlas](https://www.mongodb.com/) gestionado mediante un ORM estricto y seguro con [Mongoose](https://mongoosejs.com/).
- **Internacionalización (i18n)**: [next-intl](https://next-intl-docs.vercel.app/) integrado mediante enrutamiento por prefijos de localización (`[locale]`) para soporte nativo completo en Español (`es`) e Inglés (`en`).
- **Validaciones**: Esquemas de tipos de datos en runtime estructurados con [Zod](https://zod.dev/).

---

## 📁 Estructura del Portal (`web/src/`)

Para mantener la **Pureza de Diseño**, el directorio de desarrollo está estrictamente compartimentado:
*   `src/app/[locale]/`: Enrutador de páginas Next.js localizadas (`page.tsx`) y layouts compartidos (`layout.tsx`).
*   `src/actions/`: Acciones de servidor seguras (`'use server'`) para interacción transaccional con la base de datos (Ej: `corpus.ts`, `examConfig.ts`).
*   `src/components/`: Componentes modulares de UI.
    *   `src/components/admin/ingest/`: Subcomponentes modulares del Ingestador que respetan el límite de **150 líneas**.
    *   `src/components/common/`: Widgets globales reutilizables como [UserProfileWidget](file:///d:/desarrollos/ABDQuiz/web/src/components/common/UserProfileWidget.tsx).
*   `src/services/`: Capa lógica de negocio (Ej: `CorpusService`, `QuizService`).
*   `src/models/`: Esquemas físicos inmutables de Mongoose (Ej: `Question.ts`, `CorpusImport.ts`).
*   `src/lib/`: Controladores de infraestructura y bases de datos (Ej: `mongodb.ts`).

---

## 🛡️ Gobernanza y Certificación Industrial

Este proyecto sigue la especificación **`Era 11 - Zero Warnings / Zero Errors`** y se audita de forma continua.

Para iniciar el Pipeline de Certificación en 6 Fases (Estructura, i18n, a11y, Pureza, Tipado TSC y Calidad):
```bash
pnpm run full-audit
```

---

## 📖 Documentación Relacionada
- [Especificación Técnica de Exámenes](file:///d:/desarrollos/ABDQuiz/docs/SPEC.md)
- [Manual de Parametrización y Tiempos](file:///d:/desarrollos/ABDQuiz/docs/EXAM_PARAMETRIZATION.md)
- [Hoja de Ruta del Proyecto](file:///d:/desarrollos/ABDQuiz/ROADMAP.md)
- [Registro de Avances y Certificaciones](file:///d:/desarrollos/ABDQuiz/PROGRESS.md)
