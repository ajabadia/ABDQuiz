'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Settings2, 
  Clock, 
  BarChart, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Save
} from 'lucide-react';
import { createExamConfigAction, updateExamConfigAction } from '@/actions/examConfig';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type SerializedExamConfig } from '@/types/quiz';
import { type IExamConfig } from '@/models/ExamConfig';

interface ExamConfigFormProps {
  initialData?: SerializedExamConfig;
  locale: string;
}

export default function ExamConfigForm({ initialData, locale }: ExamConfigFormProps) {
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
    pointsPerCorrect: initialData?.pointsPerCorrect || 1,
    penaltyPerIncorrect: initialData?.penaltyPerIncorrect || 0,
    difficultyWeights: initialData?.difficultyWeights || { easy: 1, medium: 2, hard: 3 },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const action = initialData 
        ? updateExamConfigAction.bind(null, initialData._id) 
        : createExamConfigAction;
      
      const result = await action(formData as unknown as Partial<IExamConfig>);
      
      if (result.success) {
        toast.success('Configuración guardada con éxito');
        router.push(`/${locale}/admin/exams`);
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
          
          {/* Card 1: Info Básica */}
          <Card className="p-8 bg-card/30 border-white/5 rounded-none flex flex-col gap-6">
            <div className="flex items-center gap-3 mb-2">
              <Settings2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold uppercase tracking-tight italic">{t('basicInfo')}</h2>
            </div>
            
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                  {t('examName')}
                </Label>
                <Input 
                  id="name" 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="rounded-none bg-background/50 border-white/10 h-12 focus-visible:ring-primary/50" 
                  placeholder="Ej: Simulacro Oficial Módulo 1"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                  Descripción (Opcional)
                </Label>
                <textarea 
                  id="description" 
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full min-h-[100px] bg-background/50 border border-white/10 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="Detalles adicionales sobre el propósito de esta evaluación..."
                />
              </div>
            </div>
          </Card>

          {/* Card 2: Sistema de Puntuación */}
          <Card className="p-8 bg-card/30 border-white/5 rounded-none flex flex-col gap-6">
            <div className="flex items-center gap-3 mb-2">
              <BarChart className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold uppercase tracking-tight italic">{t('scoringSystem')}</h2>
            </div>

            {/* Grid de Modos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                className={`p-4 border border-white/5 cursor-pointer transition-all rounded-none ${formData.scoringMode === 'simple' ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.05)]' : 'hover:bg-white/5'}`}
                onClick={() => setFormData(prev => ({ ...prev, scoringMode: 'simple' }))}
              >
                <div className="font-bold text-[10px] uppercase tracking-wider mb-1 text-foreground">{t('scoringSimple')}</div>
                <p className="text-[9px] text-muted-foreground leading-normal uppercase">{t('scoringSimpleDesc')}</p>
              </div>

              <div 
                className={`p-4 border border-white/5 cursor-pointer transition-all rounded-none ${formData.scoringMode === 'penalty' ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.05)]' : 'hover:bg-white/5'}`}
                onClick={() => setFormData(prev => ({ ...prev, scoringMode: 'penalty' }))}
              >
                <div className="font-bold text-[10px] uppercase tracking-wider mb-1 text-foreground">{t('scoringPenalty')}</div>
                <p className="text-[9px] text-muted-foreground leading-normal uppercase">{t('scoringPenaltyDesc')}</p>
              </div>

              <div 
                className={`p-4 border border-white/5 cursor-pointer transition-all rounded-none ${formData.scoringMode === 'weighted' ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.05)]' : 'hover:bg-white/5'}`}
                onClick={() => setFormData(prev => ({ ...prev, scoringMode: 'weighted' }))}
              >
                <div className="font-bold text-[10px] uppercase tracking-wider mb-1 text-foreground">{t('scoringWeighted')}</div>
                <p className="text-[9px] text-muted-foreground leading-normal uppercase">{t('scoringWeightedDesc')}</p>
              </div>
            </div>

            <Separator className="bg-white/5" />

            {/* Inputs Condicionales Dinámicos */}
            {(formData.scoringMode === 'simple' || formData.scoringMode === 'penalty') && (
              <div className="flex items-center gap-6">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="pointsPerCorrect" className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{t('pointsPerCorrectLabel')}</Label>
                  <p className="text-[9px] text-muted-foreground uppercase">{t('pointsPerCorrectDesc')}</p>
                </div>
                <Input 
                  id="pointsPerCorrect"
                  type="number"
                  step="0.1"
                  value={formData.pointsPerCorrect}
                  onChange={(e) => setFormData(prev => ({ ...prev, pointsPerCorrect: parseFloat(e.target.value) || 1 }))}
                  className="w-24 rounded-none bg-background/50 border-white/10 text-right font-mono focus-visible:ring-primary/50"
                />
              </div>
            )}

            {formData.scoringMode === 'penalty' && (
              <>
                <Separator className="bg-white/5" />
                <div className="flex items-center gap-6">
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="penaltyPerIncorrect" className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{t('penaltyPerIncorrectLabel')}</Label>
                    <p className="text-[9px] text-muted-foreground uppercase">{t('penaltyPerIncorrectDesc')}</p>
                  </div>
                  <Input 
                    id="penaltyPerIncorrect"
                    type="number"
                    step="0.1"
                    value={formData.penaltyPerIncorrect}
                    onChange={(e) => setFormData(prev => ({ ...prev, penaltyPerIncorrect: parseFloat(e.target.value) || 0 }))}
                    className="w-24 rounded-none bg-background/50 border-white/10 text-right font-mono focus-visible:ring-primary/50"
                  />
                </div>
              </>
            )}

            {formData.scoringMode === 'weighted' && (
              <div className="space-y-4">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{t('difficultyWeightsLabel')}</Label>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="weightEasy" className="text-[9px] uppercase text-muted-foreground tracking-wider font-mono">{t('weightEasy')}</Label>
                    <Input 
                      id="weightEasy"
                      type="number"
                      step="0.1"
                      value={formData.difficultyWeights.easy}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        difficultyWeights: { ...prev.difficultyWeights, easy: parseFloat(e.target.value) || 1 } 
                      }))}
                      className="rounded-none bg-background/50 border-white/10 text-right font-mono focus-visible:ring-primary/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="weightMedium" className="text-[9px] uppercase text-muted-foreground tracking-wider font-mono">{t('weightMedium')}</Label>
                    <Input 
                      id="weightMedium"
                      type="number"
                      step="0.1"
                      value={formData.difficultyWeights.medium}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        difficultyWeights: { ...prev.difficultyWeights, medium: parseFloat(e.target.value) || 2 } 
                      }))}
                      className="rounded-none bg-background/50 border-white/10 text-right font-mono focus-visible:ring-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weightHard" className="text-[9px] uppercase text-muted-foreground tracking-wider font-mono">{t('weightHard')}</Label>
                    <Input 
                      id="weightHard"
                      type="number"
                      step="0.1"
                      value={formData.difficultyWeights.hard}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        difficultyWeights: { ...prev.difficultyWeights, hard: parseFloat(e.target.value) || 3 } 
                      }))}
                      className="rounded-none bg-background/50 border-white/10 text-right font-mono focus-visible:ring-primary/50"
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Columna Derecha: Reglas Operativas */}
        <Card className="p-8 bg-card/30 border-white/5 rounded-none flex flex-col gap-6">
          <div className="flex items-center gap-3 mb-2">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold uppercase tracking-tight italic">{t('rules')}</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-widest font-mono">{t('questionCountLabel')}</Label>
                <p className="text-[9px] text-muted-foreground uppercase">{t('questionCountDesc')}</p>
              </div>
              <Input 
                type="number" 
                value={formData.questionCount}
                onChange={(e) => setFormData(prev => ({ ...prev, questionCount: parseInt(e.target.value) }))}
                className="w-20 rounded-none bg-background/50 border-white/10 text-right font-mono" 
              />
            </div>

            <Separator className="bg-white/5" />

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-widest font-mono">{t('passThresholdLabel')}</Label>
                <p className="text-[9px] text-muted-foreground uppercase">{t('passThresholdDesc')}</p>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  value={formData.passThreshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, passThreshold: parseInt(e.target.value) }))}
                  className="w-20 rounded-none bg-background/50 border-white/10 text-right font-mono" 
                />
                <span className="text-xs font-mono text-muted-foreground">%</span>
              </div>
            </div>

            <Separator className="bg-white/5" />

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-widest font-mono">{t('globalTimeLabel')}</Label>
                <p className="text-[9px] text-muted-foreground uppercase">{t('globalTimeDesc')}</p>
              </div>
              <Input 
                type="number" 
                value={formData.globalTimeLimitSeconds}
                onChange={(e) => setFormData(prev => ({ ...prev, globalTimeLimitSeconds: parseInt(e.target.value) }))}
                className="w-24 rounded-none bg-background/50 border-white/10 text-right font-mono" 
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Panel Inferior: Toggles de Comportamiento */}
      <Card className="p-8 bg-card/20 border-white/5 rounded-none grid grid-cols-1 md:grid-cols-3 gap-8">
        <div 
          className={`p-4 border border-white/5 cursor-pointer transition-colors ${formData.showFeedbackDuringExam ? 'bg-primary/5 border-primary/20' : 'hover:bg-white/5'}`}
          onClick={() => setFormData(prev => ({ ...prev, showFeedbackDuringExam: !prev.showFeedbackDuringExam }))}
        >
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className={`w-4 h-4 ${formData.showFeedbackDuringExam ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="text-[10px] uppercase font-bold tracking-widest">{t('feedbackLabel')}</span>
          </div>
          <p className="text-[9px] text-muted-foreground leading-relaxed uppercase">{t('feedbackDesc')}</p>
        </div>

        <div 
          className={`p-4 border border-white/5 cursor-pointer transition-colors ${formData.allowSkip ? 'bg-primary/5 border-primary/20' : 'hover:bg-white/5'}`}
          onClick={() => setFormData(prev => ({ ...prev, allowSkip: !prev.allowSkip }))}
        >
          <div className="flex items-center gap-3 mb-2">
            <ArrowRight className={`w-4 h-4 ${formData.allowSkip ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="text-[10px] uppercase font-bold tracking-widest">{t('skipLabel')}</span>
          </div>
          <p className="text-[9px] text-muted-foreground leading-relaxed uppercase">{t('skipDesc')}</p>
        </div>

        <div 
          className={`p-4 border border-white/5 cursor-pointer transition-colors ${formData.allowReviewPrevious ? 'bg-primary/5 border-primary/20' : 'hover:bg-white/5'}`}
          onClick={() => setFormData(prev => ({ ...prev, allowReviewPrevious: !prev.allowReviewPrevious }))}
        >
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className={`w-4 h-4 ${formData.allowReviewPrevious ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="text-[10px] uppercase font-bold tracking-widest">{t('reviewLabel')}</span>
          </div>
          <p className="text-[9px] text-muted-foreground leading-relaxed uppercase">{t('reviewDesc')}</p>
        </div>
      </Card>

      <div className="flex justify-end gap-4">
        <Button 
          type="button" 
          variant="ghost" 
          className="rounded-none font-mono text-[10px] tracking-widest uppercase h-12 px-8"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          className="rounded-none font-mono text-[10px] tracking-widest uppercase h-12 px-12 bg-primary hover:bg-primary/90"
          disabled={isSubmitting}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Guardando...' : t('saveConfig')}
        </Button>
      </div>
    </form>
  );
}
