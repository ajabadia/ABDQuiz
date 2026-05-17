# Sistema de Parametrización de Exámenes (Exam Parameterization)
**Estado:** `SYS_CERTIFIED` | **Diseño de Arquitectura:** Dynamic Decoupled Blueprint

---

## 1. Introducción y Propósito

El sistema de parametrización de exámenes industrializa el motor de evaluación de ABDQuiz al desacoplar los parámetros de examen de las variables estáticas del código. Permite a los administradores crear, configurar y clonar plantillas de exámenes con reglas operativas específicas, distribución por dificultad y lógicas de puntuación avanzadas.

---

## 2. Modelo de Datos (`ExamConfig`)

La colección `ExamConfig` actúa como el esquema de plantillas o "Blueprints".

### 2.1 Campos Clave del Esquema

- **`tenantId`**: Enlace para garantizar el aislamiento multitenant.
- **`name`** & **`description`**: Identificadores visuales del examen.
- **`questionCount`**: Cantidad total de preguntas a instanciar en cada intento.
- **`moduleFilter`**: Array de módulos admitidos para filtrar las preguntas.
- **`globalTimeLimitSeconds`**: Tiempo total del examen en segundos. Si es `0`, el examen es ilimitado.
- **`questionTimeLimitSeconds`**: Tiempo límite individual por tarea. Si es `0`, es ilimitado.
- **`passThreshold`**: Porcentaje mínimo (0-100) requerido para pasar la evaluación.
- **`scoringMode`**: Tipo de algoritmo de puntuación (`simple`, `penalty`, `weighted`).
- **`pointsPerCorrect`**: Puntuación base por acierto en modos no ponderados.
- **`penaltyPerIncorrect`**: Descuento aplicable en modo `penalty`.
- **`difficultyWeights`**: Pesos en puntos para cada nivel de dificultad en modo `weighted` (`easy`, `medium`, `hard`).
- **`difficultyDistribution`**: Cuotas de preguntas requeridas de cada nivel (`easy`, `medium`, `hard`).
- **`shuffleOptions`**: Booleano que controla si se desordenan las respuestas de cada pregunta.
- **`allowSkip`**: Permite omitir preguntas y resolverlas más tarde.
- **`allowReviewPrevious`**: Permite al usuario retroceder a preguntas anteriores y modificar respuestas.
- **`showFeedbackDuringExam`**: Habilita o deshabilita la explicación inmediata tras marcar una respuesta.
- **`isDefault`**: Flag que marca las configuraciones provistas de forma nativa por el sistema.

---

## 3. Lógica de Generación de Exámenes (`QuizService.createExamAttempt`)

Cuando un usuario inicia un examen, el motor realiza las siguientes tareas de forma secuencial:

1. **Recuperación de Plantilla**: Lee la configuración activa de `ExamConfig`.
2. **Filtrado Modular**: Aplica filtros por módulo (`moduleFilter`) sobre el banco de preguntas activo.
3. **Selección Estratificada**: 
   - Si se define una `difficultyDistribution`, extrae el número de preguntas indicado para cada nivel (`easy`, `medium`, `hard`).
   - El espacio sobrante se completa aleatoriamente con preguntas restantes del set filtrado.
4. **Instanciación y Mezclado**: 
   - Si `shuffleOptions` es verdadero, desordena de forma segura las opciones de cada pregunta y recalcula el nuevo índice de la opción correcta (`correctOptionIndex`) para que la evaluación sea infalible.
5. **Persistencia del Intento**: Crea el intento en `ExamAttempt` registrando el `examConfigId` correspondiente para fines de auditoría histórica.

---

## 4. Algoritmos de Evaluación (`QuizService.finishExam`)

El cálculo de la puntuación al finalizar el examen se evalúa de manera dinámica según el `scoringMode` configurado:

### 4.1 Fórmulas de Puntuación

- **Modo Simple**:
  $$\text{Score} = \text{Aciertos} \times \text{pointsPerCorrect}$$
  
- **Modo Penalty**:
  $$\text{Score} = (\text{Aciertos} \times \text{pointsPerCorrect}) - (\text{Fallos} \times \text{penaltyPerIncorrect})$$
  
- **Modo Weighted**:
  $$\text{Score} = \sum_{q \in \text{correctas}} \text{difficultyWeights}[q.difficulty]$$

La calificación de rendimiento porcentual final se calcula contra la puntuación máxima teórica que podría haber obtenido el estudiante en ese lote específico de preguntas, asegurando la consistencia matemática:

$$\text{Percentage} = \frac{\text{Score}}{\text{Max Possible Score}} \times 100$$

---

## 5. Arquitectura de Interfaz y Navegación No Lineal

