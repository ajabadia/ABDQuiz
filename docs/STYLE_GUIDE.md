# Ecosistema ABD: Guía de Estilos de Instrumentación Industrial (System Spec v2.0)

Esta guía define la estética de **instrumentación técnica** de todo el ecosistema ABD. Se aleja de los patrones comerciales tradicionales de SaaS para adoptar un lenguaje de consola técnica de alta precisión, simetría y cohesión estructural.

---

## 🎨 1. Integración Cromática Global (Branding Variable System)

Para garantizar la compatibilidad absoluta con la gobernanza multi-tenant y la personalización de marca blanca en caliente, **queda terminantemente prohibido el uso de colores fijos hexadecimales hardcodeados** en las clases CSS o Tailwind de los componentes visuales operativos.

Todos los componentes deben heredar de forma fluida y transparente los tokens cromáticos definidos en las **variables de CSS globales del sistema**:

*   **Fondo Abisal (`var(--background)`)**: El lienzo oscuro de fondo para la consola.
*   **Fondo de Superficie / Tarjetas (`var(--card)`)**: Tono secundario y sobrio para paneles, bloques de código, modales y layouts de precisión.
*   **Señal de Precisión Primaria (`var(--primary)`)**: Tono de primer orden para destacar estados de éxito, progreso, focos interactivos y bordes de acción principal (ej. Cyan por defecto).
*   **Señal de Bypass / Retroceso (`var(--secondary)` / `var(--accent)`)**: Tono para acciones de navegación auxiliar, desvíos temporales o estados de espera (ej. Ámbar por defecto).
*   **Línea Limítrofe / Separadores (`var(--border)`)**: Tono sutil e inerte para delimitar secciones, cards y estados sin sobrecargar la UI.
*   **Texto Principal de Alta Claridad (`var(--foreground)`)**: Tipografía principal optimizada por el algoritmo YIQ Luma para contraste y legibilidad excelentes del 100%.

---

## ⚖️ 2. Leyes de Hierro del Contenedor y Espaciado Horizontal

Para evitar saltos visuales y de ancho ocular al cambiar de pantalla, todas las vistas operativas del sistema deben ajustarse de forma inquebrantable a las siguientes pautas de envoltura:

*   **Main Container (Warp)**: El tag principal `<main>` debe usar exactamente las mismas clases de padding y selección:
    `className="min-h-screen bg-background text-foreground p-6 md:p-12 selection:bg-primary/30" role="main"`
*   **Inner Wrapper (Limit)**: El contenedor interno de ancho restringido debe alinearse al centro del viewport:
    `className="max-w-7xl mx-auto flex flex-col gap-10"`

---

## 📐 3. Anatomía Unificada de Cabeceras (The Header Architecture)

El bloque de cabecera (`<header>`) debe mantener una estructura de anidación y flujo de elementos idéntica en toda la aplicación. Se dividen únicamente en dos variantes funcionales:

### Variante A: Pantalla Raíz / Dashboard (Sin Retorno)
Se utiliza para portales de entrada principales. Estructura vertical estricta:
1.  **Monospace Breadcrumb**:
    *   Flex container horizontal alineado al centro con `gap-2 mb-2`.
    *   Icono identificativo (`LucideIcon`) de tamaño fijo `size={14}` en color primario global con animación de pulso activa (`text-primary animate-pulse`).
    *   Texto del Breadcrumb: `CONSOLA DE CONTROL • DASHBOARD` en tipografía `font-mono text-[10px] font-black uppercase tracking-[0.25em] text-primary`.
2.  **Título de Consola**:
    *   Clase Tailwind única: `className="text-3xl font-black uppercase italic tracking-tight text-foreground leading-none"`
    *   Texto del título: Nombre de la terminal (ej: `ABD GOBERNANZA` con acento cromático `text-primary` en palabras de marca).
3.  **Subtítulo Contextual**:
    *   Clase Tailwind única: `className="text-sm text-muted-foreground font-sans mt-2 leading-relaxed"`
    *   Texto descriptivo sentence-case.

