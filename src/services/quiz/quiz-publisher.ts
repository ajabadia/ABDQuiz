import { createPublisher, SystemEventType } from '@ajabadia/satellite-sdk/event-bus';

const publisher = createPublisher({ source: 'abdquiz' });

export async function publishAttemptStarted(
  attemptId: string,
  tenantId: string,
  userId: string,
  examConfigId: string
): Promise<void> {
  const eventId = await publisher.publish(SystemEventType.QUIZ_ATTEMPT_STARTED, {
    attemptId,
    tenantId,
    userId,
    examConfigId,
  });
  if (process.env.NODE_ENV === 'development') {
    console.log('[EVENT_BUS] Published QUIZ_ATTEMPT_STARTED', { eventId, attemptId });
  }
}

export async function publishAttemptCompleted(
  attemptId: string,
  tenantId: string,
  userId: string
): Promise<void> {
  const eventId = await publisher.publish(SystemEventType.QUIZ_ATTEMPT_COMPLETED, {
    attemptId,
    tenantId,
    userId,
  });
  if (process.env.NODE_ENV === 'development') {
    console.log('[EVENT_BUS] Published QUIZ_ATTEMPT_COMPLETED', { eventId, attemptId });
  }
}