### 5.1 Mapa de Navegación Reactivo
Cuando la opción `allowReviewPrevious` está habilitada en la plantilla de examen, la UI de cliente (`QuizInterface`) muestra una botonera secuencial numerada:
- **Estados Visuales**: Cada botón refleja de forma dinámica si la pregunta está activa (borde animado), contestada (color primario atenuado) o vacía.
- **Transición de Alta Integridad**: Para prevenir pérdidas de datos por desconexiones o interrupciones, el cambio de pregunta mediante el mapa de navegación ejecuta automáticamente una llamada en segundo plano a `submitAnswerAction` para guardar el estado actual de la pregunta antes de cargar la siguiente.

### 5.2 Auto-Aprovisionamiento (Seeding Activo)
Para garantizar una experiencia lista para usar (out-of-the-box), la consulta de inicio comprueba si existen configuraciones en el sistema. En caso de no existir ninguna, el orquestador siembra de manera automática dos perfiles base:
- **Entrenamiento Libre**: Retroalimentación inmediata, tiempo ilimitado, y navegación libre.
- **Simulacro Estándar**: Límite estricto de 10 minutos globales, 30s por pregunta, evaluación ciega (sin feedback inmediato) y navegación restringida.

### 5.3 Panel de Parametrización Administrativa (`ExamConfigForm`)
El formulario administrativo incluye un panel interactivo apilado en la columna principal izquierda para configurar las lógicas de puntuación:
- **Modos de Evaluación**: Tres tarjetas seleccionables con retroalimentación visual en tiempo real para los modos `Simple`, `Penalización` (Penalty) y `Ponderado` (Weighted).
- **Campos Condicionales Dinámicos**:
  - *Simple y Penalización:* Muestra de forma inteligente el campo **Puntos por Acierto** (`pointsPerCorrect`).
  - *Penalización:* Revela de manera adicional el campo **Descuento por Error** (`penaltyPerIncorrect`).
  - *Ponderado:* Expone una cuadrícula con tres inputs independientes para definir los pesos en puntos de los niveles **Fácil**, **Medio** y **Difícil** (`difficultyWeights`).

### 5.4 Tolerancia a Fallos y Auto-ajuste de Lote (Defensive Clamping)
Para erradicar errores críticos en tiempo de ejecución (pantallas de error 500) cuando el banco de preguntas activo tiene menos registros de los solicitados por la plantilla del examen, el motor de `QuizService` ejecuta un comportamiento defensivo:
- **Ajuste en Caliente**: Calcula el tamaño real del lote como `targetCount = Math.min(config.questionCount, allQuestions.length)`.
- **Ejecución Fluida**: Extrae de forma segura el máximo de preguntas disponibles, adaptando dinámicamente toda la botonera no lineal, porcentajes de progreso y cálculos de puntuación final de manera consistente.
- **Excepción de Banco Vacío**: Solo se genera una excepción controlada legible en caso de que existan `0` preguntas activas para los filtros seleccionados.

### 5.5 Soporte de Tiempos Infinitos y Simbología `∞`
El motor del temporizador (`useQuizTimer`) y la interfaz táctica (`QuizHeader`) se han optimizado para soportar valores de tiempo `0` como infinitos:
- **Bypass de Cuenta Atrás**: Si el límite global o de pregunta es `0`, el temporizador ignora el ciclo descendente evitando bloqueos de expiración inmediata.
- **Indicador Espectral `∞`**: En lugar de mostrar valores `0:00` o `0S` en configuraciones ilimitadas, el panel visualiza el símbolo **`∞`** en los relojes de misión y TTL de tareas, elevando la experiencia de diseño técnico.

### 5.6 Ingestación de Preguntas con Subsanación Interactiva de Metadatos
Para maximizar la resiliencia en la importación de bancos de preguntas externos (JSON o CSV), el portal de gobernanza implementa un asistente inteligente de remediación del lado del cliente (`ImportDialog`):
- **Análisis Previo e Inspección de Lote**: Antes de realizar cualquier inserción a la base de datos, el archivo se procesa en el navegador. Se comprueba si las preguntas carecen de metadatos críticos (`modulo`, `fuente`, o `difficulty`).
- **Opciones de Resolución Dinámica**:
  - *Aplicar a Todo el Bloque (Bulk)*: Permite ingresar en un único formulario los campos faltantes e inyectarlos de una sola vez a todas las preguntas incompletas del lote.
  - *Completar Secuencialmente (Pregunta a Pregunta)*: Lanza un wizard interactivo paginado. Muestra de forma aislada el **Enunciado** y las **Opciones de Respuesta** de cada pregunta incompleta, habilitando inputs de texto y selectores desplegables para corregir sus metadatos antes de continuar.
  - *Ignorar / Conservar por Defecto*: Sube el corpus omitiendo correcciones, inyectando defaults como `'medium'` para dificultad y genéricos para módulo/fuente.
- **Persistencia Transaccional**: Una vez finalizada la subsanación en el navegador, el lote consolidado y normalizado se envía a través de la acción de servidor `importFinalizedQuestionsAction` para guardarse permanentemente en MongoDB con deduplicación por hash SHA-256.
