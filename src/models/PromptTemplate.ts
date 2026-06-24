/**
 * @purpose Gestiona el esquema y modelo para plantillas de prompt LLM con soporte multi-tenant y versionado.
 * @purpose_en Manages the schema and model for LLM prompt templates with multi-tenant support and versioning.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1m6njn9
 * @lastUpdated 2026-06-24T10:55:31.689Z
 */

import { Schema, Document } from 'mongoose';
import { getTenantModel } from '@ajabadia/satellite-sdk';

export interface IPromptTemplate extends Document {
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  requiredVariables: string[];
  temperature: number;
  version: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromptTemplateSchema = new Schema<IPromptTemplate>({
  name: { type: String, required: true, index: true },
  systemPrompt: { type: String, required: true },
  userPromptTemplate: { type: String, required: true },
  requiredVariables: [{ type: String }],
  temperature: { type: Number, default: 0.7 },
  version: { type: Number, required: true, default: 1 },
  active: { type: Boolean, required: true, default: true },
}, { timestamps: true });

PromptTemplateSchema.index({ name: 1, active: 1 });

export default getTenantModel<IPromptTemplate>('PromptTemplate', PromptTemplateSchema);
