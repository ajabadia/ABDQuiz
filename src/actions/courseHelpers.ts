/**
 * @purpose Gestiona la serialización de datos del curso y proporciona una función para encontrar un curso por ID.
 * @purpose_en Manages the serialization of course data and provides a function to find a course by ID.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:3,imports:1,sig:19wxvr6
 * @lastUpdated 2026-06-24T08:20:38.043Z
 */

import Course, { type ICourseObjective } from '@/models/Course';

export interface SerializedCourse {
  _id: string;
  tenantId: string;
  spaceId: string;
  name: string;
  description?: string;
  tags: string[];
  learningPath: { examConfigId: string; prerequisites: string[] }[];
  objectives?: ICourseObjective[];
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function serializeCourse(doc: Record<string, unknown>): SerializedCourse {
  const rawLP = doc.learningPath as Record<string, unknown>[] | undefined;
  return {
    _id: (doc._id as { toString(): string }).toString(),
    tenantId: doc.tenantId as string,
    spaceId: doc.spaceId as string,
    name: doc.name as string,
    description: doc.description as string | undefined,
    tags: (doc.tags as string[]) || [],
    objectives: (doc.objectives as ICourseObjective[]) || undefined,
    learningPath: (rawLP || []).map((entry) => ({
      examConfigId: (entry.examConfigId as { toString(): string })?.toString() || '',
      prerequisites: ((entry.prerequisites as unknown[]) || []).map(
        (p) => (p as { toString(): string })?.toString() || ''
      ),
    })),
    active: doc.active as boolean,
    createdBy: doc.createdBy as string,
    createdAt: (doc.createdAt as Date)?.toISOString() || '',
    updatedAt: (doc.updatedAt as Date)?.toISOString() || '',
  };
}

export async function findCourseOrThrow(id: string, tenantId: string) {
  const course = await Course.findById(id);
  if (!course) throw new Error('Curso no encontrado');
  return course;
}