### Variante B: Pantalla Operativa / Detalle (Con Retorno)
Se utiliza para todas las herramientas operativas internas. Estructura vertical estricta:
1.  **Monospace Breadcrumb**:
    *   Flex container horizontal alineado al centro con `gap-2 mb-2`.
    *   Icono identificativo (`LucideIcon`) de tamaño fijo `size={14}` en color primario global con animación de pulso activa (`text-primary animate-pulse`).
    *   Texto del Breadcrumb: `CONSOLA DE CONTROL • [NOMBRE_PÁGINA]` en tipografía `font-mono text-[10px] font-black uppercase tracking-[0.25em] text-primary`.
2.  **Fila de Título e Interacción (`flex items-center gap-4 mt-1`)**:
    *   **Botón de Retroceso Aséptico** (a la izquierda):
        *   Enlace `<Link>` que apunta al nivel superior o raíz del portal.
        *   Clase Tailwind única: `className="inline-flex items-center justify-center p-2 bg-transparent text-muted-foreground hover:text-foreground border border-border hover:border-border/80 transition-all duration-200 cursor-pointer rounded-none active:scale-[0.95] shrink-0 focus:outline-none focus:ring-1 focus:ring-primary/50"`
        *   Icono interno de retorno: `ArrowLeft` con `size={14}`.
    *   **Título de Consola** (a la derecha):
        *   Clase Tailwind única: `className="text-3xl font-black uppercase italic tracking-tight text-foreground leading-none flex-1 truncate"`
3.  **Subtítulo Contextual**:
    *   Clase Tailwind única: `className="text-sm text-muted-foreground font-sans mt-2 leading-relaxed"`
    *   Texto descriptivo sentence-case.

---

### 💻 Modelos de Código TSX (The Code Templates)

Para garantizar consistencia absoluta, copia y pega los siguientes templates exactos al construir las cabeceras de tus páginas:

#### Template Variante A: Pantalla Raíz (Dashboard Principal)
```tsx
import { LayoutDashboard } from 'lucide-react';

{/* Header */}
<header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-8">
  <div className="flex flex-col gap-2">
    {/* Tag Monospace de Ubicación (Breadcrumb/Ruta) */}
    <div className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-primary flex items-center gap-2 mb-2">
      <LayoutDashboard size={14} className="text-primary animate-pulse" aria-hidden="true" />
      {t('controlConsole')} • DASHBOARD
    </div>
    
    <h1 className="text-3xl font-black uppercase italic tracking-tight text-foreground leading-none">
      ABD <span className="text-primary">{ap('gobernanza')}</span>
    </h1>
    
    {/* Subtítulo descriptivo en Geist Sans, tamaño normal y sentence-case */}
    <p className="text-sm text-muted-foreground font-sans mt-2 leading-relaxed">
      Consola de control federada y gobernanza en caliente.
    </p>
  </div>
</header>
```

#### Template Variante B: Pantalla Operativa / Detalle (Con Retroceso)
```tsx
import { FolderOpen, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

{/* Header Navigation */}
<header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-8">
  <div className="flex flex-col gap-2">
    {/* Tag Monospace de Ubicación (Breadcrumb/Ruta) */}
    <div className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-primary flex items-center gap-2 mb-2">
      <FolderOpen size={14} className="text-primary animate-pulse" aria-hidden="true" />
      {tAdmin('controlConsole')} • {t('title')}
    </div>
    
    <div className="flex items-center gap-4 mt-1">
      {/* Botón de Retroceso Aséptico y Táctico rounded-none */}
      <Link 
        href={`/${locale}/admin`}
        className="inline-flex items-center justify-center p-2 bg-transparent text-muted-foreground hover:text-foreground border border-border hover:border-border/80 transition-all duration-200 cursor-pointer rounded-none active:scale-[0.95] shrink-0 focus:outline-none focus:ring-1 focus:ring-primary/50"
        aria-label="Back to Admin Dashboard"
        title="Back to Dashboard"
      >
        <ArrowLeft size={14} aria-hidden="true" />
      </Link>
      
      <h1 className="text-3xl font-black uppercase italic tracking-tight text-foreground leading-none flex-1 truncate">
        {t('title')}
      </h1>
    </div>
    
    {/* Subtítulo descriptivo en Geist Sans, tamaño normal y sentence-case */}
    <p className="text-sm text-muted-foreground font-sans mt-2 leading-relaxed">
      {t('subtitle')}
    </p>
  </div>
</header>
```

