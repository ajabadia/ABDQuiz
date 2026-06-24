'use client';

/**
 * @purpose Gestiona una interfaz de terminal para administrar denuncias con tablas para casos pendientes y resueltos, mostrando detalles y ofreciendo opciones para resolver casos pendientes.
 * @purpose_en Renders a terminal interface for managing allegations with tabs for pending and resolved cases, displaying details and providing options to resolve pending allegations.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:2,imports:7,sig:16sj5nj
 * @lastUpdated 2026-06-23T19:48:04.227Z
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { ResolveAllegationModal } from './ResolveAllegationModal';

export interface SerializedAllegation {
  _id: string;
  status: 'pending' | 'approved' | 'rejected';
  userName: string;
  userEmail: string;
  questionText: string;
  reason: string;
  feedback?: string;
  questionId: string;
  attemptId: string;
  resolutionMode?: 'approved_correction' | 'approved_annulled' | 'rejected';
  correctedOptionIndex?: number;
  createdAt?: string;
}

interface AllegationsClientTerminalProps {
  initialAllegations: SerializedAllegation[];
  translations: Record<string, string>;
}

export function AllegationsClientTerminal({ initialAllegations, translations }: AllegationsClientTerminalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');
  const [selectedAllegation, setSelectedAllegation] = useState<SerializedAllegation | null>(null);

  // KPIs
  const pendingCount = initialAllegations.filter((a) => a.status === 'pending').length;
  const approvedCount = initialAllegations.filter((a) => a.status === 'approved').length;
  const rejectedCount = initialAllegations.filter((a) => a.status === 'rejected').length;

  const filteredAllegations = initialAllegations.filter((a) => 
    activeTab === 'pending' ? a.status === 'pending' : a.status !== 'pending'
  );

  const tabs: { key: 'pending' | 'resolved'; label: string; count: number }[] = [
    { key: 'pending', label: translations.kpiPending, count: pendingCount },
    { key: 'resolved', label: 'Resueltas', count: approvedCount + rejectedCount }
  ];

  return (
    <div className="space-y-8">
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-card/20 border-border/40 flex items-center justify-between rounded-none">
          <div className="space-y-1">
            <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{translations.kpiPending}</span>
            <h4 className="text-3xl font-black text-amber-500 tabular-nums">{pendingCount}</h4>
          </div>
          <Clock className="w-8 h-8 text-amber-500/40" />
        </Card>

        <Card className="p-6 bg-card/20 border-border/40 flex items-center justify-between rounded-none">
          <div className="space-y-1">
            <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{translations.kpiApproved}</span>
            <h4 className="text-3xl font-black text-green-500 tabular-nums">{approvedCount}</h4>
          </div>
          <CheckCircle className="w-8 h-8 text-green-500/40" />
        </Card>

        <Card className="p-6 bg-card/20 border-border/40 flex items-center justify-between rounded-none">
          <div className="space-y-1">
            <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{translations.kpiRejected}</span>
            <h4 className="text-3xl font-black text-destructive tabular-nums">{rejectedCount}</h4>
          </div>
          <XCircle className="w-8 h-8 text-destructive/40" />
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-px">
        {tabs.map((tab) => (
          <button aria-label={`${translations.btnResolve} ${tab.label}`}
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 font-mono text-[10px] tracking-widest uppercase border-b-2 transition-all ${
              activeTab === tab.key 
                ? 'border-primary text-foreground bg-white/[0.02]' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredAllegations.length === 0 ? (
          <div className="p-12 text-center border border-white/5 bg-white/[0.01]">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              {translations.noAllegations}
            </span>
          </div>
        ) : (
          filteredAllegations.map((a) => (
            <Card 
              key={a._id}
              className="p-5 bg-card/10 border-border/20 hover:border-border/40 transition-all rounded-none flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={`rounded-none font-mono text-[8px] uppercase ${
                    a.status === 'pending' 
                      ? 'border-amber-500/20 text-amber-500 bg-amber-500/5' 
                      : a.status === 'approved' 
                        ? 'border-green-500/20 text-green-500 bg-green-500/5' 
                        : 'border-destructive/20 text-destructive bg-destructive/5'
                  }`}>
                    {a.status === 'pending' 
                      ? translations.statusPending 
                      : a.status === 'approved' 
                        ? translations.statusApproved 
                        : translations.statusRejected
                    }
                  </Badge>
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">{a.userName} ({a.userEmail})</span>
                </div>
                <h5 className="text-sm font-semibold">{a.questionText}</h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 mr-1.5">{translations.tableReason}:</strong>
                  &quot;{a.reason}&quot;
                </p>
                {a.feedback && (
                  <p className="text-xs text-primary leading-relaxed bg-primary/[0.02] border border-primary/5 p-3 font-mono">
                    <strong className="uppercase tracking-widest text-[9px] block text-primary/80 mb-1">{translations.feedbackTecnico}:</strong>
                    {a.feedback}
                  </p>
                )}
              </div>

              {a.status === 'pending' && (
                <div className="flex items-center justify-end">
                  <Button
                    onClick={() => setSelectedAllegation(a)}
                    className="rounded-none font-mono text-[9px] tracking-widest uppercase h-9 px-6"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mr-2" />
                    {translations.btnResolve}
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <ResolveAllegationModal
        allegation={selectedAllegation}
        isOpen={!!selectedAllegation}
        onClose={() => setSelectedAllegation(null)}
        onSuccess={() => {
          router.refresh();
        }}
        translations={translations}
      />
    </div>
  );
}
