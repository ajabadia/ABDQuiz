'use client';

/**
 * @purpose Renderiza una forma para el manejo del estado de remediacio en masa.
 * @purpose_en Renders a form for bulk remediation state management, including fields for module, source, and difficulty level.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:wedw4c
 * @lastUpdated 2026-06-23T17:40:57.622Z
 */

import { LabeledField } from '@ajabadia/styles';
import { useTranslations } from 'next-intl';

interface BulkData {
  modulo: string;
  fuente: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface BulkRemediationStateProps {
  bulkData: BulkData;
  onDataChange: (data: BulkData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  isUploading: boolean;
}

export function BulkRemediationState({
  bulkData,
  onDataChange,
  onSubmit,
  onBack,
  isUploading
}: BulkRemediationStateProps) {
  const ap = useTranslations('adminPortal');

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 animate-in fade-in">
      <div className="space-y-2">
        <h2 className="text-lg font-black uppercase tracking-tight italic text-primary">
          {ap('bulkRemedTitle')}
        </h2>
        <p className="text-[10px] text-muted-foreground uppercase leading-relaxed font-mono">
          {ap('bulkRemedDesc')}
        </p>
      </div>

      <div className="h-[1px] bg-border w-full" />

      <div className="grid gap-6">
        
        <LabeledField id="bulk-module" label={ap('bulkLabelModule')} required labelClassName="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          <input 
            type="text" 
            value={bulkData.modulo}
            onChange={(e) => onDataChange({ ...bulkData, modulo: e.target.value })}
            placeholder="Ej: Redes y Protocolos"
            className="input-console h-12"
          />
        </LabeledField>

        <LabeledField id="bulk-source" label={ap('bulkLabelSource')} required labelClassName="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          <input 
            type="text" 
            value={bulkData.fuente}
            onChange={(e) => onDataChange({ ...bulkData, fuente: e.target.value })}
            placeholder="Ej: Certificación Oficial 2024"
            className="input-console h-12"
          />
        </LabeledField>

        <LabeledField id="bulk-difficulty" label={ap('bulkLabelDifficulty')} labelClassName="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          <select 
            value={bulkData.difficulty}
            onChange={(e) => onDataChange({ ...bulkData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
            className="input-console h-12 uppercase"
          >
            <option value="easy">{ap('diffEasy')}</option>
            <option value="medium">{ap('diffMedium')}</option>
            <option value="hard">{ap('diffHard')}</option>
          </select>
        </LabeledField>

      </div>

      <div className="flex gap-4 mt-6">
        <button 
          type="button" 
          onClick={onBack}
          aria-label={ap('btnBack')}
          className="w-1/3 border border-border hover:bg-muted text-[10px] uppercase font-bold tracking-widest font-mono h-12"
        >
          {ap('btnBack')}
        </button>
        <button 
          type="submit" 
          disabled={isUploading}
          aria-label={ap('btnApply')}
          className="btn-primary-console flex-1 h-12 cursor-pointer"
        >
          {isUploading ? ap('btnSaving') : ap('btnApply')}
        </button>
      </div>
    </form>
  );
}
