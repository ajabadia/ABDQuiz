'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { getQuestionsAction } from '@/actions/question';
import { Search, Edit2, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { QuestionEditorModal } from './QuestionEditorModal';

interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

interface QuestionItem {
  _id: string;
  questionText: string;
  module: string;
  source: string;
  difficulty: 'easy' | 'medium' | 'hard';
  active: boolean;
  version: number;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  tags: string[];
  attachments?: Attachment[];
}

interface QuestionsManagerProps {
  tenantId?: string;
}

export default function QuestionsManager({ tenantId }: QuestionsManagerProps) {
  const t = useTranslations('questions');
  const common = useTranslations('common');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [filters, setFilters] = useState({ page: 1, search: '', difficulty: '', active: 'true', module: '' });
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionItem | null>(null);

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeFilter = filters.active === 'all' ? undefined : filters.active === 'true';
      const res = await getQuestionsAction({
        page: filters.page,
        limit: 10,
        search: filters.search || undefined,
        difficulty: (filters.difficulty as 'easy' | 'medium' | 'hard') || undefined,
        active: activeFilter,
        module: filters.module || undefined
      }, tenantId);
      if (res.success && res.data) {
        const mapped: QuestionItem[] = res.data.questions.map(q => ({
          _id: String(q._id),
          questionText: q.questionText,
          module: q.module,
          source: q.source,
          difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
          active: q.active,
          version: q.version,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation || '',
          tags: q.tags || [],
          attachments: q.attachments || []
        }));
        setQuestions(mapped);
        setPagination({ total: res.data.total, pages: res.data.pages });
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters, tenantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQuestions().catch(console.error);
  }, [fetchQuestions]);

  return (
    <div className="flex flex-col gap-6">
      {selectedQuestion && (
        <QuestionEditorModal
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          onSuccess={() => { setSelectedQuestion(null); fetchQuestions().catch(console.error); }}
        />
      )}
      
      {/* Barra de Filtros */}
      <Card className="p-4 bg-card/30 border-white/5 rounded-none grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            className="w-full bg-white/5 border border-white/10 pl-9 pr-4 py-2 text-[10px] uppercase font-mono outline-none focus:border-primary/50"
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })}
          />
        </div>
        <select
          className="bg-white/5 border border-white/10 p-2 text-[10px] font-mono uppercase outline-none focus:border-primary/50"
          value={filters.difficulty}
          aria-label={t('labelDifficulty')}
          onChange={e => setFilters({ ...filters, difficulty: e.target.value, page: 1 })}
        >
          <option value="">{t('allDifficulties')}</option>
          <option value="easy">{t('diffEasy')}</option>
          <option value="medium">{t('diffMedium')}</option>
          <option value="hard">{t('diffHard')}</option>
        </select>
        <select
          className="bg-white/5 border border-white/10 p-2 text-[10px] font-mono uppercase outline-none focus:border-primary/50"
          value={filters.active}
          aria-label={common('systemStatus')}
          onChange={e => setFilters({ ...filters, active: e.target.value, page: 1 })}
        >
          <option value="true">{t('onlyActive')}</option>
          <option value="false">{t('onlyInactive')}</option>
          <option value="all">{t('allVersions')}</option>
        </select>
        <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase pl-2">
          <span>{t('total', { count: pagination.total })}</span>
          <button onClick={() => setFilters({ page: 1, search: '', difficulty: '', active: 'true', module: '' })} aria-label={t('reset')} className="hover:text-primary transition-colors flex items-center gap-1.5"><SlidersHorizontal className="w-3 h-3" /> {t('reset')}</button>
        </div>
      </Card>

      {/* Grid de Preguntas */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">{common('initializing')}</div>
      ) : questions.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground font-mono rounded-none border-white/5 bg-card/20">{t('noQuestions')}</Card>
      ) : (
        <div className="flex flex-col gap-4">
          {questions.map(q => (
            <Card key={q._id} className={`p-5 rounded-none border-white/5 transition-all hover:border-primary/20 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ${q.active ? 'bg-card/20' : 'bg-white/[0.01] opacity-60'}`}>
              <div className="flex flex-col gap-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[8px] font-mono px-2 py-0.5 uppercase tracking-widest ${q.active ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-white/5 text-muted-foreground'}`}>{q.active ? t('stateActive') : t('stateInactive')}</span>
                  <span className="text-[8px] font-mono bg-white/5 px-2 py-0.5 text-muted-foreground">v{q.version}</span>
                  <span className="text-[8px] font-mono bg-white/5 px-2 py-0.5 text-muted-foreground">MOD: {q.module}</span>
                  <span className="text-[8px] font-mono bg-white/5 px-2 py-0.5 text-muted-foreground">SRC: {q.source}</span>
                  <span className={`text-[8px] font-mono px-2 py-0.5 uppercase ${q.difficulty === 'easy' ? 'text-green-400' : q.difficulty === 'hard' ? 'text-red-400' : 'text-yellow-400'}`}>{q.difficulty}</span>
                </div>
                <p className="text-xs text-foreground font-medium leading-relaxed">{q.questionText}</p>
              </div>
              <button onClick={() => setSelectedQuestion(q)} className="btn-primary-console shrink-0 py-2.5 px-4 text-[9px] uppercase tracking-wider flex items-center gap-2" aria-label={`${t('btnEdit')}: ${q.questionText.slice(0, 20)}`}>
                <Edit2 className="w-3.5 h-3.5" /> {t('btnEdit')}
              </button>
            </Card>
          ))}
          
          {/* Paginación */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4 font-mono text-[10px]">
              <button disabled={filters.page === 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })} aria-label="Previous Page" className="p-2 border border-white/5 disabled:opacity-30 disabled:hover:text-muted-foreground hover:text-primary transition-all"><ChevronLeft className="w-4 h-4" /></button>
              <span className="uppercase tracking-widest">PÁGINA {filters.page} DE {pagination.pages}</span>
              <button disabled={filters.page === pagination.pages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })} aria-label="Next Page" className="p-2 border border-white/5 disabled:opacity-30 disabled:hover:text-muted-foreground hover:text-primary transition-all"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
