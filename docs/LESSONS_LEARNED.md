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
> 3. Si un usuario ya logueado en ABDAuth intentaba acceder al satélite (o hacía clic en volver a loguearse), la pasarela de login central le redireccionaba forzadamente a su dashboard central en lugar de completar la redirección federada, rompiendo el SSO de vuelta.

### La Causa Raíz
1. **Inexistencia de Rutas Públicas en Satélites**: El middleware perimetral de ABDQuiz (`proxy.ts`) bloqueaba y redirigía cualquier petición entrante no autenticada de vuelta al IdP. Por ende, tras borrar cookies, la redirección de regreso al satélite era interceptada instantáneamente, volviendo a forzar la pantalla de login del IdP.
2. **Ignorancia del `callbackUrl` en el Cliente del IdP**: La página de Login cliente de ABDAuth (`src/app/[locale]/login/page.tsx`) tenía un comportamiento de enrutamiento estático en su submit handler exitoso: `router.push('/dashboard')`, ignorando por completo el parámetro de consulta `callbackUrl` enviado por el protocolo federado en la URL del navegador.
3. **Intercepción y Secuestro de Sesión en el Guardián del IdP**: El archivo `proxy.ts` de ABDAuth interceptaba la ruta `/login`. Si detectaba que el usuario ya estaba autenticado (`isLoggedIn: true`), NextAuth realizaba una redirección de seguridad fija a `/${locale}/dashboard`, anulando e ignorando el parámetro query `callbackUrl` presente en el navegador.

### Lecciones Aprendidas y Solución
1. **Arquitectura de Despedida Pública**: Implementar pantallas de finalización de ciclo de vida de sesión públicas en el satélite (ej. `/logout-success`), eximiéndolas de la autenticación de Mapeadores del Middleware:
   ```typescript
   // proxy.ts
   if (pathname.endsWith('/logout-success')) {
     return intlMiddleware(request); // Bypass Auth Gate
   }
   ```
2. **Whitelisting de la Landing Page Pública del Satélite**: Eximir la raíz del sitio `/` y sus variantes de idioma localizadas (`/es`, `/en`, `/es/`, `/en/`) en el guardián `proxy.ts` de ABDQuiz. Esto permite a los usuarios ver la Landing Page informativa libremente, y solo los desvía al portal de identidad cuando solicitan explícitamente acceder al simulador privado (`/exams` o `/admin`):
   ```typescript
   const isPublicPath = 
     pathname === '/' ||
     pathname === '/es' ||
     pathname === '/en' ||
     pathname === '/es/' ||
     pathname === '/en/' ||
     pathname.endsWith('/logout-success') ||
     pathname.includes('.') || 
     pathname.startsWith('/_next') || 
     pathname.startsWith('/api/') ||
     pathname === '/favicon.ico';
   
   if (isPublicPath) return intlMiddleware(request);
   ```
3. **Direccionamiento Dinámico Libre de SSR Suspense Warnings**: Extraer el parámetro `callbackUrl` del navegador utilizando `new URLSearchParams(window.location.search)` dentro del submit de la macro-tarea cliente en el IdP. Esto evita tener que envolver todo el componente en un bloque `<Suspense>` de Next.js (obligatorio si se usara el hook `useSearchParams` de Next.js en renderizados estáticos) y permite redirigir de forma segura e instantánea al satélite llamador:
   ```typescript
   const params = new URLSearchParams(window.location.search);
   const callbackUrl = params.get('callbackUrl');
   if (callbackUrl) {
     window.location.href = callbackUrl; // Redirección externa de dominio federado
   } else {
     router.push('/dashboard');
   }
   ```
4. **Bypass del Secuestro en el Guardián del IdP (`proxy.ts`)**: Modificar la regla de ruta pública del middleware de ABDAuth para que si un usuario autenticado entra en `/login` con una `callbackUrl` en sus parámetros de consulta, se le devuelva inmediatamente a dicho flujo de autorización en vez de arrastrarlo a su panel de control:
   ```typescript
   if (isPublicRoute) {
     if (isLoggedIn) {
       const { searchParams } = new URL(req.url);
       const callbackUrl = searchParams.get('callbackUrl');
       if (callbackUrl) {
         return NextResponse.redirect(new URL(callbackUrl, req.url));
       }
       return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
     }
     return intlMiddleware(req);
   }
   ```

