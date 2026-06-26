'use client';

/**
 * @purpose Gestiona y renderiza la interfaz del usuario para un quiz, incluyendo la presentación de preguntas, navegación, retroalimentación y envío.
 * @purpose_en Manages and renders the user interface for a quiz, including question display, navigation, feedback, and submission.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:18,sig:h48cza
 * @lastUpdated 2026-06-26T10:02:41.264Z
 */

import { useState, useRef } from 'react';
import { useQuizTimeout } from '@/hooks/useQuizTimeout';
import { useQuizFinish } from '@/hooks/useQuizFinish';
import { useQuizTimerOrchestrator } from '@/hooks/useQuizTimerOrchestrator';
import { useQuizQuestionState } from '@/hooks/useQuizQuestionState';
import { QuizHeader } from './QuizHeader';
import QuizQuestion from './QuizQuestion';
import QuizFooter from './QuizFooter';
import { type SerializedExamAttempt } from '@/types/quiz';
import { useTranslations } from 'next-intl';
import { QuizNavigationMap } from './QuizNavigationMap';
import { FinishConfirmDialog } from './FinishConfirmDialog';
import { OmittedDialog } from './OmittedDialog';
import { useQuizHeartbeat } from './useQuizHeartbeat';
import { useQuizNavigation } from './useQuizNavigation';
import { useAIFeedback } from '@/hooks/useAIFeedback';
import { formatTime } from '@/lib/format';
import { IncidentChatDrawer } from './IncidentChatDrawer';

interface QuizInterfaceProps {
  initialAttempt: SerializedExamAttempt;
}

export default function QuizInterface({ initialAttempt }: QuizInterfaceProps) {
  const t = useTranslations('quiz');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Question interaction state (answers, selectedOption, feedback, text)
  const {
    answers,
    setAnswers,
    textAnswers,
    setTextAnswers,
    attachmentUrls,
    setAttachmentUrls,
    selectedOption,
    setSelectedOption,
    showFeedback,
    setShowFeedback,
    handleTextChange,
    handleAttachmentUpload,
  } = useQuizQuestionState(initialAttempt, currentIndex);

  const { aiFeedbackMap, aiFeedbackLoading } = useAIFeedback(showFeedback, currentIndex, initialAttempt._id);

  // Heartbeat (anti-clock tampering)
  useQuizHeartbeat(initialAttempt._id);

  // Finish/submit state (isSubmitting, confirmFinish, finish/omitted dialogs)
  const {
    confirmFinish,
    showFinishConfirm,
    setShowFinishConfirm,
    showOmittedConfirm,
    setShowOmittedConfirm,
    isSubmitting,
    setIsSubmitting,
  } = useQuizFinish(initialAttempt._id, initialAttempt.attemptToken);

  // Ref compartido: creado AQUÍ antes de cualquier consumidor
  const resetTimerRef = useRef<() => void>(() => {});

  // Navigation logic (handleNext, handlePrevious, jumpToQuestion, etc.)
  const {
    jumpToQuestion,
    handleNext,
    handlePrevious,
    handleOptionSelect,
    startOmittedReview,
    isOpenText,
    currentQuestion,
    textAnswer,
  } = useQuizNavigation({
    initialAttempt,
    currentIndex,
    answers,
    textAnswers,
    attachmentUrls,
    selectedOption,
    isSubmitting,
    setCurrentIndex,
    setAnswers,
    setTextAnswers,
    setSelectedOption,
    setIsSubmitting,
    setShowFeedback,
    setShowFinishConfirm,
    setShowOmittedConfirm,
    resetTimerRef,
  });

  // Timeout handlers (depend on handleNext from useQuizNavigation)
  const { handleGlobalTimeout, handleQuestionTimeout } = useQuizTimeout(
    initialAttempt._id,
    initialAttempt.attemptToken,
    showFeedback,
    handleNext,
  );

  const { globalTime, questionTime, isGlobalLow, isQuestionLow } = useQuizTimerOrchestrator({
    totalSeconds: initialAttempt.timeLimitSeconds,
    questionSeconds: initialAttempt.questionTimeLimitSeconds,
    onGlobalTimeout: handleGlobalTimeout,
    onQuestionTimeout: handleQuestionTimeout,
    isPaused: showFinishConfirm || isSubmitting,
    resetTimerRef,
  });

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto w-full px-6 py-4 gap-8">
      <QuizHeader
        currentIndex={currentIndex}
        totalQuestions={initialAttempt.questions.length}
        globalTime={globalTime}
        questionTime={questionTime}
        isGlobalLow={isGlobalLow}
        isQuestionLow={isQuestionLow}
        formatTime={formatTime}
      />

      {/* Non-linear Navigation Map */}
      {initialAttempt.examConfigId?.allowReviewPrevious && (
        <QuizNavigationMap
          questions={initialAttempt.questions}
          currentIndex={currentIndex}
          answers={answers}
          isSubmitting={isSubmitting}
          onJump={jumpToQuestion}
        />
      )}

      <main className="flex-1 overflow-y-auto">
        <QuizQuestion
          qs={currentQuestion.questionSnapshot}
          selectedOption={isOpenText ? null : selectedOption}
          textAnswer={textAnswer}
          onTextChange={handleTextChange}
          showFeedback={showFeedback}
          isSubmitting={isSubmitting}
          onSelect={handleOptionSelect}
          aiFeedback={aiFeedbackMap[currentIndex]}
          aiFeedbackLoading={aiFeedbackLoading[currentIndex]}
          attemptId={initialAttempt._id}
          questionId={currentQuestion.questionId}
          onAttachmentUpload={handleAttachmentUpload}
        />
      </main>

      <QuizFooter
        onNext={() => handleNext(false)}
        onSkip={() => handleNext(true)}
        onShowFeedback={() => setShowFeedback(true)}
        onPrevious={handlePrevious}
        isSubmitting={isSubmitting}
        showFeedback={showFeedback}
        selectedOption={isOpenText ? null : selectedOption}
        mode={initialAttempt.mode === 'mock' ? 'exam' : 'training'}
        isLast={currentIndex === initialAttempt.questions.length - 1}
        allowReviewPrevious={initialAttempt.examConfigId?.allowReviewPrevious}
        hasPrevious={currentIndex > 0}
      />

      <FinishConfirmDialog
        open={showFinishConfirm}
        onOpenChange={setShowFinishConfirm}
        onConfirm={confirmFinish}
        translations={{
          finishTitle: t('finishTitle'),
          finishDescription: t('finishDescription'),
          cancelAction: t('cancelAction'),
          confirmFinish: t('confirmFinish'),
        }}
      />

      <OmittedDialog
        open={showOmittedConfirm}
        onOpenChange={setShowOmittedConfirm}
        onFinalize={() => { setShowOmittedConfirm(false); setShowFinishConfirm(true); }}
        onReview={startOmittedReview}
      />

      <IncidentChatDrawer attemptId={initialAttempt._id} tenantId={initialAttempt.tenantId} />
    </div>
  );
}
