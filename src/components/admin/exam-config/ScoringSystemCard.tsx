'use client';

import { LabeledField } from '@ajabadia/styles';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { BarChart } from 'lucide-react';

interface ScoringSystemCardProps {
  scoringMode: 'simple' | 'penalty' | 'weighted';
  pointsPerCorrect: number;
  penaltyPerIncorrect: number;
  difficultyWeights: { easy: number; medium: number; hard: number };
  onChange: (fields: Partial<{
    scoringMode: 'simple' | 'penalty' | 'weighted';
    pointsPerCorrect: number;
    penaltyPerIncorrect: number;
    difficultyWeights: { easy: number; medium: number; hard: number };
  }>) => void;
  translations: {
    scoringSystem: string;
    scoringSimple: string;
    scoringSimpleDesc: string;
    scoringPenalty: string;
    scoringPenaltyDesc: string;
    scoringWeighted: string;
    scoringWeightedDesc: string;
    pointsPerCorrectLabel: string;
    pointsPerCorrectDesc: string;
    penaltyPerIncorrectLabel: string;
    penaltyPerIncorrectDesc: string;
    difficultyWeightsLabel: string;
    weightEasy: string;
    weightMedium: string;
    weightHard: string;
  };
}

export function ScoringSystemCard({
  scoringMode,
  pointsPerCorrect,
  penaltyPerIncorrect,
  difficultyWeights,
  onChange,
  translations,
}: ScoringSystemCardProps) {
  return (
    <Card className="p-8 bg-card/30 border-border rounded-none flex flex-col gap-6">
      <div className="flex items-center gap-3 mb-2">
        <BarChart className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold uppercase tracking-tight italic">
          {translations.scoringSystem}
        </h2>
      </div>

      {/* Grid de Modos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={`p-4 border border-border cursor-pointer transition-all rounded-none ${
            scoringMode === 'simple'
              ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.05)]'
              : 'hover:bg-white/5'
          }`}
          onClick={() => onChange({ scoringMode: 'simple' })}
        >
          <div className="font-bold text-[10px] uppercase tracking-wider mb-1 text-foreground">
            {translations.scoringSimple}
          </div>
          <p className="text-[9px] text-muted-foreground leading-normal uppercase">
            {translations.scoringSimpleDesc}
          </p>
        </div>

        <div
          className={`p-4 border border-border cursor-pointer transition-all rounded-none ${
            scoringMode === 'penalty'
              ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.05)]'
              : 'hover:bg-white/5'
          }`}
          onClick={() => onChange({ scoringMode: 'penalty' })}
        >
          <div className="font-bold text-[10px] uppercase tracking-wider mb-1 text-foreground">
            {translations.scoringPenalty}
          </div>
          <p className="text-[9px] text-muted-foreground leading-normal uppercase">
            {translations.scoringPenaltyDesc}
          </p>
        </div>

        <div
          className={`p-4 border border-border cursor-pointer transition-all rounded-none ${
            scoringMode === 'weighted'
              ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.05)]'
              : 'hover:bg-white/5'
          }`}
          onClick={() => onChange({ scoringMode: 'weighted' })}
        >
          <div className="font-bold text-[10px] uppercase tracking-wider mb-1 text-foreground">
            {translations.scoringWeighted}
          </div>
          <p className="text-[9px] text-muted-foreground leading-normal uppercase">
            {translations.scoringWeightedDesc}
          </p>
        </div>
      </div>

      <Separator className="bg-border" />

      {/* Inputs Condicionales Dinámicos */}
      {(scoringMode === 'simple' || scoringMode === 'penalty') && (
        <LabeledField
          id="pointsPerCorrect"
          label={translations.pointsPerCorrectLabel}
          hint={translations.pointsPerCorrectDesc}
          labelClassName="text-[10px] uppercase tracking-widest text-muted-foreground font-mono"
          className="flex-row items-center gap-6"
        >
          <Input
            type="number"
            step="0.1"
            value={pointsPerCorrect}
            onChange={(e) => onChange({ pointsPerCorrect: parseFloat(e.target.value) || 1 })}
            className="w-24 rounded-none bg-background/50 border-border text-right font-mono focus-visible:ring-primary/50 text-foreground"
          />
        </LabeledField>
      )}

      {scoringMode === 'penalty' && (
        <>
          <Separator className="bg-border" />
          <LabeledField
            id="penaltyPerIncorrect"
            label={translations.penaltyPerIncorrectLabel}
            hint={translations.penaltyPerIncorrectDesc}
            labelClassName="text-[10px] uppercase tracking-widest text-muted-foreground font-mono"
            className="flex-row items-center gap-6"
          >
            <Input
              type="number"
              step="0.1"
              value={penaltyPerIncorrect}
              onChange={(e) => onChange({ penaltyPerIncorrect: parseFloat(e.target.value) || 0 })}
              className="w-24 rounded-none bg-background/50 border-border text-right font-mono focus-visible:ring-primary/50 text-foreground"
            />
          </LabeledField>
        </>
      )}

      {scoringMode === 'weighted' && (
        <div className="space-y-4">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            {translations.difficultyWeightsLabel}
          </Label>
          <div className="grid grid-cols-3 gap-6">
            <LabeledField id="weightEasy" label={translations.weightEasy} labelClassName="text-[9px] uppercase text-muted-foreground tracking-wider font-mono">
              <Input
                type="number"
                step="0.1"
                value={difficultyWeights.easy}
                onChange={(e) =>
                  onChange({
                    difficultyWeights: { ...difficultyWeights, easy: parseFloat(e.target.value) || 1 },
                  })
                }
                className="rounded-none bg-background/50 border-border text-right font-mono focus-visible:ring-primary/50 text-foreground"
              />
            </LabeledField>

            <LabeledField id="weightMedium" label={translations.weightMedium} labelClassName="text-[9px] uppercase text-muted-foreground tracking-wider font-mono">
              <Input
                type="number"
                step="0.1"
                value={difficultyWeights.medium}
                onChange={(e) =>
                  onChange({
                    difficultyWeights: { ...difficultyWeights, medium: parseFloat(e.target.value) || 2 },
                  })
                }
                className="rounded-none bg-background/50 border-border text-right font-mono focus-visible:ring-primary/50 text-foreground"
              />
            </LabeledField>

            <LabeledField id="weightHard" label={translations.weightHard} labelClassName="text-[9px] uppercase text-muted-foreground tracking-wider font-mono">
              <Input
                type="number"
                step="0.1"
                value={difficultyWeights.hard}
                onChange={(e) =>
                  onChange({
                    difficultyWeights: { ...difficultyWeights, hard: parseFloat(e.target.value) || 3 },
                  })
                }
                className="rounded-none bg-background/50 border-border text-right font-mono focus-visible:ring-primary/50 text-foreground"
              />
            </LabeledField>
          </div>
        </div>
      )}
    </Card>
  );
}
