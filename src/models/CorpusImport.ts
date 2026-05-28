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
