/**
 * @purpose Gestiona la generación y recuperación de certificados para cursos dentro de un inquilino.
 * @purpose_en ** Manages the generation and retrieval of certificates for courses within a tenant.
 * @refactorable ** true (contains business logic and async operations)
 * @classification ** Business Service
 * @complexity ** Medium
 * @fingerprint exports:4,imports:7,sig:16gg9h1
 * @lastUpdated 2026-06-24T12:54:21.748Z
 */

'use server';

import crypto from 'crypto';
import { getIndustrialSession } from '@ajabadia/satellite-sdk/auth-middleware';
import { connectDB, withTenantContext } from '@ajabadia/satellite-sdk/db';
import { logger } from '@ajabadia/satellite-sdk/logger';
import Certificate from '@/models/Certificate';
import Course from '@/models/Course';
import { CertificateService, type CertificateData } from '@/services/certificate/CertificateService';
import { getStudentCourseProgressAction } from '@/actions/course-progress';
import { revalidatePath } from 'next/cache';

export async function generateCertificateAction(courseId: string) {
  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();
      if (!session?.user?.id) return { success: false as const, error: 'No autorizado' };

      const course = await Course.findById(courseId).select('name').lean();
      if (!course) return { success: false as const, error: 'Curso no encontrado' };

      const progress = await getStudentCourseProgressAction();
      if (!progress.success || !progress.data) {
        return { success: false as const, error: 'No se pudo verificar el progreso' };
      }

      const courseProgress = progress.data.courses.find((c) => c.courseId === courseId);
      if (!courseProgress) {
        return { success: false as const, error: 'No tienes progreso registrado en este curso' };
      }

      const mastered = courseProgress.objectives.filter((o) => o.status === 'mastered').length;
      if (mastered < courseProgress.objectives.length) {
        return { success: false as const, error: 'Debes completar todos los objetivos del curso' };
      }

      const tenantId = session.user?.tenantId || 'unknown';
      const existing = await Certificate.findOne({
        tenantId,
        userId: session.user.id,
        courseId,
        revokedAt: { $exists: false },
      }).lean();

      if (existing) {
        return {
          success: true as const,
          data: { certId: existing._id.toString(), courseName: existing.courseName },
          message: 'Ya existe un certificado para este curso',
        };
      }

      const certId = crypto.randomUUID();
      const key = await CertificateService.getOrCreateTenantKey(tenantId);

      const pdfData: CertificateData = {
        tenantId,
        userDisplayName: session.user.name || session.user.email || 'Estudiante',
        courseName: course.name,
        issuedAt: new Date(),
        certId,
      };

      const pdfBytes = await CertificateService.generatePdf(pdfData);
      const { hash, signature } = CertificateService.signPdf(pdfBytes, key.privateKey);

      await Certificate.create({
        tenantId,
        userId: session.user.id,
        userEmail: session.user.email || '',
        userDisplayName: pdfData.userDisplayName,
        courseId,
        courseName: pdfData.courseName,
        pdfHash: hash,
        signature,
        publicKey: key.publicKey,
        algorithm: 'rsa-2048',
        issuedAt: new Date(),
      });

      await logger.audit({
        tenantId,
        action: 'CERTIFICATE_GENERATED',
        entityType: 'COURSE',
        entityId: courseId,
        userId: session.user.id,
        userEmail: session.user.email || 'system@abd.com',
        changedFields: { certId, courseName: pdfData.courseName },
      });

      revalidatePath('/[locale]/dashboard', 'page');

      return { success: true as const, data: { certId, courseName: pdfData.courseName } };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[CERTIFICATE] generateCertificateAction Error:', msg);
      return { success: false as const, error: msg };
    }
  });
}

export async function verifyCertificateAction(certId: string) {
  try {
    await connectDB();
    const cert = await Certificate.findById(certId).lean();
    if (!cert) return { success: false as const, error: 'Certificado no encontrado' };

    if (cert.revokedAt) {
      return { success: false as const, error: 'Certificado revocado', revokedAt: cert.revokedAt };
    }

    return {
      success: true as const,
      data: {
        userDisplayName: cert.userDisplayName,
        courseName: cert.courseName,
        issuedAt: cert.issuedAt,
        algorithm: cert.algorithm,
        certId: cert._id.toString(),
      },
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false as const, error: msg };
  }
}

export async function getMyCertificatesAction() {
  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();
      if (!session?.user?.id) return { success: false as const, error: 'No autorizado' };

      const certs = await Certificate.find({
        userId: session.user.id,
        revokedAt: { $exists: false },
      })
        .sort({ issuedAt: -1 })
        .select('courseName issuedAt')
        .lean();

      return {
        success: true as const,
        data: certs.map((c) => ({
          _id: c._id.toString(),
          courseName: c.courseName,
          issuedAt: c.issuedAt,
        })),
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false as const, error: msg };
    }
  });
}

export async function downloadCertificateAction(certId: string) {
  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();
      if (!session?.user?.id) return { success: false as const, error: 'No autorizado' };

      const cert = await Certificate.findById(certId).lean();
      if (!cert) return { success: false as const, error: 'Certificado no encontrado' };

      if (cert.userId !== session.user.id) {
        return { success: false as const, error: 'No autorizado' };
      }

      const pdfBytes = await CertificateService.generatePdf({
        tenantId: cert.tenantId,
        userDisplayName: cert.userDisplayName,
        courseName: cert.courseName,
        issuedAt: cert.issuedAt,
        certId: cert._id.toString(),
      });

      const base64 = Buffer.from(pdfBytes).toString('base64');

      return { success: true as const, data: { pdfBase64: base64, courseName: cert.courseName } };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false as const, error: msg };
    }
  });
}
