import mongoose, { Schema, Document } from 'mongoose';
import { getTenantModel } from '@ajabadia/satellite-sdk';

export interface ICourseAnalytics extends Document {
  tenantId: string;
  courseId: mongoose.Types.ObjectId;
  totalStudentsEnrolled: number;
  completionRate: number; // Percentage of students who completed the path
  averageGrade: number; // Global average grade of the course
  gradeDistribution: {
    fail: number;      // < 50%
    pass: number;      // 50-70%
    remarkable: number;// 70-90%
    outstanding: number;// > 90%
  };
  learningCurve: {
    date: string; // Formated YYYY-MM-DD
    averageGrade: number;
  }[];
  distractorTelemetry: {
    questionId: string;
    questionText: string;
    totalAttempts: number;
    incorrectRate: number;
    optionsFrequency: {
      optionIndex: number;
      frequency: number; // Selection percentage
    }[];
  }[];
}

const CourseAnalyticsSchema = new Schema<ICourseAnalytics>(
  {
    tenantId: { type: String, required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, required: true, unique: true },
    totalStudentsEnrolled: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    averageGrade: { type: Number, default: 0 },
    gradeDistribution: {
      fail: { type: Number, default: 0 },
      pass: { type: Number, default: 0 },
      remarkable: { type: Number, default: 0 },
      outstanding: { type: Number, default: 0 }
    },
    learningCurve: [
      {
        date: { type: String, required: true },
        averageGrade: { type: Number, required: true }
      }
    ],
    distractorTelemetry: [
      {
        questionId: { type: String, required: true },
        questionText: { type: String, required: true },
        totalAttempts: { type: Number, required: true },
        incorrectRate: { type: Number, required: true },
        optionsFrequency: [
          {
            optionIndex: { type: Number, required: true },
            frequency: { type: Number, required: true }
          }
        ]
      }
    ]
  },
  { timestamps: true }
);

export default getTenantModel<ICourseAnalytics>('CourseAnalytics', CourseAnalyticsSchema);
