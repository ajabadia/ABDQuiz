# ABDQuiz: Industrial Instrumentation Style Guide

Esta guía define la estética de **instrumentación técnica** de ABDQuiz. Se aleja de los patrones comerciales de SaaS para adoptar un lenguaje de consola de alta precisión.

## 🎨 Paleta de Colores (Instrumentation Set)
- **Background**: `#0a0a0b` (Negro abisal).
- **Surface**: `#161618` (Zinc oscuro).
- **Primary (Cyan)**: `#00d6e6`. Relegado a **señal de precisión**: progreso, indicadores técnicos y bordes de acción principal.
- **Secondary (Ámbar)**: `#d97706`. Reservado para la acción de **Navegación / Salto** (`Bypass Task`). Proporciona visibilidad sin competir con el flujo principal.
- **Foreground**: `#f4f4f5` (Gris ceniza nítido).

## ⚖️ Leyes de Hierro Visuales

### 1. Jerarquía Cromática
- **Foco Único**: Nunca dos colores saturados compitiendo. El ojo debe ir al contenido, luego a la acción.
- **Señal, no Decorado**: El color solo existe para comunicar estado o importancia funcional.

### 2. Componentes de Mando (Buttons)
- **Primary Console**: No es un bloque de color. Es una pieza técnica con borde Cyan al 50-70%, fondo oscuro y texto Cyan. El relleno solo aparece al hover.
- **Skip Console**: Usa el acento Ámbar en borde y texto. Es visible pero no dominante.
- **Acciones Neutras**: Sin color. Se integran en el fondo mediante bordes sutiles.

### 3. Tipografía y Datos
- **Geist Sans**: Para lectura de enunciados y explicaciones.
- **Geist Mono**: Obligatorio para IDs, cronómetros y toda métrica cuantitativa.
- **Sharp Edges**: Radio de borde `0.15rem`. Todo debe parecer mecanizado, no moldeado.

## 📐 Estructura de Pantalla
- **Content First**: El enunciado de la pregunta debe dominar visualmente por tamaño (`3xl`) y peso, no por color.
- **Console Footer**: Las acciones finales se agrupan en un bloque técnico con desenfoque de fondo, simulando una consola superpuesta.

---

## 🛠️ Estándar de Construcción (Fire Rules)

Para garantizar la mantenibilidad, el sistema ejecuta un auditor automático (`abd-audit.ps1`) que impone las siguientes reglas:

### 1. Descomposición Atómica (FIRE:MAX_LINES)
- **Límite:** Máximo **150 líneas** por componente/archivo.
- **Razón:** Forzar la modularidad y evitar "Mega-Componentes" difíciles de testear.

### 2. Internacionalización Total (FIRE:I18N_VIOLATION)
- **Regla:** Prohibido el uso de strings literales en JSX. Todo texto debe usar `useTranslations`.

### 3. Accesibilidad Nativa (FIRE:A11Y_VIOLATION)
- **Imágenes:** Atributo `alt` obligatorio.
- **Botones:** `aria-label` obligatorio si el botón no contiene texto directo.
- **Semántica:** Uso obligatorio de landmarks HTML5 (`main`, `nav`, `section`, etc.).

### 4. Pureza Estructural (FIRE:NO_EMBEDDED_CSS/SCRIPTS)
- **CSS:** Prohibido `<style>`. Estilo solo vía Tailwind o CSS global.
- **Scripts:** Prohibido `<script>` embebido. Usar `next/script`.
- **Centralización:** Prohibido importar archivos `.css` locales. Todo emana de `src/styles/` o `globals.css`.

---
**Certificado: SYS_READY (Instrumentation Layer v1.2)**