---

## ⚙️ 4. Componentes de Mando y Botones Generales

*   **Bordes Afilados**: Radio de borde `rounded-none` o `rounded-sm` (máx. `0.15rem`).
*   **Casing de Botones**: Textos de acción principal en **MAYÚSCULAS** (`uppercase`) y tipografía `font-mono`.
*   **Botón de Avance (Siguiente)**: Borde fino en color primario global (`border-primary/40 hover:border-primary`), texto en color primario (`text-primary`), y fondo transparente. Hover con relleno translúcido (`hover:bg-primary/10`).
    `className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-transparent text-primary border border-primary/40 hover:border-primary hover:bg-primary/10 font-mono text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-none active:scale-[0.98]"`

---

## 🔤 5. Estándar de Capitalización (Casing Rules)

| Elemento UI | Capitalización (Casing) | Tipografía | Propósito |
| :--- | :--- | :--- | :--- |
| **Micro-Tags / Metadatos** | `ALL_UPPERCASE` | `Geist Mono` | Códigos de log, estados de auditoría, etiquetas de filtros. |
| **Rutas (Breadcrumbs)** | `ALL_UPPERCASE` | `Geist Mono` | Ubicación jerárquica en la barra superior. |
| **Textos de Botones** | `ALL_UPPERCASE` | `Geist Mono` | Evocar mandos de control industriales. |
| **Títulos de Página** | `ALL_UPPERCASE` | `Geist Sans` (Italic) | Foco principal y carácter de consola técnica. |
| **Enunciados / Explicaciones** | `Sentence-case` | `Geist Sans` | Lectura cómoda, natural y libre de fatiga cognitiva. |

---

## 🛠| 6. Estándar de Construcción (Fire Rules)

1.  **FIRE:MAX_LINES**: Máximo **150 líneas** por componente/archivo para forzar modularidad.
2.  **FIRE:I18N_VIOLATION**: Prohibido el uso de strings literales en JSX. Todo debe usar `useTranslations`.
3.  **FIRE:A11Y_VIOLATION**: Atributo `alt` obligatorio en imágenes; `aria-label` en botones interactivos mudos.
4.  **FIRE:NO_EMBEDDED_CSS/SCRIPTS**: Prohibido `<style>` o `<script>` en los layouts. Estilos 100% centralizados.

---

## 🛰️ 7. Síntesis del Estilo Gráfico de Landing Pages (The Suite Landing Standard)

Para garantizar un portal de bienvenida asombroso en cualquier aplicación de la suite ABD, las landing pages públicas (rutas raíces `/`) deben cumplir de forma unificada las siguientes especificaciones identitarias:

### A. Capa de Atmósfera y Rejilla Industrial
*   **Tinta de Fondo**: Rejilla técnica de fondo `bg-industrial-grid` (una cuadrícula geométrica fina) combinada con un desvanecimiento radial suave (`mask-industrial-fade`).
*   **Propiedades Físicas**: Opacidad bloqueada al 50% (`opacity-50`) e inercia total ante el ratón (`pointer-events-none`) para que actúe únicamente como ambientación estética sin interrumpir la interacción del usuario.

### B. Layout y Alineaciones de Viewport
*   **Envoltura Principal**: El tag `<main>` debe centrar de forma absoluta los contenidos vertical y horizontalmente:
    `className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24 bg-background text-foreground selection:bg-primary/30 overflow-hidden" role="main"`
