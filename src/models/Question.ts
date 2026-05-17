import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuestion extends Document {
  tenantId: string;
  module: string;
  source: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  active: boolean;
  contentHash: string; // Para detección de duplicados
  version: number;
  originImportId?: mongoose.Types.ObjectId; // Trazabilidad al lote de importación
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  tenantId: { type: String, required: true, index: true },
  module: { type: String, required: true, index: true },
  source: { type: String, required: true },
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOptionIndex: { type: Number, required: true },
  explanation: { type: String, default: "" },
  tags: [{ type: String }],
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  active: { type: Boolean, default: true, index: true },
  contentHash: { type: String, required: true, index: true },
  version: { type: Number, default: 1 },
  originImportId: { type: Schema.Types.ObjectId, ref: 'CorpusImport' }
}, {
  timestamps: true
});

// Índice compuesto para evitar duplicados por tenant (exclusivamente para preguntas activas)
QuestionSchema.index(
  { tenantId: 1, contentHash: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);

const Question: Model<IQuestion> = mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);

export default Question;
