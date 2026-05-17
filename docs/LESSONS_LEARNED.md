# Lecciones Aprendidas: Arquitectura y Frontend en ABDQuiz

Este documento recopila las lecciones aprendidas de grado industrial durante el desarrollo y estabilización de la plataforma **ABDQuiz**, específicamente en su integración federada con **ABDAuth**, su sistema de temas dinámicos y la prevención de errores en React 19 / Next.js 16.

---

## 1. El Peligro del Mismatch de Hidratación en React 19 / Next.js 16

> [!CRITICAL]
> **El síntoma**: La interfaz se dibuja a la perfección, pero al hacer clic en los botones (cambio de tema, idioma o logout), **nada ocurre; la interfaz está completamente inerte y muerta.**

### La Causa Raíz
En React 19 y Next.js 16 (con Turbopack), si un componente del cliente (`'use client'`) evalúa atributos que cambian entre el servidor y el cliente (como leer `theme` de `localStorage` o el estado de sesión de NextAuth) durante su primer ciclo de renderizado SSR, se produce un **Hydration Mismatch**.
A diferencia de versiones anteriores de React que intentaban "parchear" o tolerar esta discrepancia, React 19 **congela silenciosamente el enlazado de eventos del cliente (Event Listener Binding)**. El HTML generado en servidor se conserva, pero los escuchadores `onClick` nunca se asocian a los botones del DOM.

### Lecciones Aprendidas y Solución
1. **Mounted State Guard (Retardo de Montaje)**: Todo componente cliente que dependa de variables específicas del navegador o de cookies debe retrasar su interactividad hasta que esté montado en el DOM del cliente mediante un estado de control:
   ```tsx
   const [mounted, setMounted] = useState(false);
   useEffect(() => { setMounted(true); }, []);
   
   if (!mounted) return <SkeletonGearButton />; // Render inerte seguro
   ```
2. **Carga Síncrona de Tema (Anti-Flash)**: Para evitar parpadeos visuales al cargar páginas dinámicas con SSR, la mejor práctica de producción es inyectar un script síncrono crudo dentro de la cabecera `<head>` de la página raíz. Este bloque de código JavaScript nativo se ejecuta antes del ciclo de vida de React y aplica el tema guardado en `localStorage` directamente al elemento `<html>`:
   ```html
   <head>
     <script dangerouslySetInnerHTML={{ __html: `...` }} />
   </head>
   ```

---

## 2. Filosofía "Zero-Bloat" y la Inmunidad a Regresiones de Contexto

> [!TIP]
> Instalar paquetes externos pesados (como `next-themes` o `framer-motion`) a menudo añade complejidad, requiere envolver el árbol con múltiples `ContextProviders` que ralentizan la hidratación y son propensos a regresiones silenciosas durante actualizaciones del núcleo de React.

### Lecciones Aprendidas y Solución
* **Fuerza CSS Dinámica en Tailwind CSS v4**: En lugar de sobrecargar la aplicación con dependencias de temas complejos, la manipulación de variables CSS nativas (`var(--background)`) e inyección de clases en el DOM nativo es una alternativa de **cero bytes en el bundle**, 100% inmune a fallas de proveedores de contexto y extraordinariamente limpia.
* **Animaciones CSS Nativas**: Reemplazar frameworks de animación por clases nativas de Tailwind CSS (`animate-in fade-in slide-in-from-top-2 duration-200`) proporciona transiciones fluidas de 60fps con total compatibilidad de servidor-cliente y soporte garantizado en React 19.

---

## 3. Comportamiento de Enrutadores Single-Page vs. Vaciados de Sesión

> [!WARNING]
> Utilizar componentes de enrutamiento del lado del cliente como `<Link>` de Next.js para rutas que ejecutan borrado de sesión (como `/api/auth/logout`) causa fallos silenciosos y bucles infinitos de redirección.

### La Causa Raíz
El componente `<Link>` intercepta los eventos de clic y pre-carga la ruta mediante peticiones JSON de fondo (RSC payload) en lugar de realizar una recarga de navegador completa. Cuando el backend responde con un redireccionamiento HTTP `307 Redirect` hacia el IdP externo (ABDAuth), el enrutador del cliente trata de interceptar el salto de dominio de forma interna, corrompiendo la limpieza de cookies y la recarga del estado del navegador.

