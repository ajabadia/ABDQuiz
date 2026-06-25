/**
 * @purpose Gestiona el arrastre y soltar de archivos.
 * @purpose_en Handles the upload of attachments for quiz attempts.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:8wh8tt
 * @lastUpdated 2026-06-25T09:18:35.114Z
 */

'use server';

import { getIndustrialSession } from '@ajabadia/satellite-sdk/auth-middleware';
import { connectDB, withTenantContext } from '@ajabadia/satellite-sdk/db';
import { logger } from '@ajabadia/satellite-sdk/logger';
import { resolveTargetTenantContext } from '@ajabadia/satellite-sdk/utils';
import { revalidatePath } from 'next/cache';
import { fetchWithRetry } from '@/lib/fetchWithRetry';
import { DevelopmentAttachmentSchema } from '@ajabadia/satellite-sdk/contracts';

const FILES_URL = process.env.ABD_FILES_URL || 'http://localhost:5005';
const INTERNAL_SECRET = process.env.ABD_INTERNAL_SECRET || '';

export async function uploadAttachmentAction(
  formData: FormData,
  attemptId: string,
  questionId: string,
  tenantIdParam?: string
) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    try {
      await connectDB();
      const session = await getIndustrialSession();

      if (!session?.user?.id || !session?.user?.tenantId) {
        throw new Error('Unauthorized');
      }

      const activeTenantId = explicitCtx?.tenantId || session.user.tenantId;

      const file = formData.get('file') as File | null;
      if (!file) {
        return { success: false, error: 'No se proporcionó ningún archivo' };
      }

      const validation = DevelopmentAttachmentSchema.safeParse({
        size: file.size,
        mimeType: file.type,
        name: file.name,
      });

      if (!validation.success) {
        const messages = validation.error.issues.map(i => i.message).join(', ');
        return { success: false, error: messages };
      }

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('tenantId', activeTenantId);

      const headers: Record<string, string> = {};
      if (INTERNAL_SECRET) {
        headers['x-internal-secret'] = INTERNAL_SECRET;
      }

      const response = await fetchWithRetry(`${FILES_URL}/api/v1/documents`, {
        method: 'POST',
        headers,
        body: uploadFormData,
        retries: 3,
        retryDelay: 1000,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Error desconocido');
        throw new Error(`Error al subir archivo a ABDFiles: ${errorText}`);
      }

      const result = await response.json();
      const attachmentUrl: string = result.url || result.storageRef;

      await logger.audit({
        appId: 'ABDQuiz',
        tenantId: activeTenantId,
        action: 'ATTACHMENT_UPLOADED',
        entityType: 'ATTACHMENT',
        entityId: `${attemptId}_${questionId}`,
        userId: session.user.id,
        userEmail: session.user.email || '',
        changedFields: { fileName: file.name, fileSize: file.size },
      });

      revalidatePath('/');

      return { success: true, attachmentUrl, fileName: file.name };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('[uploadAttachmentAction]', msg);
      return {
        success: false,
        error: msg,
        fallbackHint: 'Puedes intentar subir el archivo más tarde desde la corrección del profesor',
      };
    }
  }, explicitCtx);
}
