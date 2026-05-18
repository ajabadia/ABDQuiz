'use client';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Layers } from 'lucide-react';

interface RulesCardProps {
  questionCount: number;
  passThreshold: number;
  globalTimeLimitSeconds: number;
  maxAttempts: number;
  onChange: (fields: {
    questionCount?: number;
    passThreshold?: number;
    globalTimeLimitSeconds?: number;
    maxAttempts?: number;
  }) => void;
  translations: {
    rules: string;
    questionCountLabel: string;
    questionCountDesc: string;
    passThresholdLabel: string;
    passThresholdDesc: string;
    globalTimeLabel: string;
    globalTimeDesc: string;
  };
}

export function RulesCard({
  questionCount,
  passThreshold,
  globalTimeLimitSeconds,
  maxAttempts,
  onChange,
  translations,
}: RulesCardProps) {
  return (
    <Card className="p-8 bg-card/30 border-border rounded-none flex flex-col gap-6">
      <div className="flex items-center gap-3 mb-2">
        <Layers className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold uppercase tracking-tight italic">
          {translations.rules}
        </h2>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-widest font-mono">
              {translations.questionCountLabel}
            </Label>
            <p className="text-[9px] text-muted-foreground uppercase">
              {translations.questionCountDesc}
            </p>
          </div>
          <Input
            type="number"
            value={questionCount}
            onChange={(e) => onChange({ questionCount: parseInt(e.target.value) || 0 })}
            className="w-20 rounded-none bg-background/50 border-border text-right font-mono text-foreground"
          />
        </div>

        <Separator className="bg-border" />

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-widest font-mono">
              {translations.passThresholdLabel}
            </Label>
            <p className="text-[9px] text-muted-foreground uppercase">
              {translations.passThresholdDesc}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={passThreshold}
              onChange={(e) => onChange({ passThreshold: parseInt(e.target.value) || 0 })}
              className="w-20 rounded-none bg-background/50 border-border text-right font-mono text-foreground"
            />
            <span className="text-xs font-mono text-muted-foreground">%</span>
          </div>
        </div>

        <Separator className="bg-border" />

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-widest font-mono">
              {translations.globalTimeLabel}
            </Label>
            <p className="text-[9px] text-muted-foreground uppercase">
              {translations.globalTimeDesc}
            </p>
          </div>
          <Input
            type="number"
            value={globalTimeLimitSeconds}
            onChange={(e) => onChange({ globalTimeLimitSeconds: parseInt(e.target.value) || 0 })}
            className="w-24 rounded-none bg-background/50 border-border text-right font-mono text-foreground"
          />
        </div>

        <Separator className="bg-border" />

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1 flex-1">
            <Label htmlFor="maxAttempts" className="text-[10px] uppercase tracking-widest font-mono">
              Límite de Intentos
            </Label>
            <p className="text-[9px] text-muted-foreground uppercase">
              Número máximo de simulacros permitidos (0 = ilimitados).
            </p>
          </div>
          <Input
            id="maxAttempts"
            type="number"
            value={maxAttempts}
            onChange={(e) => onChange({ maxAttempts: parseInt(e.target.value) || 0 })}
            className="w-24 rounded-none bg-background/50 border-border text-right font-mono focus-visible:ring-primary/50 text-foreground"
          />
        </div>
      </div>
    </Card>
  );
}