### Lecciones Aprendidas y Solución
* **Uso de Etiquetas `<a>` Nativas**: Todas las acciones de API críticas que involucren apretones de manos, destrucciones de cookies u operaciones SSO federadas deben utilizar la etiqueta nativa `<a>` de HTML. Esto fuerza al navegador a realizar una recarga de contexto completa de la página web y a re-evaluar la autenticación a nivel de red.

---

## 4. El Poder de los Tokens Semánticos de Diseño

> [!IMPORTANT]
> Diseñar componentes usando colores fijos hardcodeados (como `border-white/5` o `bg-black/60`) inhabilita la portabilidad visual del software y requiere refactorizar decenas de archivos si se desea añadir un nuevo tema.

### Lecciones Aprendidas y Solución
* **Abstracción Semántica**: Al construir interfaces de alta fidelidad, se deben emplear siempre los tokens semánticos del sistema de diseño (`border-border`, `bg-background`, `bg-muted`, `text-primary`) en lugar de colores fijos.
* Gracias a esta abstracción semántica en `ABDQuiz`, habilitar un soporte completo de **Tema Claro** impecable y refinado en toda la aplicación se logró modificando exclusivamente **10 líneas de código en un archivo CSS global**, permitiendo que todos los sub-componentes (sidebar, tarjetas, KPI dashboards, modales) mutasen de color de forma natural y automática.

---

## 5. Arquitectura Inmutable y Versionado Histórico (Copy-On-Write) en MongoDB

> [!CRITICAL]
> **El síntoma**: 
> 1. Al intentar guardar la edición de una pregunta que requiere duplicación histórica (Copy-On-Write), MongoDB lanza una excepción por colisión de índice único (`Duplicate Key Error`).
> 2. El compilador de TypeScript (TSC) aborta la compilación de la fase 5 arrojando el error `TS2345: Argument of type 'IQuestion[]' is not assignable to type 'QuestionItem[]' due to property '_id' incompatible (ObjectId vs string)`.

### La Causa Raíz
1. **Índices Únicos Rígidos**: Un índice compound unique tradicional `{ tenantId, contentHash }` bloquea la base de datos si intentamos conservar versiones antiguas inactivas (`active: false`) con el mismo contenido hash. MongoDB requiere que la unicidad del hash se verifique de forma condicionada al ciclo de vida del reactivo.
2. **Incompatibilidad de ObjectId**: Mongoose expone la propiedad `_id` como un objeto `ObjectId` de BSON en NodeJS. Sin embargo, los componentes de interfaz en React esperan strings planos para manejar el renderizado de listas (`key={q._id}`), comparaciones de formularios, y enrutamiento dinámico en cliente.

### Lecciones Aprendidas y Solución
1. **Partial Compound Index (Índices Compuestos Parciales)**: La solución idónea en modelos de inmutabilidad y versionado histórico es limitar el índice único compuesto exclusivamente a los registros que se encuentren activos mediante un filtro condicional de MongoDB:
   ```typescript
   QuestionSchema.index(
     { tenantId: 1, contentHash: 1 },
     { unique: true, partialFilterExpression: { active: true } }
   );
   ```
   Esto garantiza la consistencia deduplicada en producción pero habilita un histórico de auditoría ilimitado de copias inactivas pasadas con el mismo contenido exacto.
2. **Tipado Específico por Capa (Type Mapping)**: En lugar de usar coerciones inseguras (`as any`), la Server Action debe transferir tipos limpios y el componente cliente debe mapear explícitamente los campos deserializados del backend para unificar la firma de datos:
   ```typescript
   const mapped: QuestionItem[] = res.data.questions.map(q => ({
     ...q,
     _id: String(q._id),
     difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
     explanation: q.explanation || '',
     tags: q.tags || []
   }));
   ```
   Este mapeo encapsula fallos por valores nulos imprevistos y asegura la compatibilidad estricta con las firmas tipadas del lado cliente.

---
*Documento de Lecciones Aprendidas redactado y certificado por Antigravity | ABD Ecosystem Architecture Team.*

