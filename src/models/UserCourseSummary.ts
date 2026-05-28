import mongoose, { Schema, Document } from 'mongoose';
import { getTenantModel } from '@ajabadia/satellite-sdk';

export interface IUserCourseSummary extends Document {
  tenantId: string;
  userId: string;
  courseId: mongoose.Types.ObjectId;
  courseName: string;
  completedAssignments: number;
  totalAssignments: number;
  averageGrade: number; // Percentage 0 to 100
  timeSpentSeconds: number; // Total time spent in course exams
  lastAttemptAt?: Date;
  status: 'not_started' | 'in_progress' | 'completed';
  weakModules: string[]; // Modules identified for reinforcement
}

const UserCourseSummarySchema = new Schema<IUserCourseSummary>(
  {
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, required: true, index: true },
    courseName: { type: String, required: true },
    completedAssignments: { type: Number, default: 0 },
    totalAssignments: { type: Number, default: 0 },
    averageGrade: { type: Number, default: 0 },
    timeSpentSeconds: { type: Number, default: 0 },
    lastAttemptAt: { type: Date },
    status: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started', index: true },
    weakModules: [String]
  },
  { timestamps: true }
);

UserCourseSummarySchema.index({ tenantId: 1, courseId: 1, averageGrade: -1 });

export default getTenantModel<IUserCourseSummary>('UserCourseSummary', UserCourseSummarySchema);