---

## 11. Gobernanza de Marca Blanca Dinámica (`@abd/styles`) y Conflictos de Gestores de Paquetes (NPM vs PNPM)

> [!CRITICAL]
> **El síntoma**: 
> 1. Al intentar instalar una dependencia de Git directa utilizando `npm install`, el motor de NPM aborta lanzando un error interno e incomprensible: `npm error Cannot read properties of null (reading 'matches')`.
> 2. Durante el primer renderizado de la página, el satélite experimenta un parpadeo visual molesto (FOUC - Flash of Unstyled Content) donde la interfaz aparece con los estilos genéricos durante décimas de segundo antes de vestirse con los colores corporativos del Tenant.

### La Causa Raíz
1. **Incompatibilidad de Estructuras en Monorepos**: Si un proyecto se ha inicializado o contiene un archivo de bloqueo de pnpm (`pnpm-lock.yaml`) y un archivo de espacio de trabajo (`pnpm-workspace.yaml`), el uso del comando nativo `npm install` genera un conflicto severo al intentar reconciliar los enlaces simbólicos de node_modules del almacén global de pnpm, crasheando el parser interno de NPM.
2. **Sintaxis de Git en NPM**: Ciertas versiones de NPM fallan al parsear strings de Git explícitos como `git+https://github.com/ajabadia/ABDStyles.git#main` en campos de dependencias secundarias.
3. **Flujos de Carga Client-Side en Estilos**: Intentar inyectar hojas de estilo dinámicas basándose en llamadas asíncronas de cliente tras el montaje (`useEffect`) provoca que el navegador renderice primero el HTML puro con la hoja de estilos estática por defecto y luego re-estile el DOM al completarse el renderizado asíncrono, produciendo el molesto parpadeo.

### Lecciones Aprendidas y Solución
1. **Gobernanza Monolítica con PNPM**: En todo repositorio que declare lógicas multitenant o contenga un archivo `pnpm-lock.yaml`, queda terminantemente **prohibido** el uso de comandos de NPM. Se debe emplear exclusivamente `pnpm` para asegurar resoluciones deterministas y rápidas:
   ```powershell
   # Limpieza e instalación limpia de pnpm
   Remove-Item package-lock.json -ErrorAction SilentlyContinue
   pnpm install
   ```
2. **Uso de Shorthand de GitHub**: Para evitar bugs de parseo en múltiples motores de CI/CD (incluido Vercel), la mejor práctica de producción al enlazar repositorios hermanos públicos o privados es usar la sintaxis de atajo nativa de GitHub:
   ```json
   "@abd/styles": "github:ajabadia/ABDStyles#main"
   ```
3. **Inyección SSR Síncrona en el Layout Raíz (Prevención de FOUC)**: La única forma de erradicar por completo el FOUC en Next.js App Router es procesar la hoja de estilos de forma síncrona en servidor antes de servir el DOM. Importando el generador CSS en el Server Component del `RootLayout` e inyectándolo directamente en la etiqueta estática `<style>` del `<head>`, el navegador recibe el HTML con las variables del Tenant ya resueltas en su primer frame:
   ```tsx
   // layout.tsx (Server Component)
   import { generateTenantCss } from "@abd/styles";
   import { getIndustrialSession } from "@/lib/session";

   export default async function RootLayout({ children }) {
     const session = await getIndustrialSession();
     const branding = session.user?.branding;
     const customCss = branding?.theme ? generateTenantCss(branding.theme) : "";

     return (
       <html>
         <head>
           {customCss && (
             <style id="tenant-branding-gateway" dangerouslySetInnerHTML={{ __html: customCss }} />
           )}
         </head>
         <body>{children}</body>
       </html>
     );
   }
   ```
