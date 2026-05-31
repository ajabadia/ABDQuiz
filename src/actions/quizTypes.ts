export interface SerializedAttempt {
  _id: string;
  userId: string;
  mode: 'training' | 'mock';
  score: number;
  percentage: number;
  startedAt: string;
  endedAt?: string;
  status: 'in_progress' | 'completed' | 'timeout';
  isInvalidated?: boolean;
  invalidatedBy?: string;
  invalidatedAt?: string;
  examConfigId?: {
    _id: string;
    name: string;
    passThreshold: number;
  };
}
