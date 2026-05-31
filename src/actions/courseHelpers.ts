import Course from '@/models/Course';

export interface SerializedCourse {
  _id: string;
  tenantId: string;
  spaceId: string;
  name: string;
  description?: string;
  tags: string[];
  learningPath: { examConfigId: string; prerequisites: string[] }[];
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
