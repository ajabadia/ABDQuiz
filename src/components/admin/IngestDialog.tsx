'use client';

import { useState, useRef } from 'react';
import { importCorpusAction } from '@/actions/corpus';
import { toast } from 'sonner';
import { FileJson, FileSpreadsheet, Upload, X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ImportDialogProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function ImportDialog({ onSuccess, onClose }: ImportDialogProps) {
  const t = useTranslations('admin');
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState<'json' | 'csv'>('json');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setSourceType(selectedFile.name.toLowerCase().endsWith('.json') ? 'json' : 'csv');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sourceType', sourceType);

    try {
      const result = await importCorpusAction(formData);
      if (result.success && result.data) {
        toast.success(t('importSuccess', { count: result.data.validRows }));
        onSuccess();
        onClose();
      } else {
        toast.error(t('importError', { error: result.error || 'Unknown Error' }));
      }
    } catch (err) {
      console.error('[IngestDialog] Upload failure:', err);
      toast.error(t('techFailure'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="w-full max-w-xl bg-background border border-white/10 p-8 flex flex-col gap-8 shadow-2xl relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t('reset')}
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="space-y-2">
          <h2 id="modal-title" className="text-xl font-black uppercase tracking-tighter italic">
            {t('ingestNewBank').split(' ')[0]} <span className="text-primary">{t('ingestNewBank').split(' ').slice(1).join(' ')}</span>
          </h2>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            {t('selectSource')}
          </p>
        </div>

        <div 
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
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
            onChange={handleFileChange} 
            className="hidden" 
            accept=".json,.csv"
          />
        </div>

        {file && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/5">
              {sourceType === 'json' ? <FileJson className="w-8 h-8 text-yellow-500" aria-hidden="true" /> : <FileSpreadsheet className="w-8 h-8 text-green-500" aria-hidden="true" /> }
              <div className="flex-1">
                <div className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">{t('detectedType')}: {sourceType.toUpperCase()}</div>
                <div className="text-xs font-bold uppercase">{file.name}</div>
              </div>
            </div>

            <button 
              onClick={handleUpload}
              disabled={isUploading}
              className="btn-primary-console w-full h-14"
              aria-busy={isUploading}
              aria-label={t('startIngestion')}
            >
              {isUploading ? t('ingesting') : t('startIngestion')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
