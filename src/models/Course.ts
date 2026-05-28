import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICourse extends Document {
  tenantId: string;
  spaceId: string; // ID de Space (proveniente de ABDtenantGobernance)
  name: string;
  description?: string;
  tags: string[];
  learningPath: {
    examConfigId: mongoose.Types.ObjectId;
    prerequisites: mongoose.Types.ObjectId[]; // Exámenes que deben aprobarse previamente
  }[];
  active: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    tenantId: { type: String, required: true, index: true },
    spaceId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    tags: [String],
    learningPath: [
      {
        examConfigId: { type: Schema.Types.ObjectId, ref: 'ExamConfig', required: true },
        prerequisites: [{ type: Schema.Types.ObjectId, ref: 'ExamConfig' }]
      }
    ],
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
);

// Índice compuesto: cursos activos dentro de un mismo espacio
CourseSchema.index({ spaceId: 1, active: 1 });

import { getTenantModel } from '@ajabadia/satellite-sdk';

const Course: Model<ICourse> = getTenantModel<ICourse>('Course', CourseSchema);

export default Course;
