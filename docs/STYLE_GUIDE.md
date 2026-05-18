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
**Certificado: SYS_READY (Instrumentation Layer v2.0 - Symmetric Multi-Tenant Standard)**
