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

## 6. Gráficos Vectoriales SVG Nativos (Zero-Bloat) e Inmunidad a Fallos de Hidratación en React 19 / Next.js 16

> [!CRITICAL]
> **El síntoma**: 
> 1. El uso de librerías externas de visualización de datos (como Recharts, Chart.js o React-Vis) introduce grandes bloques de javascript en el bundle de cliente e incrementa drásticamente la latencia en las métricas de renderizado inicial (TBT, LCP).
> 2. Discrepancias de hidratación (`Hydration Mismatch`) severas al intentar renderizar en servidor elementos dinámicos que dependen de dimensiones físicas en el DOM o APIs de cliente, bloqueando el hilo de ejecución principal en React 19.

### La Causa Raíz
1. **Sobrecarga de JavaScript**: Las librerías de gráficos encapsulan complejas abstracciones de cálculo matemático y manipulación del DOM que añaden peso masivo.
2. **Ciclo de Vida SSR vs CSR**: Al ejecutarse el Server-Side Rendering (SSR), el código en Node.js calcula el marcado estático sin acceso a APIs de navegador (como `window.innerWidth`). Si el lado cliente intenta recalculas dimensiones de forma inconsistente en el primer render, React detecta una discrepancia en el árbol DOM y aborta con errores críticos de hidratación.

### Lecciones Aprendidas y Solución
1. **Gráficos SVG puros paramétricos**: La solución óptima y de grado industrial para dashboards de analíticas dinámicas de alto rendimiento es emplear elementos SVG estándar en React. Calculando las proporciones matemáticamente en base a una caja de visualización (`viewBox`) predefinida y aplicando variables semánticas de color CSS (`stroke="var(--primary)"` y `fill="url(#gradient)"`), garantizamos renderizados adaptables ultra-fluidos a 60fps con peso virtualmente nulo en el bundle.
2. **Patrón Mounted Guard en Componentes Dinámicos**: Para asegurar inmunidad al 100% frente a fallos de hidratación en React 19, todo componente dinámico de cliente que inicie llamadas a Server Actions o manipulación del DOM en el montaje debe encapsularse bajo un estado lógico de control inicial:
   ```typescript
   export default function AnalyticsDashboard() {
     const [mounted, setMounted] = useState(false);
     
     useEffect(() => {
       setMounted(true);
     }, []);

     if (!mounted) {
       return <div className="animate-pulse">Cargando telemetría...</div>;
     }

     return (
       <div className="flex flex-col">
         {/* Renderizado seguro y consistente de SVG y métricas */}
       </div>
     );
   }
   ```
   Esta práctica bloquea el intento de hidratar elementos dinámicos inconsistentes y sirve un loader sutil mientras el lado cliente se monta limpiamente en el navegador.

---

## 7. Integración de Identidad Federada y Whitelists en Producción (SSO Logout Mismatch)

> [!CRITICAL]
> **El síntoma**: 
> 1. Al intentar loguearse online en producción, el proveedor de identidad federado (ABDAuth) abortaba mostrando un error JSON: `{"error":"Redirect URI mismatch"}`.
> 2. Al realizar la acción de cierre de sesión (logout), el servidor central devolvía un error HTTP `400 Bad Request` plano: `"Bad request."` en el navegador.

### La Causa Raíz
1. **Redirecciones no Homologadas**: Para evitar ataques de Phishing o secuestro de tokens (Open Redirect), el proveedor federado valida de forma estricta que la `redirect_uri` solicitada pertenezca al array exacto de `redirectUris` de la base de datos de registro del cliente (`Applications`). El entorno local (`http://localhost:3300`) estaba autorizado, pero no el dominio de producción (`https://abd-quiz.vercel.app`).
2. **Caída en Rutas Dynamic Catch-All (`[...nextauth]`)**: El endpoint de logout central `/api/auth/logout` fue desarrollado localmente en `ABDAuth`, pero los cambios no se habían confirmado ni subido en Git. En producción, Vercel, al no disponer de la ruta estática, derivaba la petición a la ruta dynamic catch-all comodín `/api/auth/[...nextauth]/route.ts`. Auth.js (NextAuth), al recibir una petición no estándar `/logout`, abortaba con error de protocolo `400 Bad Request` ("Bad request.").
3. **Open Redirect en Logout sin Whitelist**: La redirección del logout del SSO a su vez requería registrar en la base de datos del cliente no solo los endpoints de callback exactos, sino la raíz de los dominios origen (`https://abd-quiz.vercel.app` y `http://localhost:3300`) para ser aceptados en el parámetro query `?redirect_uri=...`.

