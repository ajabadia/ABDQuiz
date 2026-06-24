/**
 * @purpose Gestiona un esquema y modelo de Mongoose para el manejo de claves de firma de inquilino, incluyendo ID del inquilino, clave pública, clave privada cifrada, algoritmo y fechas.
 * @purpose_en Defines a Mongoose schema and model for managing tenant signing keys, including tenant ID, public key, encrypted private key, algorithm, and timestamps.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:15r7tsj
 * @lastUpdated 2026-06-24T12:53:00.148Z
 */

import { Schema, Document } from 'mongoose';
import { getTenantModel } from '@ajabadia/satellite-sdk';

export interface ITenantSigningKey extends Document {
  tenantId: string;
  publicKey: string;
  encryptedPrivateKey: string;
  algorithm: string;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSigningKeySchema = new Schema<ITenantSigningKey>({
  tenantId: { type: String, required: true, unique: true, index: true },
  publicKey: { type: String, required: true },
  encryptedPrivateKey: { type: String, required: true },
  algorithm: { type: String, required: true, default: 'rsa-2048' },
}, { timestamps: true });

export default getTenantModel<ITenantSigningKey>('TenantSigningKey', TenantSigningKeySchema);
