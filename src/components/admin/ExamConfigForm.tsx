'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { createExamConfigAction, updateExamConfigAction } from '@/actions/examConfig';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type SerializedExamConfig } from '@/types/quiz';
import { type IExamConfig } from '@/models/ExamConfig';

// Import modular subcomponents
import { BasicInfoCard } from './exam-config/BasicInfoCard';
import { ScoringSystemCard } from './exam-config/ScoringSystemCard';
import { RulesCard } from './exam-config/RulesCard';
import { TogglesCard } from './exam-config/TogglesCard';

interface ExamConfigFormProps {
  initialData?: SerializedExamConfig;
  locale: string;
  tenantId?: string;
}

export default function ExamConfigForm({ initialData, locale, tenantId }: ExamConfigFormProps) {
  const t = useTranslations('admin');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    questionCount: initialData?.questionCount || 30,
    globalTimeLimitSeconds: initialData?.globalTimeLimitSeconds || 600,
    questionTimeLimitSeconds: initialData?.questionTimeLimitSeconds || 30,
    passThreshold: initialData?.passThreshold || 70,
    scoringMode: initialData?.scoringMode || 'simple',
    showFeedbackDuringExam: initialData?.showFeedbackDuringExam ?? false,
    allowSkip: initialData?.allowSkip ?? true,
    allowReviewPrevious: initialData?.allowReviewPrevious ?? false,
    autoAdvanceOnSelect: initialData?.autoAdvanceOnSelect ?? false,
    reviewOmittedQuestions: initialData?.reviewOmittedQuestions ?? false,
    excludePreviouslyCorrect: initialData?.excludePreviouslyCorrect ?? false,
    adaptiveQuestionSelection: initialData?.adaptiveQuestionSelection ?? false,
    maxAttempts: initialData?.maxAttempts || 0,
    pointsPerCorrect: initialData?.pointsPerCorrect || 1,
    penaltyPerIncorrect: initialData?.penaltyPerIncorrect || 0,
    difficultyWeights: initialData?.difficultyWeights || { easy: 1, medium: 2, hard: 3 },
  });

  const backUrl = tenantId ? `/${locale}/admin/exams?tenantId=${tenantId}` : `/${locale}/admin/exams`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const result = initialData 
        ? await updateExamConfigAction(initialData._id, formData as unknown as Partial<IExamConfig>)
        : await createExamConfigAction(formData as unknown as Partial<IExamConfig>, tenantId);
      
      if (result.success) {
        toast.success('Configuración guardada con éxito');
        router.push(backUrl);
      } else {
        toast.error(result.error || 'Error al guardar');
      }
    } catch (error) {
      toast.error('Fallo crítico en la comunicación con el servidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Info Básica y Sistema de Puntuación */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <BasicInfoCard
            name={formData.name}
            description={formData.description}
            onChange={(fields) => setFormData(prev => ({ ...prev, ...fields }))}
            translations={{
              basicInfo: t('basicInfo'),
              examName: t('examName'),
            }}
          />

          <ScoringSystemCard
            scoringMode={formData.scoringMode}
            pointsPerCorrect={formData.pointsPerCorrect}
            penaltyPerIncorrect={formData.penaltyPerIncorrect}
            difficultyWeights={formData.difficultyWeights}
            onChange={(fields) => setFormData(prev => ({ ...prev, ...fields }))}
            translations={{
              scoringSystem: t('scoringSystem'),
              scoringSimple: t('scoringSimple'),
              scoringSimpleDesc: t('scoringSimpleDesc'),
              scoringPenalty: t('scoringPenalty'),
              scoringPenaltyDesc: t('scoringPenaltyDesc'),
              scoringWeighted: t('scoringWeighted'),
              scoringWeightedDesc: t('scoringWeightedDesc'),
              pointsPerCorrectLabel: t('pointsPerCorrectLabel'),
              pointsPerCorrectDesc: t('pointsPerCorrectDesc'),
              penaltyPerIncorrectLabel: t('penaltyPerIncorrectLabel'),
              penaltyPerIncorrectDesc: t('penaltyPerIncorrectDesc'),
              difficultyWeightsLabel: t('difficultyWeightsLabel'),
              weightEasy: t('weightEasy'),
              weightMedium: t('weightMedium'),
              weightHard: t('weightHard'),
            }}
          />
        </div>

        {/* Columna Derecha: Reglas Operativas */}
        <div className="col-span-1">
          <RulesCard
            questionCount={formData.questionCount}
            passThreshold={formData.passThreshold}
            globalTimeLimitSeconds={formData.globalTimeLimitSeconds}
            maxAttempts={formData.maxAttempts}
            onChange={(fields) => setFormData(prev => ({ ...prev, ...fields }))}
            translations={{
              rules: t('rules'),
              questionCountLabel: t('questionCountLabel'),
              questionCountDesc: t('questionCountDesc'),
              passThresholdLabel: t('passThresholdLabel'),
              passThresholdDesc: t('passThresholdDesc'),
              globalTimeLabel: t('globalTimeLabel'),
              globalTimeDesc: t('globalTimeDesc'),
            }}
          />
        </div>
      </div>

      {/* Panel Inferior: Toggles de Comportamiento */}        <TogglesCard
        showFeedbackDuringExam={formData.showFeedbackDuringExam}
        allowSkip={formData.allowSkip}
        allowReviewPrevious={formData.allowReviewPrevious}
        autoAdvanceOnSelect={formData.autoAdvanceOnSelect}
        reviewOmittedQuestions={formData.reviewOmittedQuestions}
        excludePreviouslyCorrect={formData.excludePreviouslyCorrect}
        adaptiveQuestionSelection={formData.adaptiveQuestionSelection}
        onChange={(fields) => setFormData(prev => ({ ...prev, ...fields }))}
        translations={{
          feedbackLabel: t('feedbackLabel'),
          feedbackDesc: t('feedbackDesc'),
          skipLabel: t('skipLabel'),
          skipDesc: t('skipDesc'),
          reviewLabel: t('reviewLabel'),
          reviewDesc: t('reviewDesc'),
          autoAdvanceLabel: t('autoAdvanceLabel'),
          autoAdvanceDesc: t('autoAdvanceDesc'),
          reviewOmittedLabel: t('reviewOmittedLabel'),
          reviewOmittedDesc: t('reviewOmittedDesc'),
          excludeCorrectLabel: t('excludeCorrectLabel'),
          excludeCorrectDesc: t('excludeCorrectDesc'),
          adaptiveLabel: t('adaptiveLabel'),
          adaptiveDesc: t('adaptiveDesc'),
        }}
      />

      <div className="flex justify-end gap-4">
        <Button 
          type="button" 
          variant="ghost" 
          className="rounded-none font-mono text-[10px] tracking-widest uppercase h-12 px-8"
          onClick={() => router.push(backUrl)}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          className="rounded-none font-mono text-[10px] tracking-widest uppercase h-12 px-12 bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={isSubmitting}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Guardando...' : t('saveConfig')}
        </Button>
      </div>
    </form>
  );
}
