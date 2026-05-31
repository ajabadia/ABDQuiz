'use client';

import { LabeledField } from '@ajabadia/styles';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Settings2 } from 'lucide-react';

interface BasicInfoCardProps {
  name: string;
  description: string;
  onChange: (fields: { name?: string; description?: string }) => void;
  translations: {
    basicInfo: string;
    examName: string;
  };
}

export function BasicInfoCard({
  name,
  description,
  onChange,
  translations,
}: BasicInfoCardProps) {
  return (
    <Card className="p-8 bg-card/30 border-border rounded-none flex flex-col gap-6">
      <div className="flex items-center gap-3 mb-2">
        <Settings2 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold uppercase tracking-tight italic">
          {translations.basicInfo}
        </h2>
      </div>

      <div className="grid gap-6">
        <LabeledField id="name" label={translations.examName} required labelClassName="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          <Input
            value={name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="rounded-none bg-background/50 border-border h-12 focus-visible:ring-primary/50 text-foreground"
            placeholder="Ej: Simulacro Oficial Módulo 1"
          />
        </LabeledField>

        <LabeledField id="description" label="Descripción (Opcional)" labelClassName="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          <textarea
            value={description}
            onChange={(e) => onChange({ description: e.target.value })}
            className="w-full min-h-[100px] bg-background/50 border border-border p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground"
            placeholder="Detalles adicionales sobre el propósito de esta evaluación..."
          />
        </LabeledField>
      </div>
    </Card>
  );
}
