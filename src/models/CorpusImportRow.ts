/**
 * @purpose Gestiona un esquema de Mongoose y modelo para rastrear filas en importaciones de corpus, incluyendo su estado, errores y datos asociados a preguntas.
 * @purpose_en Defines a Mongoose schema and model for tracking rows in corpus imports, including their status, errors, and associated question data.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:a9fssg
 * @lastUpdated 2026-06-23T19:52:02.971Z
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICorpusImportRow extends Document {
  corpusImportId: mongoose.Types.ObjectId;
  rowNumber: number;
  status: 'valid' | 'invalid' | 'duplicate';
  errorMessages: string[];
  questionHash?: string;
  questionId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const CorpusImportRowSchema = new Schema<ICorpusImportRow>({
  corpusImportId: { type: Schema.Types.ObjectId, ref: 'CorpusImport', required: true, index: true },
  rowNumber: { type: Number, required: true },
  status: { type: String, enum: ['valid', 'invalid', 'duplicate'], required: true },
  errorMessages: [{ type: String }],
  questionHash: { type: String },
  questionId: { type: Schema.Types.ObjectId, ref: 'Question' }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

CorpusImportRowSchema.index({ corpusImportId: 1, rowNumber: 1 });

import { getTenantModel } from '@ajabadia/satellite-sdk';

const CorpusImportRow: Model<ICorpusImportRow> = getTenantModel<ICorpusImportRow>('CorpusImportRow', CorpusImportRowSchema);

export default CorpusImportRow;