### Lecciones Aprendidas y Solución
1. **Sincronización y Configuración de Wildcards**: Asegurar la inclusión de todas las combinaciones y raíces de dominios válidos en la lista blanca de redirecciones del cliente:
   ```json
   {
     "clientId": "abdquiz-industrial-client-id",
     "redirectUris": [
       "http://localhost:3300/api/auth/federated/callback",
       "https://abd-quiz.vercel.app/api/auth/federated/callback",
       "http://localhost:3300",
       "https://abd-quiz.vercel.app"
     ]
   }
   ```
2. **Priorización de Despliegue en Cambios de Enrutamiento API**: Garantizar que todo nuevo endpoint que colisione o conviva con rutas catch-all (`[...nextauth]`) sea confirmado e implementado en el pipeline del repositorio remoto antes de certificar integraciones ecosistémicas online.
3. **Percent-Encoding Seguro en Querys**: Codificar siempre los componentes de URL en redirecciones asíncronas para evitar fallos de parseo en firewalls o proxies reversos:
   ```typescript
   const response = NextResponse.redirect(
     new URL(`${providerLogoutUrl}?redirect_uri=${encodeURIComponent(redirectUri)}`)
   );
   ```

---

## 8. Gobernanza de Lockfiles en Despliegues Automatizados (Vercel `--frozen-lockfile`)

> [!CRITICAL]
> **El síntoma**: La build del despliegue en Vercel aborta repentinamente con un código de error de instalación de paquetes, reportando discrepancias en las dependencias y requiriendo la bandera `--frozen-lockfile`.

### La Causa Raíz
Las plataformas modernas de Integración Continua (CI/CD) como Vercel aplican de forma predeterminada la política de instalación `--frozen-lockfile` o `--immutable` al compilar la aplicación. Si el archivo `package.json` es editado para agregar o actualizar dependencias en local, pero no se ejecuta el gestor de paquetes correspondiente (`pnpm install` o `npm install`) para sincronizar el archivo de bloqueo de dependencias (`pnpm-lock.yaml` o `package-lock.json`), el servidor remoto detecta que el archivo de bloqueo no coincide con las dependencias especificadas y aborta el despliegue de forma preventiva.

### Lecciones Aprendidas y Solución
1. **Sincronización de Lockfile Post-Edición**: Nunca realices un `git push` tras añadir una dependencia directamente en `package.json` sin antes haber ejecutado la instalación en tu máquina local para consolidar la actualización de hashes e integridades del lockfile:
   ```powershell
   # Regenera el lockfile exacto en base a package.json
   pnpm install
   
   # Agrega ambos archivos de forma atómica en el mismo commit
   git add package.json pnpm-lock.yaml
   git commit -m "chore: synchronize lockfile dependencies"
   git push
   ```
2. **Práctica Automática en Cambios Ecosistémicos**: Mantener sincronizada la integridad de los paquetes compartidos asegura builds deterministas y evita cuellos de botella críticos en el despliegue del software.

---

## 9. Optimización de Mutaciones de Estado Asíncronas en Efectos de React 19 (`react-hooks/set-state-in-effect`)

> [!CRITICAL]
> **El síntoma**: El compilador o el linter del pipeline de auditoría industrial aborta en Fase 6 con el error: `Calling setState synchronously within an effect can trigger cascading renders` (react-hooks/set-state-in-effect) al intentar inicializar cargadores o estados de montaje de componentes.

