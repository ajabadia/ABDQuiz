import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Interfaz ligera de solo lectura para consultar Spaces provenientes de ABDtenantGobernance.
 * No incluye lógica de escritura ni creación — ABDQuiz solo necesita validar pertenencia
 * y leer metadatos organizativos.
 */
export interface ISpaceLite extends Document {
  tenantId: string;
  name: string;
  slug: string;
  type: 'TENANT' | 'TEAM' | 'PERSONAL';
  parentSpaceId?: string;
  materializedPath?: string;
  collaborators: {
    subjectId: string;
    subjectType: 'USER' | 'GROUP';
    role: 'VIEWER' | 'EDITOR' | 'ADMIN';
    propagates: boolean;
  }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SpaceLiteSchema = new Schema<ISpaceLite>(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    type: { type: String, enum: ['TENANT', 'TEAM', 'PERSONAL'], default: 'TEAM' },
    parentSpaceId: { type: String, index: true },
    materializedPath: { type: String, index: true },
    collaborators: [
      {
        subjectId: { type: String, required: true },
        subjectType: { type: String, enum: ['USER', 'GROUP'], default: 'USER' },
        role: { type: String, enum: ['VIEWER', 'EDITOR', 'ADMIN'], default: 'VIEWER' },
        propagates: { type: Boolean, default: true }
      }
    ],
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

import { getTenantModel } from '@/lib/database/tenant-model';

/**
 * Modelo de solo lectura para consultar Spaces.
 * Apunta a la misma colección 'Space' que ABDtenantGobernance,
 * permitiendo a ABDQuiz validar pertenencia y obtener metadatos
 * sin duplicar lógica de escritura ni creación.
 */
const Space: Model<ISpaceLite> = getTenantModel<ISpaceLite>('Space', SpaceLiteSchema);

export default Space;
