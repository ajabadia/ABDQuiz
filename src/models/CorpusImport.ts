/**
 * @purpose Gestiona un esquema de Mongoose y modelo para administrar datos de importación de corpus, incluyendo información de inquilino, detalles de fuente, seguimiento del estado y conteo de filas.
 * @purpose_en Defines a Mongoose schema and model for managing corpus import data, including tenant information, source details, status tracking, and row counts.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:zspud9
 * @lastUpdated 2026-06-23T19:51:58.592Z
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICorpusImport extends Document {
  tenantId: string;
  createdByUserId: string;
  sourceType: 'json' | 'csv';
  sourceName: string;
  status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed';
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  notes?: string;
  createdAt: Date;
  finishedAt?: Date;
}

const CorpusImportSchema = new Schema<ICorpusImport>({
  tenantId: { type: String, required: true, index: true },
  createdByUserId: { type: String, required: true },
  sourceType: { type: String, enum: ['json', 'csv'], required: true },
  sourceName: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'completed_with_errors', 'failed'],
    default: 'pending'
  },
  totalRows: { type: Number, default: 0 },
  validRows: { type: Number, default: 0 },
  invalidRows: { type: Number, default: 0 },
  duplicateRows: { type: Number, default: 0 },
  notes: { type: String },
  finishedAt: { type: Date }
}, {
  timestamps: true
});

import { getTenantModel } from '@ajabadia/satellite-sdk';

const CorpusImport: Model<ICorpusImport> = getTenantModel<ICorpusImport>('CorpusImport', CorpusImportSchema);

export default CorpusImport;
