'use server';

import { withTenantContext, connectDB, getIndustrialSession, resolveTargetTenantContext } from '@ajabadia/satellite-sdk';
import ExamAttempt from '@/models/ExamAttempt';
import { ensureAdminOrProfessor } from '@/lib/auth/ensureQuizAccess';

export interface ChatMessage {
  sender: 'student' | 'professor';
  text: string;
  createdAt: string;
  read: boolean;
}

/**
 * Send a message on an exam attempt's chat thread.
 * Accessible by: student (owner) or professor/admin.
 */
export async function sendMessageAction(attemptId: string, text: string, tenantIdParam?: string) {
  if (!text.trim()) return { success: false, error: 'El mensaje no puede estar vacío' };

  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    await connectDB();

    // Try professor first, then fall back to student session
    let sender: 'professor' | 'student' = 'student';
    let userId: string;
    let tenantId: string;

    try {
      const admin = await ensureAdminOrProfessor();
      sender = 'professor';
      userId = admin.id;
      tenantId = explicitCtx?.tenantId || admin.tenantId;
    } catch {
      // Not a professor — try student session
      const session = await getIndustrialSession();
      if (!session?.user?.id) {
        return { success: false, error: 'No autorizado' };
      }
      userId = session.user.id;
      tenantId = session.user.tenantId || '';
    }

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) return { success: false, error: 'Intento no encontrado' };

    // Anti-IDOR: student can only message on own attempts
    if (sender === 'student' && attempt.userId !== userId) {
      return { success: false, error: 'No autorizado' };
    }

    // Professor: verify tenant scope
    if (sender === 'professor' && attempt.tenantId !== tenantId) {
      return { success: false, error: 'No autorizado' };
    }

    const message = {
      sender,
      text: text.trim(),
      createdAt: new Date(),
      read: false,
    };

    if (!attempt.messages) attempt.messages = [];
    attempt.messages.push(message);
    await attempt.save();

    return { success: true };
  }, explicitCtx);
}

/**
 * Get messages for an exam attempt.
 * Accessible by: student (owner) or professor/admin.
 */
export async function getMessagesAction(attemptId: string, tenantIdParam?: string): Promise<{ success: boolean; messages?: ChatMessage[]; error?: string }> {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    await connectDB();

    let userId: string;
    let tenantId: string;
    let isProfessor = false;

    try {
      const admin = await ensureAdminOrProfessor();
      isProfessor = true;
      userId = admin.id;
      tenantId = explicitCtx?.tenantId || admin.tenantId;
    } catch {
      const session = await getIndustrialSession();
      if (!session?.user?.id) {
        return { success: false, error: 'No autorizado' };
      }
      userId = session.user.id;
      tenantId = session.user.tenantId || '';
    }

    const attempt = await ExamAttempt.findById(attemptId).lean();
    if (!attempt) return { success: false, error: 'Intento no encontrado' };

    // Anti-IDOR checks
    if (!isProfessor && attempt.userId !== userId) {
      return { success: false, error: 'No autorizado' };
    }
    if (isProfessor && attempt.tenantId !== tenantId) {
      return { success: false, error: 'No autorizado' };
    }

    const rawMessages = attempt.messages as unknown as Array<{ sender: string; text: string; createdAt: Date; read: boolean }> | undefined;
    const messages: ChatMessage[] = (rawMessages || []).map((m) => ({
      sender: m.sender as 'student' | 'professor',
      text: m.text,
      createdAt: m.createdAt.toISOString(),
      read: m.read,
    }));

    return { success: true, messages };
  }, explicitCtx);
}

/**
 * Mark all unread messages as read for a given role.
 */
export async function markMessagesReadAction(attemptId: string, tenantIdParam?: string) {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    await connectDB();

    let userId: string;
    let tenantId: string;
    let isProfessor = false;

    try {
      const admin = await ensureAdminOrProfessor();
      isProfessor = true;
      userId = admin.id;
      tenantId = explicitCtx?.tenantId || admin.tenantId;
    } catch {
      const session = await getIndustrialSession();
      if (!session?.user?.id) return { success: false, error: 'No autorizado' };
      userId = session.user.id;
      tenantId = session.user.tenantId || '';
    }

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) return { success: false, error: 'Intento no encontrado' };

    if (!isProfessor && attempt.userId !== userId) return { success: false, error: 'No autorizado' };
    if (isProfessor && attempt.tenantId !== tenantId) return { success: false, error: 'No autorizado' };

    if (attempt.messages) {
      for (const m of attempt.messages) {
        // Student marks professor messages as read; professor marks student messages as read
        if ((!isProfessor && m.sender === 'professor') || (isProfessor && m.sender === 'student')) {
          (m as unknown as { read: boolean }).read = true;
        }
      }
      await attempt.save();
    }

    return { success: true };
  }, explicitCtx);
}

/**
 * Count exam attempts that have unread student chat messages for the
 * authenticated professor/admin within their tenant scope.
 */
export async function getUnreadChatCountAction(tenantIdParam?: string): Promise<number> {
  const explicitCtx = await resolveTargetTenantContext(tenantIdParam);

  return withTenantContext(async () => {
    await connectDB();

    const admin = await ensureAdminOrProfessor();
    const tenantId = explicitCtx?.tenantId || admin.tenantId;

    const count = await ExamAttempt.countDocuments({
      tenantId,
      gradingStatus: { $in: ['pending_manual_review', 'auto_graded', 'manually_graded'] },
      'messages': {
        $elemMatch: {
          sender: 'student',
          read: false,
        },
      },
    });

    return count;
  }, explicitCtx);
}
