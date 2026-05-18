'use client';

import { useState } from 'react';
import { Search, AlertCircle, RotateCcw, Check, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { invalidateAttemptAction } from '@/actions/quiz';
import { toast } from 'sonner';

interface AttemptProps {
  _id: string;
  userId: string;
  mode: 'training' | 'mock';
  score: number;
  percentage: number;
  startedAt: string;
  endedAt?: string;
  status: 'in_progress' | 'completed' | 'timeout';
  isInvalidated?: boolean;
  invalidatedBy?: string;
  invalidatedAt?: string;
  examConfigId?: {
    _id: string;
    name: string;
    passThreshold: number;
  };
}

interface AttemptsManagerProps {
  attempts: AttemptProps[];
}

export default function AttemptsManager({ attempts }: AttemptsManagerProps) {
  const [search, setSearch] = useState('');
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});

  const filteredAttempts = attempts.filter((attempt) => {
    const term = search.toLowerCase();
    return (
      attempt.userId.toLowerCase().includes(term) ||
      (attempt.examConfigId?.name || '').toLowerCase().includes(term) ||
      attempt.status.toLowerCase().includes(term)
    );
  });

  const handleInvalidate = async (attemptId: string) => {
    if (!confirm('¿Estás seguro de que deseas anular este intento? El estudiante podrá realizar un nuevo intento de inmediato.')) {
      return;
    }

    setLoadingIds((prev) => ({ ...prev, [attemptId]: true }));
    try {
      const result = await invalidateAttemptAction(attemptId);
      if (result.success) {
        toast.success('Intento anulado con éxito. Se ha concedido un reintento extraordinario.');
      } else {
        toast.error(result.error || 'Error al anular intento');
      }
    } catch {
      toast.error('Fallo en la comunicación con el servidor');
    } finally {
      setLoadingIds((prev) => ({ ...prev, [attemptId]: false }));
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Search Bar */}
      <div className="relative max-w-md w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por Email del Alumno o Examen..."
          className="pl-12 h-12 bg-card/20 border-white/5 rounded-none font-mono text-xs focus-visible:ring-primary/40"
        />
      </div>

      {filteredAttempts.length === 0 ? (
        <Card className="p-12 text-center bg-card/20 border-white/5 rounded-none flex flex-col items-center justify-center gap-4">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
          <p className="text-xs uppercase tracking-widest font-mono text-muted-foreground">
            No se encontraron intentos de examen.
          </p>
        </Card>
      ) : (
        <div className="border border-white/5 bg-card/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-[10px] uppercase">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-muted-foreground tracking-wider">
                  <th className="p-4 font-bold">{`Alumno`}</th>
                  <th className="p-4 font-bold">{`Examen`}</th>
                  <th className="p-4 font-bold">{`Fecha`}</th>
                  <th className="p-4 font-bold">{`Estado`}</th>
                  <th className="p-4 font-bold text-center">{`Puntuación`}</th>
                  <th className="p-4 font-bold text-center">{`Nota`}</th>
                  <th className="p-4 font-bold text-right">{`Gobernanza`}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAttempts.map((attempt) => {
                  const threshold = attempt.examConfigId?.passThreshold ?? 70;
                  const isPassed = attempt.percentage >= threshold;
                  const isCompleted = attempt.status === 'completed';
                  const isInvalidated = attempt.isInvalidated;

                  return (
                    <tr
                      key={attempt._id}
                      className={`hover:bg-white/[0.01] transition-colors ${
                        isInvalidated ? 'opacity-50 line-through bg-red-950/5' : ''
                      }`}
                    >
                      <td className="p-4 font-bold text-foreground lowercase tracking-normal">
                        {attempt.userId}
                      </td>
                      <td className="p-4 font-semibold text-muted-foreground">
                        {attempt.examConfigId?.name || 'Entrenamiento Libre'}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {formatDate(attempt.startedAt)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 border font-semibold inline-block ${
                            attempt.status === 'completed'
                              ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400'
                              : attempt.status === 'timeout'
                              ? 'bg-amber-950/20 border-amber-900/50 text-amber-400'
                              : 'bg-blue-950/20 border-blue-900/50 text-blue-400'
                          }`}
                        >
                          {attempt.status}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold text-foreground">
                        {isCompleted ? attempt.score : '-'}
                      </td>
                      <td className="p-4 text-center">
                        {isCompleted ? (
                          <span
                            className={`font-black px-2 py-0.5 border ${
                              isPassed
                                ? 'bg-primary/10 border-primary/30 text-primary'
                                : 'bg-red-950/20 border-red-900/30 text-red-400'
                            }`}
                          >
                            {attempt.percentage}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {isInvalidated ? (
                          <div className="flex flex-col items-end gap-1 select-none">
                            <span className="bg-red-950/30 border border-red-900/50 text-red-400 px-2.5 py-1 font-bold flex items-center gap-1.5 rounded-none text-[8px]">
                              <ShieldAlert className="w-3 h-3" />
                              ANULADO
                            </span>
                            <span className="text-[7px] text-muted-foreground lowercase normal-case tracking-normal">
                              por: {attempt.invalidatedBy}
                            </span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleInvalidate(attempt._id)}
                            disabled={loadingIds[attempt._id]}
                            variant="outline"
                            className="h-8 rounded-none border-red-900/30 text-red-400 bg-red-950/10 hover:bg-red-900/20 hover:text-red-300 font-mono text-[9px] tracking-wider"
                          >
                            <RotateCcw className="w-3 h-3 mr-2" />
                            {loadingIds[attempt._id] ? 'Anulando...' : 'ANULAR / REINTENTO'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
