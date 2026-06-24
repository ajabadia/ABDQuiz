/**
 * @purpose Gestiona un esquema de Mongoose y modelo para la entidad Pregunta en la aplicación ABDQuiz, incluyendo campos para detalles de pregunta, metadatos y archivos adjuntos.
 * @purpose_en Defines a Mongoose schema and model for the Question entity in the ABDQuiz application, including fields for question details, metadata, and attachments.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1jlzjan
 * @lastUpdated 2026-06-23T23:23:12.858Z
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuestion extends Document {
  tenantId: string;
  type: 'multiple_choice' | 'open_text';
  module: string;
  source: string;
  questionText: string;
  options: string[]; // vacío si type === 'open_text'
  correctOptionIndex: number; // -1 o ignorado si type === 'open_text'
  explanation: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  active: boolean;
  questionTextHash: string; // Hash del enunciado aplanado para colisiones parciales
  optionHashes: string[]; // Hashes individuales aplanados de las opciones (vacío si open_text)
  contentHash: string; // Para detección de duplicados
  version: number;
  spaceId?: string; // ID del Space al que pertenece la pregunta
  courseId?: string; // ID del Course al que pertenece la pregunta
  originImportId?: mongoose.Types.ObjectId; // Trazabilidad al lote de importación
  objective?: number; // Número identificador de objetivo del bloque
  uid?: string; // Identidad inmutable de la pregunta heredada del importador
  /** §12.A — Adjuntos (imágenes, documentos, audio, etc.) */
  attachments?: { url: string; name: string; type: string; size: number }[];
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  tenantId: { type: String, required: true, index: true },
  type: { type: String, enum: ['multiple_choice', 'open_text'], default: 'multiple_choice', index: true },
  module: { type: String, required: true, index: true },
  source: { type: String, required: true },
  questionText: { type: String, required: true },
  options: { type: [String], default: [] },
  correctOptionIndex: { type: Number, default: 0 },
  explanation: { type: String, default: "" },
  tags: [{ type: String }],
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  active: { type: Boolean, default: true, index: true },
  questionTextHash: { type: String, required: true, index: true },
  optionHashes: { type: [String], default: [] },
  contentHash: { type: String, required: true, index: true },
  version: { type: Number, default: 1 },
  spaceId: { type: String },
  courseId: { type: String },
  originImportId: { type: Schema.Types.ObjectId, ref: 'CorpusImport' },
  objective: { type: Number, index: true },
  uid: { type: String, index: true },
  /** §12.A — Adjuntos */
  attachments: [{
    url: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
  }]
}, {
  timestamps: true
});

// Índice compuesto para evitar duplicados por tenant (exclusivamente para preguntas activas)
QuestionSchema.index(
  { tenantId: 1, contentHash: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);

import { getTenantModel } from '@ajabadia/satellite-sdk';

const Question: Model<IQuestion> = getTenantModel<IQuestion>('Question', QuestionSchema);

export default Question;
