/**
 * @purpose Gestiona el exportación de datos del usuario para cumplir con la normativa GDPR.
 * @purpose_en Manages the export of user data for GDPR compliance in ABDQuiz.
 * @refactorable false
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:g6k9av
 * @lastUpdated 2026-06-26T06:17:54.880Z
 */

import { connectDB, getTenantConnection } from '@ajabadia/satellite-sdk/db';
import JSZip from 'jszip';

export class GDPRService {
  static async exportUserData(tenantId: string, userId: string, email?: string): Promise<Uint8Array> {
    await connectDB();
    const conn = getTenantConnection(tenantId, 'COLLECTION_PREFIX');

    const modelNames = [
      'ExamAttempt', 'ExamIncident', 'Allegation', 'Certificate',
      'ExamAssignment', 'UserCourseSummary', 'UserLeitnerState',
      'CorpusImport', 'QuizUserRole',
    ] as const;

    const data: Record<string, unknown> = {
      tenantId,
      userId,
      exportedAt: new Date().toISOString(),
    };

    for (const name of modelNames) {
      const model = conn.models[name];
      if (!model) continue;

      let records: unknown[];
      if (name === 'ExamIncident') {
        records = await model.find({ tenantId, $or: [{ userId }, { studentId: userId }] }).lean();
      } else if (name === 'CorpusImport') {
        records = await model.find({ tenantId, createdByUserId: userId }).lean();
      } else {
        records = await model.find({ tenantId, userId }).lean();
      }

      if (email && (name === 'Certificate' || name === 'Allegation' || name === 'ExamAssignment')) {
        const emailRecords = await model.find({ tenantId, userEmail: email }).lean();
        const existingIds = new Set(records.map((r) => String((r as Record<string, unknown>)._id)));
        for (const r of emailRecords) {
          if (!existingIds.has(String((r as Record<string, unknown>)._id))) {
            records.push(r);
          }
        }
      }

      data[name] = records;
    }

    const zip = new JSZip();
    zip.file('user_data.json', JSON.stringify(data, null, 2));
    zip.file('README.txt', `ABDQuiz GDPR Data Export
==============================================
Tenant ID: ${tenantId}
User ID: ${userId}
Export Date: ${new Date().toISOString()}

Contents:
- user_data.json: quiz attempts, certificates, assignments, and other user-related data.

This file contains your personal data as stored in the ABDQuiz system.
`);

    const buffer = await zip.generateAsync({ type: 'uint8array' });
    return buffer;
  }
}
