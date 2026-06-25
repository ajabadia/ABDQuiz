/**
 * @purpose Gestiona un esquema y modelo de Mongoose para una factura, incluyendo campos para ID del inquilino, número de factura, fechas de período, estado, moneda, montos, items y metadatos.
 * @purpose_en Defines a Mongoose schema and model for an invoice, including fields for tenant ID, invoice number, period dates, status, currency, amounts, items, and metadata.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:45ofow
 * @lastUpdated 2026-06-25T09:20:01.411Z
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice extends Document {
  tenantId: string;
  invoiceNumber: string;
  periodStart: Date;
  periodEnd: Date;
  issuedAt: Date;
  paidAt?: Date;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  currency: string;
  totalAmount: number;
  taxAmount: number;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  metadata?: Record<string, unknown>;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    tenantId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    issuedAt: { type: Date, default: Date.now },
    paidAt: { type: Date },
    status: { type: String, enum: ['pending', 'paid', 'overdue', 'cancelled'], default: 'pending', index: true },
    currency: { type: String, default: 'EUR' },
    totalAmount: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    items: [{
      description: { type: String, required: true },
      quantity: { type: Number, required: true },
      unitPrice: { type: Number, required: true },
      total: { type: Number, required: true },
    }],
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default (mongoose.models.Invoice as mongoose.Model<IInvoice>) || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
