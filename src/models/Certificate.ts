/**
 * @purpose Proporciona una plantilla para un esquema de mongoose y modelo de certificado, incluyendo campos como tenantId, userId, userEmail, courseId, courseName, pdfHash, firma, clave pública, algoritmo, fecha de emisión, fecha de vencimiento, fecha de revocación, fecha de creación y fecha de actualización.
 * @purpose_en Defines a Mongoose schema and model for certificates, including fields like tenantId, userId, userEmail, courseId, courseName, pdfHash, signature, publicKey, algorithm, issuedAt, expiresAt, revokedAt, createdAt, and updatedAt.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1s6gzi6
 * @lastUpdated 2026-06-24T12:52:52.411Z
 */

import { Schema, Document } from 'mongoose';
import { getTenantModel } from '@ajabadia/satellite-sdk';

export interface ICertificate extends Document {
  tenantId: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  courseId: string;
  courseName: string;
  pdfHash: string;
  signature: string;
  publicKey: string;
  algorithm: string;
  issuedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateSchema = new Schema<ICertificate>({
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  userEmail: { type: String, required: true },
  userDisplayName: { type: String, required: true },
  courseId: { type: String, required: true },
  courseName: { type: String, required: true },
  pdfHash: { type: String, required: true },
  signature: { type: String, required: true },
  publicKey: { type: String, required: true },
  algorithm: { type: String, required: true },
  issuedAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date },
  revokedAt: { type: Date },
}, { timestamps: true });

CertificateSchema.index({ tenantId: 1, userId: 1, courseId: 1 });

export default getTenantModel<ICertificate>('Certificate', CertificateSchema);
