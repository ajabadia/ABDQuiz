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

import { getTenantModel } from '@/lib/database/tenant-model';

const CorpusImportRow: Model<ICorpusImportRow> = getTenantModel<ICorpusImportRow>('CorpusImportRow', CorpusImportRowSchema);

export default CorpusImportRow;