*   **Contenedor del Hero**: Ancho restringido a `max-w-5xl` con una separación vertical espaciosa (`flex flex-col gap-16`) y animación de entrada progresiva (`animate-in fade-in duration-500`).

### C. El Hero Brand Header (El Bloque de Marca)
1.  **Status Pill (Píldora de Estado)**:
    *   Una micro-caja horizontal en tipografía Geist Mono: `inline-flex items-center gap-2 px-3 py-1 bg-muted/50 border border-border text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-mono rounded-sm`.
    *   Contiene un **punto parpadeante dinámico** (`span className="animate-ping absolute h-full w-full rounded-full bg-primary"`) simulando un ping de latencia técnica en tiempo real.
2.  **Mega Título en Cursiva Negrita**:
    *   Tamaño imponente (`text-6xl md:text-8xl`), letras extra-gruesas (`font-black`), espaciado extra-estrecho (`tracking-tighter`), Geist Sans cursiva y en mayúsculas (`italic uppercase antialiased text-foreground`).
    *   La marca se divide cromáticamente: la primera parte neutral (`text-foreground`) y la segunda parte envuelta en la variable primaria (`text-primary` o `text-primary/80`) para crear un anclaje ocular inmediato de marca.
3.  **Subtítulo de Contenido Delgado**:
    *   Tipografía Geist Sans, tamaño grande (`text-xl`), peso de letra delgado (`font-light`), espaciado relajado de lectura (`leading-relaxed text-muted-foreground max-w-[650px]`) y alineación centrada.

### D. Central Tactical Action (El Área de Llamada a la Acción - CTA)
*   **El Botón Mega CTA**:
    *   Un bloque rectangular contundente, sin bordes redondeados orgánicos excesivos (`rounded-none` o `rounded-sm` máximo, Tailwind `rounded-none`).
    *   Tipografía `font-mono text-xs uppercase tracking-widest font-black`.
    *   Color de fondo correspondiente a la señal primaria (`bg-primary`), texto en contraste YIQ (`text-primary-foreground`) y borde fino complementario (`border border-primary/30`).
    *   Foco interactivo reactivo: hover con reducción de brillo suave (`hover:bg-primary/95`), escala táctil activa (`active:scale-95`) y transiciones fluidas de 300ms (`transition-all duration-300`).
    *   Icono de avance animado: `ArrowRight` a la derecha con animación de pulso constante (`className="w-4 h-4 ml-3 animate-pulse"`).
*   **Etiqueta de Navegación Monospace**:
    *   Una micro-instrucción situada inmediatamente debajo del botón CTA, en formato monospace muy pequeño y atenuado (`font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/60`).

### E. Grid de Características Técnicas (Features Grid)
*   Distribución simétrica de 3 columnas para pantallas de escritorio (`grid grid-cols-1 md:grid-cols-3 gap-6`).
*   **Tarjetas de Características**:
    *   Clases: `p-6 bg-card border border-border rounded-sm flex flex-col gap-4`.
    *   *Icono Prefijado*: Enmarcado en un contenedor muy fino con fondo translúcido y borde primario (`p-2.5 bg-primary/5 border border-primary/20 text-primary w-fit rounded-sm`).
    *   *Título*: Geist Sans en mayúsculas pequeñas `text-sm font-black uppercase tracking-wider text-foreground`.
    *   *Cuerpo*: Texto Geist Sans en tamaño `text-xs text-muted-foreground leading-relaxed`.

### F. Footer de Telemetría (Telemetry Footer)
*   Alineado al final con espaciado vertical (`pt-8 flex flex-col items-center gap-6`).
*   Separador lineal minimalista (`Separator className="w-24 bg-border"`).
*   Métricas del sistema: Fila flex compacta con espaciado amplio (`flex gap-12 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground/30`).

---

## 🗄️ 8. Anatomía del Menú Lateral (The Tactical Sidebar Drawer)

Para la navegación global, el ecosistema utiliza un panel lateral deslizante (Sidebar Drawer) con estética de menú táctico, garantizando homogeneidad entre todas las aplicaciones de la suite.

