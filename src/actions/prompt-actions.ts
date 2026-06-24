/**
 * @purpose Gestiona plantillas de prompt LLM con operaciones CRUD, validación de placeholder, versionamiento inmutable y registro de auditoria.
 * @purpose_en Manages LLM prompt templates with CRUD operations, placeholder validation, immutable versioning, and audit logging.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:5,imports:4,sig:178lq0n
 * @lastUpdated 2026-06-24T10:54:51.055Z
 */

'use server';

import { connectDB, ensureIndustrialAccess, logger, withTenantContext, resolveTargetTenantContext } from '@ajabadia/satellite-sdk';
import PromptTemplate, { type IPromptTemplate } from '@/models/PromptTemplate';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { revalidatePath } from 'next/cache';
import { extractPromptVariables } from '@/services/ai/promptUtils';

export interface PromptTemplateData {
  _id: string;
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  requiredVariables: string[];
  temperature: number;
  version: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

function validateTemplateVariables(template: string): string[] {
  const detected = extractPromptVariables(template);
  const missing: string[] = [];
  for (const variable of detected) {
    if (!template.includes(`{{${variable}}}`)) {
      missing.push(variable);
    }
  }
  return missing;
}

async function getPrompts(tenantId: string) {
  await connectDB();
  const docs = await PromptTemplate.find({})
    .sort({ name: 1, version: -1 })
    .lean();

  return docs.map((d) => ({
    _id: d._id.toString(),
    name: d.name,
    systemPrompt: d.systemPrompt,
    userPromptTemplate: d.userPromptTemplate,
    requiredVariables: d.requiredVariables || [],
    temperature: d.temperature ?? 0.7,
    version: d.version,
    active: d.active,
    createdAt: (d.createdAt as Date)?.toISOString() || '',
    updatedAt: (d.updatedAt as Date)?.toISOString() || '',
  })) satisfies PromptTemplateData[];
}

function serializeDoc(doc: IPromptTemplate): PromptTemplateData {
  return {
    _id: doc._id.toString(),
    name: doc.name,
    systemPrompt: doc.systemPrompt,
    userPromptTemplate: doc.userPromptTemplate,
    requiredVariables: doc.requiredVariables || [],
    temperature: doc.temperature ?? 0.7,
    version: doc.version,
    active: doc.active,
    createdAt: doc.createdAt?.toISOString() || '',
    updatedAt: doc.updatedAt?.toISOString() || '',
  };
}

export async function getPromptTemplatesAction(tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      await ensureIndustrialAccess('ADMIN');
      const activeTenantId = explicitCtx?.tenantId || 'unknown';
      const prompts = await getPrompts(activeTenantId);
      return { success: true, data: prompts };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PROMPT_ACTIONS] getPromptTemplatesAction Error:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

export async function savePromptTemplateAction(data: {
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  requiredVariables?: string[];
  temperature: number;
}, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      const user = await ensureIndustrialAccess('ADMIN');
      const activeTenantId = explicitCtx?.tenantId || user.tenantId;

      await connectDB();

      const autoVariables = extractPromptVariables(data.userPromptTemplate);
      const missing = validateTemplateVariables(data.userPromptTemplate);
      if (missing.length > 0) {
        return {
          success: false,
          error: `Missing required variables in template: ${missing.join(', ')}`,
        };
      }

      const existing = await PromptTemplate.findOne({ name: data.name, active: true });

      if (existing) {
        existing.active = false;
        await existing.save();
      }

      const newPrompt = await PromptTemplate.create({
        name: data.name,
        systemPrompt: data.systemPrompt,
        userPromptTemplate: data.userPromptTemplate,
        requiredVariables: autoVariables,
        temperature: data.temperature ?? 0.7,
        version: existing ? existing.version + 1 : 1,
        active: true,
      });

      await logger.audit({
        tenantId: activeTenantId,
        action: 'PROMPT_TEMPLATE_SAVE',
        entityType: 'CONFIG',
        entityId: newPrompt._id.toString(),
        userId: user.email || 'system',
        userEmail: user.email || 'system@abd.com',
        changedFields: {
          templateName: data.name,
          version: newPrompt.version,
          previousVersion: existing?.version || null,
        },
      });

      revalidatePath('/[locale]/admin/prompts', 'page');

      return { success: true, data: serializeDoc(newPrompt) };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PROMPT_ACTIONS] savePromptTemplateAction Error:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

export async function togglePromptTemplateActiveAction(id: string, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      const user = await ensureIndustrialAccess('ADMIN');
      const activeTenantId = explicitCtx?.tenantId || user.tenantId;

      await connectDB();
      const doc = await PromptTemplate.findById(id);
      if (!doc) {
        return { success: false, error: 'Prompt template not found' };
      }

      doc.active = !doc.active;
      await doc.save();

      await logger.audit({
        tenantId: activeTenantId,
        action: 'PROMPT_TEMPLATE_TOGGLE',
        entityType: 'CONFIG',
        entityId: doc._id.toString(),
        userId: user.email || 'system',
        userEmail: user.email || 'system@abd.com',
        changedFields: { templateName: doc.name, active: doc.active, version: doc.version },
      });

      revalidatePath('/[locale]/admin/prompts', 'page');

      return { success: true, data: serializeDoc(doc) };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PROMPT_ACTIONS] togglePromptTemplateActiveAction Error:', msg);
      return { success: false, error: msg };
    }
  }, explicitCtx);
}

export async function testPromptAction(data: {
  systemPrompt: string;
  userPromptTemplate: string;
  variables: Record<string, string>;
}) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'GEMINI_API_KEY not configured' };
    }

    const rendered = data.userPromptTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) => data.variables[key] || `{{${key}}}`);

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
    });

    const result = await model.generateContent(`${data.systemPrompt}\n\n${rendered}`);
    const text = result.response.text();

    if (!text) {
      return { success: false, error: 'Gemini returned empty response' };
    }

    return { success: true, data: text.trim() };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PROMPT_ACTIONS] testPromptAction Error:', msg);
    return { success: false, error: msg };
  }
}