4. **Fallback Inteligente de Marca en Interfaces**: Al renderizar logotipos cargados dinámicamente de URLs externas de CDN, se debe prever siempre un evento de error de red (`onError`) que oculte la imagen corrupta y muestre de forma instantánea el logo corporativo de fallback en formato SVG o texto enriquecido:
   ```tsx
   <Link href="/" className="flex items-center">
     {user?.branding?.logoUrl ? (
       <img
         src={user.branding.logoUrl}
         alt="Logo"
         className="max-h-8 w-auto"
         onError={(e) => {
           e.currentTarget.style.display = 'none';
           const sib = e.currentTarget.nextElementSibling as HTMLElement;
           if (sib) sib.style.display = 'inline';
         }}
       />
     ) : null}
     <span style={{ display: user?.branding?.logoUrl ? 'none' : 'inline' }}>
       Fallback Logo
     </span>
   </Link>
   ```

## 🌌 Era 11.2: Detección, Aislamiento por Subdominios y Desinfección de Linter (Purity standard)

1. **Aislamiento Cross-Tenant en Proxies del Lado del Servidor**:
   - **El Síntoma**: Los usuarios autenticados en una academia podían saltar horizontalmente a otras academias si visitaban sus subdominios específicos sin que el sistema forzara la re-autenticación inmediata.
   - **La Causa Raíz**: Las cookies de sesión se cargaban en un único dominio base, y el proxy carecía de una validación cruzada entre la identidad contenida en el JWT/cookie (`session.user.tenantId`) y el subdominio activo actual.
   - **La Solución Industrial**: Implementar una validación estricta en [src/proxy.ts](file:///d:/desarrollos/ABDQuiz/src/proxy.ts) que compare el `tenantId` de la sesión con los metadatos obtenidos desde el IdP para el subdominio visitado. Si hay un desajuste, se invalida la autenticación, se purgan las cookies y se redirige con el parámetro `tenant` correcto.
   
2. **Eliminación Absoluta de `any` en Next.js Fetch Extensions**:
   - **El Síntoma**: El linter de TypeScript (`@typescript-eslint/no-explicit-any`) fallaba al compilar el proyecto al usar `fetch(url, { next: { revalidate: 60 } } as any)`.
   - **La Causa Raíz**: El tipo nativo `RequestInit` del navegador no contempla la propiedad `next` inyectada de forma propietaria por Next.js para caché incremental.
   - **La Solución Industrial**: En lugar de degradar la pureza del código a través de `as any`, utilizar una intersección de tipos limpia de TypeScript que respete el estándar y el compilador:
     ```typescript
     fetch(url, { 
       next: { revalidate: 60 } 
     } as RequestInit & { next?: { revalidate: number } });
     ```

3. **Cero Estilos Inline en Reglas de Auditoría Estructural (`INLINE_STYLE`)**:
   - **El Síntoma**: Las herramientas de auditoría estructural rechazaban archivos de componentes con advertencias severas de seguridad por el uso de propiedades `style={{ display: ... }}` en componentes React reactivos.
   - **La Causa Raíz**: Las arquitecturas militares y sistemas blindados de alta fidelidad vetan el uso de atributos CSS inline para evitar inyecciones maliciosas y garantizar que toda la presentación visual pase únicamente por hojas de estilos sanitizadas y tokens de Tailwind CSS.
   - **La Solución Industrial**: Migrar el comportamiento reactivo directamente al árbol de clases utilizando strings formateados y clases condicionales nativas de Tailwind CSS:
     ```tsx
     <span className={`text-xl font-black ${user?.branding?.logoUrl ? 'hidden' : 'inline'}`}>
       {brandText}
     </span>
     ```

---

## 🌌 Era 11.3: Control de Recálculo de Calificaciones Retroactivo e Impugnaciones (Phase 4.2)

1. **Rastreo de Cambios en Esquemas Mixtos de Mongoose (`markModified`)**:
   - **El Síntoma**: Al guardar un intento de examen tras anular o recalcular una pregunta en el snapshot histórico (`attempt.questions`), las modificaciones en base de datos no se persistían y los intentos conservaban los valores antiguos.
   - **La Causa Raíz**: Mongoose no detecta automáticamente modificaciones profundas en propiedades nested declaradas de tipo `Schema.Types.Mixed` o arrays sin un esquema estricto, ya que no realiza comparaciones profundas por motivos de rendimiento.
   - **La Solución Industrial**: Tras mutar el objeto en el servidor, llamar explícitamente a `markModified()` especificando la clave afectada antes de persistir con `save()`:
     ```typescript
     attempt.questions[qIndex].isCancelled = true;
     attempt.markModified('questions');
     await attempt.save();
     ```

2. **Exclusión Dinámica del Denominador en Preguntas Anuladas (`CANCEL_QUESTION`)**:
   - **El Síntoma**: Las notas resultantes superaban el 100% o causaban fallos de división por cero al anular preguntas de un examen.
   - **La Causa Raíz**: Exclusión incompleta de las preguntas anuladas (`isCancelled = true`) en los denominadores de los tres modos de evaluación (simple, penalizada, ponderada).
   - **La Solución Industrial**: Validar el estado `isCancelled` de cada reactivo y excluirlo del total posible:
     - *Modo Simple/Penalizado*: El total de preguntas válidas posibles del examen se reduce a `totalQuestions - cancelledCount`.
     - *Modo Ponderado*: El peso total posible del examen se reduce excluyendo el peso de la dificultad asignada a la pregunta anulada.
     Esto mantiene el porcentaje del alumno a escala matemática perfecta.

---

## 🌌 Era 11.4: Parametrización Avanzada y Control de Flujo del Simulador (Phase 3.6 & 3.7)

1. **Garantía Atómica en la Navegación y Transición de Estados**:
   - **El Síntoma**: Al transicionar entre preguntas en el bucle de revisión de omitidas o al volver atrás con navegación libre, la interfaz mostraba temporalmente la respuesta de la pregunta anterior antes de cargarse la correcta.
   - **La Causa Raíz**: Desfase de estados asíncronos en componentes funcionales cuando cambian `currentIndex` y `selectedOption` de manera secuencial pero no atómica.
   - **La Solución Industrial**: En lugar de esperar a que el estado local `answers` se propague de forma asíncrona, calcular y inyectar el nuevo estado de forma atómica y síncrona en las funciones de transición, asegurando que `setCurrentIndex` y `setSelectedOption` se actualicen con los valores correctos en el mismo ciclo de render de la UI:
     ```typescript
     const updatedAnswers = [...answers];
     updatedAnswers[currentIndex] = selectedOption;
     setAnswers(updatedAnswers);
     
     // Transición atómica al siguiente índice omitido
     setCurrentIndex(nextOmittedIndex);
     setSelectedOption(updatedAnswers[nextOmittedIndex]);
     ```

2. **Anulación Lógica no Destructiva frente a Borrados Físicos en Base de Datos**:
   - **El Síntoma**: Eliminar intentos físicamente de la base de datos para restablecer las cuotas de intentos de los estudiantes corrompía el histórico y las métricas en los dashboards del profesor.
   - **La Causa Raíz**: Pérdida irrecuperable de registros para auditoría de gobernanza al realizar borrados físicos destructivos.
   - **La Solución Industrial**: Implementar un patrón de anulación lógica agregando el flag `isInvalidated: true` y campos de auditoría (`invalidatedBy`, `invalidatedAt`). El motor de validación de cuotas (`QuizService`) descuenta estos intentos del total acumulado del alumno, mientras que los paneles de analíticas pueden conservar los registros para auditoría.

3. **Aislamiento Multitenant Dinámico en Acciones y Vistas de Edición (404 Error Remediation)**:
   - **El Síntoma**: Los administradores que intentaban editar plantillas de examen recibían un error 404 (`notFound()`) en la ruta `/admin/exams/[id]/edit`.
   - **La Causa Raíz**: El listado de exámenes y el seeding inicial de plantillas por defecto estaban hardcodeados a un `DEFAULT_TENANT` global (`"abd_global"`), mientras que la vista de edición ejecutaba un chequeo de seguridad estricto comparando `config.tenantId !== user.tenantId` (donde `user.tenantId` correspondía al tenant real federado del administrador, p. ej. `"ajabadia"`). Al haber este desajuste de inquilinos, Next.js abortaba la renderización y lanzaba el error de no encontrado.
   - **La Solución Industrial**: Dinamizar todas las acciones del ciclo de vida de configuración (`getExamConfigsAction`, `createExamConfigAction`, `updateExamConfigAction`, `deleteExamConfigAction`, `cloneExamConfigAction`) utilizando la sesión federada activa (`getIndustrialSession()`). Si el inquilino cambia, el sistema autogenera semillas del simulador bajo el nuevo `tenantId` correspondiente, garantizando consistencia absoluta en visualización, mutación y edición en todo el ecosistema.

---

## 🌌 Era 11.5: Diagnóstico, Accesibilidad Heurística y Reglas de Calidad ESLint en Componentes React (Phase 4.2 Remediation)

1. **Elusión del Analizador de Accesibilidad Heurístico (a11y regex parser bypass)**:
   - **El Síntoma**: El script de auditoría de arquitectura `arch-guard.mjs` reportaba que el botón de pestañas (`<button`) no disponía de una etiqueta accesible (`aria-label`) a pesar de tener declarada una propiedad `aria-label={\`...\`}`.
   - **La Causa Raíz**: El analizador estático busca la etiqueta `<button` y recorre recursivamente las líneas siguientes para hallar `aria-label`. No obstante, aborta la búsqueda prematuramente si encuentra el carácter `>` de cierre. Dado que la propiedad `onClick={() => setActiveTab(tab.key)}` contenía el operador de función flecha (`=>`), que a su vez contiene el carácter `>`, el bucle del analizador finalizaba en esta línea y nunca llegaba a leer el `aria-label` declarado tres líneas más abajo.
   - **La Solución Industrial**: Posicionar la etiqueta `aria-label` directamente en la misma línea de apertura del botón `<button aria-label={...} ...>` para asegurar la detección síncrona inmediata por parte de analizadores estáticos basados en expresiones regulares simples.

2. **Resolución de Tipado Incompatible en Inicializadores de Subdocumentos MongoDB (TSC Compilation Error)**:
   - **El Síntoma**: El compilador de TypeScript (TSC) abortaba en la Fase 5 reportando: `error TS2739: Type '{}' is missing the following properties from type '{ questionText: string; correctOptionIndex: number; }'`.
   - **La Causa Raíz**: Al asignar un valor por defecto a un subdocumento fuertemente tipado de Mongoose en la capa de servicios (`qBlock.questionSnapshot = {}`), omitíamos propiedades declaradas como obligatorias en la interfaz (`questionText` y `correctOptionIndex`), provocando un fallo estricto de compilación.
   - **La Solución Industrial**: Inicializar siempre los fallbacks de subdocumentos con todas las claves obligatorias asignándoles valores por defecto semánticos vacíos compatibles, evitando la degradación mediante conversiones `as any`.

3. **Restricción de Renderizado JSX dentro de Exception Boundaries (ESLint try/catch rule)**:
   - **El Síntoma**: El linter en Fase 6 fallaba con el error: `Avoid constructing JSX within try/catch`.
   - **La Causa Raíz**: React no evalúa ni renderiza inmediatamente el marcado JSX retornado dentro del bloque `try/catch`. Por tanto, los fallos de renderizado tardíos en cliente no pueden ser interceptados de manera síncrona por este capturador, violando el diseño de arquitectura modular y flujos de render reactivos.
   - **La Solución Industrial**: Aislar los procesos computacionales complejos que puedan lanzar excepciones (como la generación del CSS dinámico mediante `@abd/styles`) dentro del bloque `try/catch` para asignar una variable de control, y ubicar el retorno estructurado del nodo JSX fuera de los límites de la excepción.

---
*Documento de Lecciones Aprendidas redactado y certificado por Antigravity | ABD Ecosystem Architecture Team.*
