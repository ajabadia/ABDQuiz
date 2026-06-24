/**
 * @purpose Gestiona el extraer y renderizar variables de prompt en plantillas de inteligencia artificial.
 * @purpose_en Manages the extraction and rendering of prompt variables in AI templates.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:1mnk11x
 * @lastUpdated 2026-06-24T12:53:04.791Z
 */

export function extractPromptVariables(template: string): string[] {
  const vars: string[] = [];
  const re = /\{\{(.*?)\}\}/g;
  let match;

  while ((match = re.exec(template)) !== null) {
    const cleanVar = match[1].trim();
    if (cleanVar) {
      vars.push(cleanVar);
    }
  }

  return Array.from(new Set(vars));
}

export function renderPromptTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] || `{{${key}}}`);
}
