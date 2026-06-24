/**
 * @purpose Gestiona un modelo de Mongoose para acceso lector solo a espacios en la base de datos ABDtenantGobernance, adecuado para validar la membresía y recuperar metadata organizativa.
 * @purpose_en Defines a Mongoose model for reading-only access to spaces in the ABDtenantGobernance database, suitable for validating membership and retrieving organizational metadata.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:t4vhql
 * @lastUpdated 2026-06-23T23:23:19.530Z
 */

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

import { getTenantModel } from '@ajabadia/satellite-sdk';

/**
 * Modelo de solo lectura para consultar Spaces.
 * Apunta a la misma colección 'Space' que ABDtenantGobernance,
 * permitiendo a ABDQuiz validar pertenencia y obtener metadatos
 * sin duplicar lógica de escritura ni creación.
 */
const Space: Model<ISpaceLite> = getTenantModel<ISpaceLite>('Space', SpaceLiteSchema);

export default Space;
