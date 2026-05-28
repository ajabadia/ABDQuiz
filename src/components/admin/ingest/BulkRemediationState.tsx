'use client';

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
        
        <div className="space-y-2">
          <label htmlFor="bulk-module" className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            {ap('bulkLabelModule')}
          </label>
          <input 
            id="bulk-module"
            type="text" 
            value={bulkData.modulo}
            onChange={(e) => onDataChange({ ...bulkData, modulo: e.target.value })}
            required
            placeholder="Ej: Redes y Protocolos"
            className="input-console h-12"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="bulk-source" className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            {ap('bulkLabelSource')}
          </label>
          <input 
            id="bulk-source"
            type="text" 
            value={bulkData.fuente}
            onChange={(e) => onDataChange({ ...bulkData, fuente: e.target.value })}
            required
            placeholder="Ej: Certificación Oficial 2024"
            className="input-console h-12"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="bulk-difficulty" className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            {ap('bulkLabelDifficulty')}
          </label>
          <select 
            id="bulk-difficulty"
            value={bulkData.difficulty}
            onChange={(e) => onDataChange({ ...bulkData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
            className="input-console h-12 uppercase"
          >
            <option value="easy">{ap('diffEasy')}</option>
            <option value="medium">{ap('diffMedium')}</option>
            <option value="hard">{ap('diffHard')}</option>
          </select>
        </div>

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