### A. Botón Disparador (Floating Trigger)
*   **Posicionamiento:** Fijo en la esquina superior izquierda (`fixed top-6 left-6 z-40`).
*   **Contenedor:** Cuadrado rígido sin redondear (`p-3 rounded-none`), fondo translúcido (`bg-background/80 backdrop-blur-md`) con sombra técnica (`shadow-lg`).
*   **Interacción:** Borde inactivo sutil (`border border-border`), hover de atención (`hover:border-primary/40 hover:bg-muted`), y efecto táctil de retroceso (`active:scale-95`).
*   **Iconografía:** Icono Hamburguesa estándar (`Menu` de Lucide) en tamaño `w-5 h-5`.

### B. Velo de Fondo (Dark Overlay Backdrop)
*   Debe oscurecer fuertemente el contexto de la aplicación para capturar la atención de manera modal.
*   **Especificaciones:** `fixed inset-0 z-45 bg-black/70 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in`.

### C. Contenedor del Drawer (Sidebar Panel)
*   **Posicionamiento y Tamaño:** Fijo al eje vertical izquierdo con ancho definido (`fixed inset-y-0 left-0 z-50 w-80`).
*   **Superficie:** Fondo abisal principal (`bg-background`), bordes afilados (`rounded-none`), separador limitante (`border-r border-border`) y sombra pesada para profundidad (`shadow-2xl`).
*   **Animación:** Desplazamiento cinemático en el eje X (`transition-transform duration-300 ease-in-out transform`).

### D. Enlaces de Navegación (Tactical Links)
Los ítems del menú abandonan la apariencia de "link web" para convertirse en placas de instrumentación de comandos.
*   **Geometría:** Rectángulos de máxima precisión (`px-4 py-3 rounded-none flex items-center gap-4`).
*   **Tipografía:** Mandatorio `font-mono text-[10px] font-bold uppercase tracking-wider`.
*   **Reposo:** Fondo imperceptible (`bg-muted/10`), borde pasivo (`border border-border`) y texto mudo (`text-muted-foreground`).
*   **Hover (Foco):** El componente "despierta" bañándose en la tonalidad de la señal primaria (`hover:border-primary/20 hover:bg-primary/5 hover:text-primary`).

### E. Tarjeta de Sesión Cyber-Industrial (Bottom Card)
Ubicada al fondo del panel, separada por una barrera física (`border-t border-border pt-6`).
*   **Sesión Activa:** Identidad jerarquizada. Nombre en mayúsculas pesadas (`text-xs font-black tracking-wider`), email y metadatos en código de máquina (`font-mono text-[8px] text-muted-foreground/80 uppercase`). Acciones destructivas o salidas con hover de alerta (`hover:text-red-400 hover:bg-red-500/10 border-border border rounded-none p-2`).
*   **Sesión Latente (Off):** Indicador de telemetría de caída (punto rojo parpadeante `animate-ping bg-red-400 opacity-75`) y bloque macizo de arranque de sistema (botón sólido color primario `bg-primary font-mono`).

---

## ⚙️ 9. Anatomía del Menú de Ajustes (The System Settings Dropdown)

El menú de configuración rápida (icono de engranaje) encapsula acciones de sistema como el idioma, el tema y la desconexión segura. Al igual que el resto de la suite, debe obedecer un patrón visual rígido, jerárquico y de precisión mecánica.

### A. Botón Disparador (Gear Trigger)
*   **Contenedor:** Botón de dimensiones precisas (`p-2.5 rounded-md` o `rounded-none`), fondo con desenfoque (`bg-background/80 backdrop-blur-md`), borde inactivo (`border border-border`).
*   **Estado Abierto (Focus):** Debe resaltarse cambiando su fondo e iluminando el contorno (`bg-muted ring-1 ring-primary/20 border-primary/30`).
*   **Animación del Icono:** El icono (`Settings` de Lucide) debe rotar suavemente al abrirse para dar feedback mecánico (`transition-transform duration-500 rotate-90 text-primary`).