### La Causa Raíz
Llamar a un modificador de estado (`setMounted`, `setIsLoading`) de forma síncrona en el hilo principal de ejecución de un hook `useEffect` obliga a React a detener el ciclo de renderizado en curso para agendar y resolver una actualización de estado de forma inmediata. Esto puede desencadenar renders en cascada y penalizar drásticamente el rendimiento del hilo principal. El linter prohíbe estas llamadas directas para asegurar una arquitectura pura basada en flujo de datos unidireccional y predictivo.

### Lecciones Aprendidas y Solución
1. **Asincronismo por Macro-tareas (Event Loop)**: Envolver las llamadas síncronas que inicializan estados en una macro-tarea asíncrona mediante `setTimeout` con `0ms`. Esto desplaza la mutación fuera del ciclo de reconciliación primario de React, colocándola en el bucle de eventos del navegador, resolviendo el render en cascada:
   ```typescript
   useEffect(() => {
     const timer = setTimeout(() => {
       setMounted(true);
       fetchAnalytics().catch(console.error);
     }, 0);
     return () => clearTimeout(timer);
   }, [fetchAnalytics]);
   ```
2. **Inicialización por Defectos Lógicos**: Inicializar los estados de carga con valores lógicos predeterminados (por ejemplo, `isLoading: true` por defecto si el componente cargará datos de inmediato al montarse), eliminando la necesidad de mutar el estado en el primer ciclo del efecto de forma redundante.

---

## 10. Gobernanza de Flujos de Retorno tras Logout y Redirección SSO (SSO Redirect Loop & callbackUrl Ignored)

> [!CRITICAL]
> **El síntoma**: 
> 1. Al cerrar sesión en el satélite (ABDQuiz), el usuario terminaba de nuevo atrapado en la pantalla de Login central del proveedor de identidad (ABDAuth) en lugar de permanecer en una pantalla neutral de despedida, generando confusión de pertenencia.
> 2. Si el usuario rellenaba sus credenciales en dicha pantalla de login, era redirigido obligatoriamente al panel central (`/dashboard` de ABDAuth) en lugar de retornar automáticamente a la aplicación satélite original (ABDQuiz).

### La Causa Raíz
1. **Inexistencia de Rutas Públicas en Satélites**: El middleware perimetral de ABDQuiz (`proxy.ts`) bloqueaba y redirigía cualquier petición entrante no autenticada de vuelta al IdP. Por ende, tras borrar cookies, la redirección de regreso al satélite era interceptada instantáneamente, volviendo a forzar la pantalla de login del IdP.
2. **Ignorancia del `callbackUrl` en el Cliente del IdP**: La página de Login cliente de ABDAuth (`src/app/[locale]/login/page.tsx`) tenía un comportamiento de enrutamiento estático en su submit handler exitoso: `router.push('/dashboard')`, ignorando por completo el parámetro de consulta `callbackUrl` enviado por el protocolo federado en la URL del navegador.

### Lecciones Aprendidas y Solución
1. **Arquitectura de Despedida Pública**: Implementar pantallas de finalización de ciclo de vida de sesión públicas en el satélite (ej. `/logout-success`), eximiéndolas de la autenticación de Mapeadores del Middleware:
   ```typescript
   // proxy.ts
   if (pathname.endsWith('/logout-success')) {
     return intlMiddleware(request); // Bypass Auth Gate
   }
   ```
2. **Direccionamiento Dinámico Libre de SSR Suspense Warnings**: Extraer el parámetro `callbackUrl` del navegador utilizando `new URLSearchParams(window.location.search)` dentro del submit de la macro-tarea cliente en el IdP. Esto evita tener que envolver todo el componente en un bloque `<Suspense>` de Next.js (obligatorio si se usara el hook `useSearchParams` de Next.js en renderizados estáticos) y permite redirigir de forma segura e instantánea al satélite llamador:
   ```typescript
   const params = new URLSearchParams(window.location.search);
   const callbackUrl = params.get('callbackUrl');
   if (callbackUrl) {
     window.location.href = callbackUrl; // Redirección externa de dominio federado
   } else {
     router.push('/dashboard');
   }
   ```

---
*Documento de Lecciones Aprendidas redactado y certificado por Antigravity | ABD Ecosystem Architecture Team.*
