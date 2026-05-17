'use client';

import { FileJson, FileSpreadsheet, Upload, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { RefObject } from 'react';

interface UploadStateProps {
  file: File | null;
  sourceType: 'json' | 'csv';
  isUploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileClick: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStartParsing: () => void;
}

export function UploadState({
  file,
  sourceType,
  isUploading,
  fileInputRef,
  onFileClick,
  onFileChange,
  onStartParsing
}: UploadStateProps) {
  const t = useTranslations('admin');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 id="modal-title" className="text-xl font-black uppercase tracking-tighter italic">
          {t('ingestNewBank').split(' ')[0]} <span className="text-primary">{t('ingestNewBank').split(' ').slice(1).join(' ')}</span>
        </h2>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          {t('selectSource')}
        </p>
      </div>

      <div 
        onClick={onFileClick}
        onKeyDown={(e) => e.key === 'Enter' && onFileClick()}
        role="button"
        tabIndex={0}
        aria-label={t('dragDrop')}
        className="group border-2 border-dashed border-white/10 hover:border-primary/50 bg-white/5 p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all focus:border-primary focus:outline-none"
      >
        {isUploading ? (
          <Loader2 className="w-12 h-12 text-primary animate-spin" aria-hidden="true" />
        ) : (
          <Upload className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true" />
        )}
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-widest block mb-1">
            {file ? file.name : t('dragDrop')}
          </span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest">
            {t('supportedFormats')}
          </span>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onFileChange} 
          className="hidden" 
          accept=".json,.csv"
        />
      </div>

      {file && (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/5">
            {sourceType === 'json' ? (
              <FileJson className="w-8 h-8 text-yellow-500" aria-hidden="true" />
            ) : (
              <FileSpreadsheet className="w-8 h-8 text-green-500" aria-hidden="true" />
            )}
            <div className="flex-1">
              <div className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">
                {t('detectedType')}: {sourceType.toUpperCase()}
              </div>
              <div className="text-xs font-bold uppercase">{file.name}</div>
            </div>
          </div>

          <button 
            type="button"
            onClick={onStartParsing}
            disabled={isUploading}
            aria-busy={isUploading}
            aria-label={t('startIngestion')}
            className="btn-primary-console w-full h-14 cursor-pointer"
          >
            {isUploading ? t('ingesting') : t('startIngestion')}
          </button>
        </div>
      )}
    </div>
  );
}