### B. Panel Flotante (Dropdown Surface)
*   **Posicionamiento:** Relativo a su botón padre, cayendo hacia abajo y anclado a un lado (`absolute mt-3 w-64 z-[100] origin-top-right`).
*   **Superficie y Contorno:** Efecto de cristal oscuro (`bg-background/95 backdrop-blur-md`), bordes afilados sin redondear (`rounded-none`), borde perimetral sutil (`border border-border`) y sombra pronunciada (`shadow-2xl`).
*   **Aparición Cinemática:** Debe entrar escalando y deslizando sutilmente desde su origen (`animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200 ease-out`).

### C. Cabecera del Panel (Panel Header)
*   Contenedor separado del contenido por una línea física inferior (`mb-4 pb-2 border-b border-border`).
*   **Título:** Tipografía extremadamente pequeña, espaciada y en cursiva (`text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic`).
*   **Botón de Descarte:** Control `X` diminuto para cerrar manualmente el menú, atenuado al reposo.

### D. Segmentos de Opciones (Language & Theme Segments)
Cada bloque de opciones (Idioma, Tema) debe estar encabezado por una etiqueta identificativa.
*   **Etiqueta de Bloque:** Debe destacar en el color primario indicando la categoría técnica (`flex items-center gap-2 text-[9px] font-bold text-primary uppercase tracking-widest mb-3`).
*   **Botones de Selección (Toggles):**
    *   Formato base: `px-3 py-2 text-[10px] font-bold uppercase border rounded-none`.
    *   **Estado Activo (ON):** Iluminado en el tono primario con un fondo muy diluido (`bg-primary/10 border-primary/30 text-primary`). Debe incluir un icono de confirmación (`Check`) a la derecha.
    *   **Estado Inactivo (OFF):** Completamente atenuado, simulando un botón apagado (`bg-white/[0.02] border-border hover:bg-white/5 text-muted-foreground`).

### E. Desconexión Segura (Federated Signout)
*   Aislado del resto de opciones de configuración visual por un separador físico grueso (`mt-6 pt-4 border-t border-border`).
*   **Estética de Alerta Destructiva:** Se tiñe de tonalidades rojas de advertencia (`bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20`). El radio de borde sigue la ley global de contornos afilados (`rounded-none`).

### F. Sello de Telemetría (Version Footer)
*   Métrica final centrada en la base del menú que certifica el identificador del sistema.
*   **Formato:** Extremadamente microscópico (`text-[8px] font-mono uppercase tracking-[0.3em] text-muted-foreground/30`).

---

## 🗃️ 10. Anatomía de las Tarjetas Operativas (Data & Operational Cards)

Para la presentación de cuadrículas de información, entidades de dominio (exámenes, módulos, tenants) o métricas accionables, el ecosistema utiliza un formato de tarjeta estructurado de "alta legibilidad técnica" que separa estrictamente la información narrativa de los metadatos de máquina y de las acciones operativas.

### A. Contenedor Físico Principal (Card Shell)
Las tarjetas deben evocar terminales físicas independientes, descartando redondear las esquinas y apostando por bordes finos.
*   **Geometría y Composición:** `group relative p-8 flex flex-col justify-between min-h-[300px] overflow-hidden rounded-none`.
*   **Material:** Efecto de cristal esmerilado con fondo de superficie estándar (`bg-card backdrop-blur-sm`).
*   **Interacción Activa:** Borde sutil en reposo (`border border-border`) que "se enciende" tenuemente al hacer hover (`hover:border-primary/40`).
*   **Animación Constante:** Transición extendida y suave para otorgar sensación de inercia pesada (`transition-all duration-500`).

