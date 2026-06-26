'use client';

/**
 * @purpose Gestiona plantilla CRUD con editor, lista y test playground.
 * @purpose_en Manages prompt template CRUD with editor, listing, and test playground.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:4ptdu0
 * @lastUpdated 2026-06-26T10:02:23.832Z
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Brain, Plus, Play, CheckCircle2, XCircle, AlertCircle, Loader2, ChevronDown, ChevronRight, Save, Eye } from 'lucide-react';
import {
  getPromptTemplatesAction,
  savePromptTemplateAction,
  togglePromptTemplateActiveAction,
  testPromptAction,
  type PromptTemplateData,
} from '@/actions/prompt-actions';
import { extractPromptVariables } from '@/services/ai/promptUtils';

interface PromptsManagerProps {
  tenantId: string;
  tenantSuffix: string;
}

interface FormState {
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  temperature: number;
}

const INITIAL_FORM: FormState = {
  name: '',
  systemPrompt: '',
  userPromptTemplate: '',
  temperature: 0.7,
};

export function PromptsManager({ tenantId, tenantSuffix }: PromptsManagerProps) {
  const [prompts, setPrompts] = useState<PromptTemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [testVars, setTestVars] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    const result = await getPromptTemplatesAction(tenantId);
    if (result.success && result.data) {
      setPrompts(result.data);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const handleEdit = (p: PromptTemplateData) => {
    setEditingId(p._id);
    setForm({
      name: p.name,
      systemPrompt: p.systemPrompt,
      userPromptTemplate: p.userPromptTemplate,
      temperature: p.temperature,
    });
    setTestVars({});
    setError(null);
    setTestResult(null);
    setTestError(null);
  };

  const handleNew = () => {
    setEditingId('new');
    setForm(INITIAL_FORM);
    setError(null);
    setTestResult(null);
    setTestError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const result = await savePromptTemplateAction(
      {
        name: form.name,
        systemPrompt: form.systemPrompt,
        userPromptTemplate: form.userPromptTemplate,
        temperature: form.temperature,
      },
      tenantId
    );

    if (result.success) {
      setEditingId(null);
      setForm(INITIAL_FORM);
      await loadPrompts();
    } else {
      setError(result.error || 'Error saving prompt template');
    }

    setSaving(false);
  };

  const handleToggle = async (id: string) => {
    await togglePromptTemplateActiveAction(id, tenantId);
    await loadPrompts();
  };

  const handleTest = async (systemPrompt: string, userTemplate: string) => {
    setTestLoading(true);
    setTestResult(null);
    setTestError(null);

    const result = await testPromptAction({
      systemPrompt,
      userPromptTemplate: userTemplate,
      variables: testVars,
    });

    if (result.success && result.data) {
      setTestResult(result.data);
    } else {
      setTestError(result.error || 'Test failed');
    }

    setTestLoading(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setError(null);
    setTestResult(null);
    setTestError(null);
  };

  const activePrompts = prompts.filter((p) => p.active);
  const inactivePrompts = prompts.filter((p) => !p.active);

  if (editingId) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6">
          <Card className="p-6 bg-card/30 border-border rounded-none">
            <div className="flex items-center gap-3 mb-6">
              <Brain className="w-5 h-5 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-bold uppercase tracking-widest font-mono text-foreground">
                {editingId === 'new' ? 'New Prompt Template' : 'Edit Prompt Template'}
              </h2>
            </div>

            <Separator className="bg-border mb-6" />

            <div className="flex flex-col gap-5">
              <div>
                <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Name *
                </label>
                <input
                  type="text"
                  className="w-full bg-transparent border border-border px-3 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary rounded-none"
                  placeholder="e.g. question_generation"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  System Prompt *
                </label>
                <textarea
                  className="w-full bg-transparent border border-border px-3 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary rounded-none min-h-[120px] resize-y"
                  value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  User Prompt Template *
                </label>
                <textarea
                  className="w-full bg-transparent border border-border px-3 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary rounded-none min-h-[120px] resize-y font-mono"
                  value={form.userPromptTemplate}
                  onChange={(e) => {
                    setForm({ ...form, userPromptTemplate: e.target.value });
                    setTestVars({});
                  }}
                />
                <p className="text-[8px] font-mono text-muted-foreground/50 mt-1">
                  Use {'{{variable}}'} placeholders. Variables are auto‑detected from the template.
                </p>

                {form.userPromptTemplate && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {extractPromptVariables(form.userPromptTemplate).map((v) => (
                      <span key={v} className="text-[8px] font-mono px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary">
                        {'{{'}{v}{'}}'}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Temperature
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    className="w-full bg-transparent border border-border px-3 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary rounded-none"
                    value={form.temperature}
                    onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) || 0.7 })}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-[10px] font-mono text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  className="rounded-none font-mono text-[10px] tracking-widest uppercase h-11 px-6"
                  onClick={handleSave}
                  disabled={saving || !form.name || !form.systemPrompt || !form.userPromptTemplate}
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 mr-2" />
                  )}
                  {saving ? 'Saving...' : 'Save Template'}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-none font-mono text-[10px] tracking-widest uppercase h-11 px-6"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-6 bg-card/30 border-border rounded-none">
            <div className="flex items-center gap-3 mb-6">
              <Eye className="w-5 h-5 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-bold uppercase tracking-widest font-mono text-foreground">
                Test Playground
              </h2>
            </div>

            <Separator className="bg-border mb-6" />

            <div className="flex flex-col gap-4">
              <p className="text-[9px] font-mono text-muted-foreground/70 uppercase tracking-wider">
                Enter test values for each detected variable:
              </p>

              {extractPromptVariables(form.userPromptTemplate).map((key) => (
                <div key={key}>
                  <label className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
                    {'{{'}{key}{'}}'}
                  </label>
                  <input
                    type="text"
                    className="w-full bg-transparent border border-border px-3 py-2 text-[10px] font-mono text-foreground focus:outline-none focus:border-primary rounded-none"
                    placeholder={`Value for ${key}`}
                    value={testVars[key] || ''}
                    onChange={(e) => setTestVars({ ...testVars, [key]: e.target.value })}
                  />
                </div>
              ))}

              <Button
                className="rounded-none font-mono text-[10px] tracking-widest uppercase h-11 px-6 mt-2"
                variant="outline"
                onClick={() => handleTest(form.systemPrompt, form.userPromptTemplate)}
                disabled={testLoading}
              >
                {testLoading ? (
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 mr-2" />
                )}
                {testLoading ? 'Generating...' : 'Test Prompt'}
              </Button>

              {testError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-[10px] font-mono text-red-400 mt-2">
                  {testError}
                </div>
              )}

              {testResult && (
                <div className="mt-4">
                  <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2 block">
                    Generated Output:
                  </label>
                  <div className="p-4 bg-black/20 border border-border/50 text-[11px] font-mono text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto rounded-none">
                    {testResult}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-bold uppercase tracking-widest font-mono text-foreground">
            Prompt Templates
          </h2>
        </div>
        <Button
          className="rounded-none font-mono text-[10px] tracking-widest uppercase h-11 px-6"
          onClick={handleNew}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : prompts.length === 0 ? (
        <Card className="p-10 bg-card/20 border-border rounded-none flex flex-col items-center justify-center text-center gap-4">
          <Brain className="w-10 h-10 text-muted-foreground/30" aria-hidden="true" />
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            No prompt templates configured. Create the first one to start customizing AI behavior.
          </p>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">
              ACTIVE ({activePrompts.length})
            </span>
            {activePrompts.map((p) => (
              <PromptCard
                key={p._id}
                prompt={p}
                onEdit={() => handleEdit(p)}
                onToggle={() => handleToggle(p._id)}
                expanded={expandedId === p._id}
                onToggleExpand={() => setExpandedId(expandedId === p._id ? null : p._id)}
              />
            ))}
          </div>

          {inactivePrompts.length > 0 && (
            <div className="flex flex-col gap-3 mt-4">
              <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40">
                ARCHIVED VERSIONS ({inactivePrompts.length})
              </span>
              {inactivePrompts.map((p) => (
                <PromptCard
                  key={p._id}
                  prompt={p}
                  onEdit={() => handleEdit(p)}
                  onToggle={() => handleToggle(p._id)}
                  expanded={expandedId === p._id}
                  onToggleExpand={() => setExpandedId(expandedId === p._id ? null : p._id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PromptCard({
  prompt,
  onEdit,
  onToggle,
  expanded,
  onToggleExpand,
}: {
  prompt: PromptTemplateData;
  onEdit: () => void;
  onToggle: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <Card className="p-5 bg-card/30 border-border rounded-none hover:border-primary/20 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Brain className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <span className="text-sm font-bold font-mono uppercase tracking-tight">
              {prompt.name}
            </span>
            <span className="ml-3 text-[8px] font-mono text-muted-foreground/50">
              v{prompt.version}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {prompt.active ? (
            <span className="flex items-center gap-1 text-[8px] font-mono text-emerald-500 uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[8px] font-mono text-muted-foreground/50 uppercase tracking-wider">
              <XCircle className="w-3 h-3" /> Archived
            </span>
          )}
          <button
            onClick={onToggleExpand}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Expand"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60 block mb-1">
                Temperature
              </span>
              <span className="text-xs font-mono text-foreground">{prompt.temperature}</span>
            </div>
            <div>
              <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60 block mb-1">
                Required Variables
              </span>
              <div className="flex flex-wrap gap-1">
                {prompt.requiredVariables.map((v) => (
                  <span key={v} className="text-[8px] font-mono px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary">
                    {'{{'}{v}{'}}'}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-3">
            <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60 block mb-1">
              System Prompt
            </span>
            <div className="p-3 bg-black/10 border border-border/30 text-[10px] font-mono text-foreground/70 whitespace-pre-wrap leading-relaxed max-h-[100px] overflow-y-auto rounded-none">
              {prompt.systemPrompt}
            </div>
          </div>

          <div className="mb-4">
            <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60 block mb-1">
              User Prompt Template
            </span>
            <div className="p-3 bg-black/10 border border-border/30 text-[10px] font-mono text-foreground/70 whitespace-pre-wrap leading-relaxed max-h-[100px] overflow-y-auto rounded-none">
              {prompt.userPromptTemplate}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="rounded-none font-mono text-[8px] tracking-widest uppercase h-9 px-4"
              onClick={onEdit}
            >
              <Save className="w-3 h-3 mr-1.5" />
              Edit
            </Button>
            {prompt.active ? (
              <Button
                variant="outline"
                className="rounded-none font-mono text-[8px] tracking-widest uppercase h-9 px-4"
                onClick={onToggle}
              >
                <XCircle className="w-3 h-3 mr-1.5" />
                Archive
              </Button>
            ) : (
              <Button
                variant="outline"
                className="rounded-none font-mono text-[8px] tracking-widest uppercase h-9 px-4 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={onToggle}
              >
                <CheckCircle2 className="w-3 h-3 mr-1.5" />
                Reactivate
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
