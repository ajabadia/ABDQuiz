/**
 * @purpose Gestiona un esquema de Mongoose y modelo para la entidad Curso en la aplicación ABDQuiz, incluyendo campos para tenantId, spaceId, nombre, descripción, etiquetas, ruta de aprendizaje, estado activo, creado por, creado el, actualizado el.
 * @purpose_en Defines a Mongoose schema and model for the Course entity in the ABDQuiz application, including fields for tenantId, spaceId, name, description, tags, learningPath, active status, createdBy, createdAt, and updatedAt.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:2,imports:2,sig:1aj5xah
 * @lastUpdated 2026-06-24T08:20:58.608Z
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICourseObjective {
  module: string;
  block: string;
  objectives: string[];
}

export interface ICourse extends Document {
  tenantId: string;
  spaceId: string;
  name: string;
  description?: string;
  tags: string[];
  learningPath: {
    examConfigId: mongoose.Types.ObjectId;
    prerequisites: mongoose.Types.ObjectId[];
  }[];
  objectives?: ICourseObjective[];
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
    objectives: [{
      module: { type: String, required: true },
      block: { type: String, required: true },
      objectives: [String]
    }],
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
