'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, HelpCircle, Target, Pencil, Trash2, Copy, ShieldAlert } from 'lucide-react';
import { type SerializedExamConfig } from '@/types/quiz';
import Link from 'next/link';
import { deleteExamConfigAction, cloneExamConfigAction } from '@/actions/examConfig';
import { toast } from 'sonner';

interface ExamsListProps {
  configs: SerializedExamConfig[];
  locale: string;
}

export default function ExamsList({ configs, locale }: ExamsListProps) {
  const t = useTranslations('admin');

  const handleDelete = async (id: string) => {
    if (!confirm(t('delete') + '?')) return;
    
    const result = await deleteExamConfigAction(id);
    if (result.success) {
      toast.success('Configuración eliminada');
    } else {
      toast.error('Error al eliminar');
    }
  };

  const handleClone = async (id: string) => {
    const result = await cloneExamConfigAction(id);
    if (result.success) {
      toast.success('Configuración clonada con éxito');
    } else {
      toast.error('Error al clonar configuración');
    }
  };

  if (configs.length === 0) {
    return (
      <Card className="p-20 bg-card/10 border-dashed border-white/5 flex flex-col items-center justify-center text-center gap-4 rounded-none">
        <ShieldAlert className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">{t('noConfigs')}</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {configs.map((config) => (
        <Card key={config._id} className="group relative bg-card/40 border-white/5 hover:border-primary/40 transition-all duration-500 overflow-hidden rounded-none p-6 flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight uppercase italic group-hover:text-primary transition-colors">
                {config.name}
              </h3>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                ID: {config._id.slice(-8)} {config.isDefault && <span className="text-primary ml-2">{t('defaultBadge')}</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-primary/10 hover:text-primary" asChild>
                <Link href={`/${locale}/admin/exams/${config._id}/edit`}>
                  <Pencil className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-primary/10 hover:text-primary" onClick={() => handleClone(config._id)} title="Clonar">
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(config._id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono uppercase">{config.questionCount} {t('questionsCount')}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono uppercase">{config.globalTimeLimitSeconds ? `${config.globalTimeLimitSeconds / 60}m` : '∞'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono uppercase">{config.scoringMode}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-3.5 h-3.5 rounded-full border border-primary/40 flex items-center justify-center text-[8px] font-bold">%</div>
              <span className="text-[10px] font-mono uppercase">{config.passThreshold}%</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {config.moduleFilter.length > 0 ? (
              config.moduleFilter.map(m => (
                <Badge key={m} variant="outline" className="rounded-none border-white/10 bg-white/5 text-[8px] font-mono uppercase">
                  {m}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="rounded-none border-white/10 bg-white/5 text-[8px] font-mono uppercase">
                All Modules
              </Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
