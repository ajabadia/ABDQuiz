/**
 * @purpose Gestiona el proceso de generación y firma de certificados para usuarios que completan cursos.
 * @purpose_en Manages the generation and signing of certificates for users completing courses.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:2,imports:5,sig:1d88iyb
 * @lastUpdated 2026-06-26T10:03:25.409Z
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';
import { connectDB } from '@ajabadia/satellite-sdk/db';
import { logger } from '@ajabadia/satellite-sdk/logger';
import TenantSigningKey from '@/models/TenantSigningKey';

export interface CertificateData {
  tenantId: string;
  userDisplayName: string;
  courseName: string;
  issuedAt: Date;
  certId: string;
}

export class CertificateService {
  static async generatePdf(data: CertificateData): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    const page = doc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    const border = 30;
    page.drawRectangle({
      x: border, y: border,
      width: width - 2 * border,
      height: height - 2 * border,
      borderColor: rgb(0.2, 0.2, 0.2),
      borderWidth: 2,
    });

    const innerBorder = 38;
    page.drawRectangle({
      x: innerBorder, y: innerBorder,
      width: width - 2 * innerBorder,
      height: height - 2 * innerBorder,
      borderColor: rgb(0.6, 0.6, 0.6),
      borderWidth: 0.5,
    });

    page.drawText('CERTIFICADO DE APROBACION', {
      x: width / 2 - 140, y: height - 120,
      size: 22, font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText('Certificate of Completion', {
      x: width / 2 - 90, y: height - 148,
      size: 14, font,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText('Otorgado a / Awarded to', {
      x: width / 2 - 72, y: height - 210,
      size: 11, font,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText(data.userDisplayName, {
      x: width / 2 - 150, y: height - 260,
      size: 24, font: bold,
      color: rgb(0.05, 0.05, 0.1),
    });

    page.drawText('Por completar satisfactoriamente el curso', {
      x: width / 2 - 120, y: height - 310,
      size: 11, font,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText(data.courseName, {
      x: width / 2 - 120, y: height - 350,
      size: 16, font: bold,
      color: rgb(0.1, 0.1, 0.2),
    });

    const dateStr = data.issuedAt.toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    page.drawText(`Fecha / Date: ${dateStr}`, {
      x: width / 2 - 90, y: height - 420,
      size: 10, font,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText(`ID: ${data.certId}`, {
      x: width / 2 - 60, y: height - 445,
      size: 8, font,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText('Firma Digital / Digital Signature', {
      x: 70, y: 120,
      size: 9, font: bold,
      color: rgb(0.3, 0.3, 0.3),
    });

    return doc.save();
  }

  static async getOrCreateTenantKey(tenantId: string): Promise<{ publicKey: string; privateKey: string }> {
    await connectDB();
    const existing = await TenantSigningKey.findOne({ tenantId }).lean();
    if (existing) {
      const raw = Buffer.from(existing.encryptedPrivateKey, 'hex');
      const iv = raw.subarray(0, 16);
      const tag = raw.subarray(-16);
      const encryptedData = raw.subarray(16, -16);
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(process.env.CERTIFICATE_ENCRYPTION_KEY || fallbackKey(), 'hex'),
        iv,
      );
      decipher.setAuthTag(tag);
      const privateKey = decipher.update(encryptedData) + decipher.final('utf8');
      return { publicKey: existing.publicKey, privateKey };
    }

    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(process.env.CERTIFICATE_ENCRYPTION_KEY || fallbackKey(), 'hex'),
      iv,
    );
    const encrypted = Buffer.concat([cipher.update(privateKey, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const encryptedPrivateKey = Buffer.concat([iv, encrypted, tag]).toString('hex');

    await TenantSigningKey.create({
      tenantId,
      publicKey,
      encryptedPrivateKey,
      algorithm: 'rsa-2048',
    });

    return { publicKey, privateKey };
  }

  static signPdf(pdfBytes: Uint8Array, privateKey: string): { hash: string; signature: string } {
    const hash = crypto.createHash('sha256').update(pdfBytes).digest('hex');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(hash);
    const signature = sign.sign(privateKey, 'base64');
    return { hash, signature };
  }

  static verifySignature(pdfBytes: Uint8Array, signature: string, publicKey: string): boolean {
    const hash = crypto.createHash('sha256').update(pdfBytes).digest('hex');
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(hash);
    return verify.verify(publicKey, signature, 'base64');
  }
}

function fallbackKey(): string {
  return crypto.createHash('sha256').update('ABD_CERTIFICATE_FALLBACK_KEY_2026').digest('hex');
}
