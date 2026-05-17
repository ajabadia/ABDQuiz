'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Copy, Check } from 'lucide-react';

interface TemplateModalProps {
  onClose: () => void;
}

export function TemplateModal({ onClose }: TemplateModalProps) {
  const t = useTranslations('admin');
  const [copied, setCopied] = useState(false);

  const jsonTemplate = `[
  {
    "pregunta": "¿Cuál es el puerto por defecto de HTTPS?",
    "opciones": ["80", "443", "8080", "22"],
    "respuesta_correcta": 1,
    "explicacion": "HTTPS utiliza el puerto 443 para comunicaciones seguras.",
    "modulo": "Redes",
    "fuente": "Examen Oficial 2023",
    "difficulty": "medium",
    "tags": ["protocolos", "seguridad"]
  }
]`;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="template-title">
      <div className="w-full max-w-4xl bg-background border border-white/10 p-8 flex flex-col gap-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t('close')}
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="space-y-2">
          <h2 id="template-title" className="text-xl font-black uppercase tracking-tighter italic">
            {t('templatesTitle')}
          </h2>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            {t('templatesSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Legend Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{t('schemaLegend')}</h3>
            <ul className="text-xs font-mono text-muted-foreground space-y-3">
              <li><span className="text-foreground font-bold">pregunta</span>: {t('typeString')} (min: 10 chars)</li>
              <li><span className="text-foreground font-bold">opciones</span>: {t('typeArrayString')} (min: 2, max: 6)</li>
              <li><span className="text-foreground font-bold">respuesta_correcta</span>: {t('typeInt')} (index 0 a N-1)</li>
              <li><span className="text-foreground font-bold">explicacion</span>: {t('typeString')} ({t('optionalLabel')})</li>
              <li><span className="text-foreground font-bold">modulo</span>: {t('typeString')}</li>
              <li><span className="text-foreground font-bold">fuente</span>: {t('typeString')}</li>
              <li><span className="text-foreground font-bold">difficulty</span>: {t('schemaDifficulty').substring(t('schemaDifficulty').indexOf(':') + 1).trim()}</li>
              <li><span className="text-foreground font-bold">tags</span>: {t('typeArrayString')} ({t('optionalLabel')})</li>
            </ul>
            <div className="mt-4 p-3 bg-primary/5 border border-primary/20 text-[10px] text-primary/80 leading-relaxed italic">
              * {t('answerFlexibilityNote')}
            </div>
          </div>

          {/* JSON Template Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{t('json')}</h3>
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                aria-label={t('copyToClipboard')}
              >
                {copied ? <Check className="w-3 h-3 text-green-500" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
                {copied ? t('copied') : t('copyToClipboard')}
              </button>
            </div>
            <pre className="bg-white/5 border border-white/10 p-4 text-[10px] font-mono text-foreground overflow-x-auto">
              <code>{jsonTemplate}</code>
            </pre>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="btn-primary-console w-full h-12 mt-4"
          aria-label={t('close')}
        >
          {t('close')}
        </button>
      </div>
    </div>
  );
}