### B. Marca de Agua Decorativa (Watermark Indicator)
Si la tarjeta forma parte de un índice o listado secuencial, es mandatorio integrar una marca de agua inerte en el fondo.
*   **Posicionamiento:** Pegada arriba a la derecha (`absolute top-0 right-0 p-4`).
*   **Tipografía y Visibilidad:** Letras gigantes en formato código de máquina y casi invisibles (`opacity-5 font-mono text-7xl font-black`).
*   **Reacción Visual:** La marca parpadea sutilmente en reposo (`animate-pulse`) y eleva ligeramente su opacidad cuando el ratón interactúa con la tarjeta padre (`group-hover:opacity-10 transition-opacity`).

### C. Bloque Narrativo Superior (Header & Description)
Área destinada a la lectura rápida para humanos.
*   **Título Principal:** Tamaño imponente, rudo y condensado (`text-2xl font-bold mb-3 uppercase tracking-tight text-foreground`).
*   **Descripción Contextual:** Tipografía legible y relajada (`text-sm text-muted-foreground mb-6 leading-relaxed`).

### D. Bandeja de Metadatos (Technical Footer)
Este bloque se ancla en la parte inferior de la tarjeta, actuando como una "pantalla de logs" de los datos técnicos antes del botón de ejecución.
*   **Separación:** Debe existir una barrera física cortante entre el texto y la bandeja (`border-t border-border pt-4 mb-6`).
*   **Estructura de Datos:** Formato flex con separación (`flex gap-4`).
*   **Visualización de Máquina:** Tipografía extremadamente reducida en monospace, atenuada como información secundaria (`text-[9px] font-mono uppercase text-muted-foreground/50`).
*   **Destaque:** Los valores críticos o estados (ej. Modo de penalización) deben iluminarse (`text-primary`).

### E. Área de Ejecución Táctica (Action Trigger)
*   **Geometría del Botón:** Expansión completa y altura masiva para impacto visual (`w-full h-14`).
*   **Casing:** Acción en código mayúsculas de consola.
*   **Colores y Estados:** Utilización de variables nativas de la consola técnica (ej. `btn-primary-console` o variaciones secundarias de inyección pura).

### F. Variante B: Tarjetas de Administración con Acciones Múltiples
Para los paneles de control maestros (ej. Tenant Governance) donde las entidades no solo se abren o lanzan, sino que se editan, eliminan o configuran (CRUD). Mantiene el chasis idéntico a la tarjeta base (cristal esmerilado, proporciones masivas, bordes afilados `rounded-none`), pero introduce dos modificaciones estructurales clave:

1.  **Iconografía de Marca de Agua (Watermark Icon)**
    *   El icono identificativo del módulo o entidad sustituye al índice numérico secuencial.
    *   **Posicionamiento:** Anclado arriba a la derecha de forma absoluta (`absolute top-0 right-0 p-6`).
    *   **Visibilidad Estética:** Se renderiza a gran escala y se funde con el fondo. Usa tamaño masivo (`w-24 h-24` o `size={96}`), opacidad extremadamente reducida (`opacity-5 group-hover:opacity-10 transition-opacity`) e inercia física (`pointer-events-none text-foreground`).
2.  **Consola de Ejecución Fragmentada (Split Action Block)**
    *   El área de ejecución táctica inferior deja de ser un solo bloque macizo (`w-full`) para convertirse en un panel de control empaquetado y modular.
    *   **Contenedor:** Una fila flexible con separación micrométrica (`flex gap-2 h-14`).
    *   **Acción Maestra (Main Trigger):** Toma la mayor parte de la pantalla comprimiéndose con el resto (`flex-1 btn-primary-console h-full`).
    *   **Bloque de Operaciones Secundarias (Action Bar):** Los iconos de acciones secundarias (Editar, Eliminar, Configurar) se encajonan en módulos cuadrados perfectos contiguos al botón principal. 
    *   **Clases de Botón de Operación:** Cubos precisos e incoloros (`w-14 h-full flex items-center justify-center border border-border bg-muted/10 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-95`). Para acciones destructivas, el hover mutará al color de emergencia (`hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500`).

---
**Certificado: SYS_READY (Instrumentation Layer v2.0 - Symmetric Multi-Tenant Standard)**
