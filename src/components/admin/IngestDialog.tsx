'use client';

/**
 * @purpose Gestiona un diálogo de carga de contenido con diferentes estados y formas.
 * @purpose_en Renders an import dialog for managing content ingestion with various states and forms.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:13,sig:1qq00w7
 * @lastUpdated 2026-06-23T19:48:19.632Z
 */

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { UploadState } from './ingest/UploadState';
import { SelectContextState } from './ingest/SelectContextState';
import { RemediationIdsState } from './ingest/RemediationIdsState';
import { RemediationConflictsState } from './ingest/RemediationConflictsState';
import { RemediationChoiceState } from './ingest/RemediationChoiceState';
import { BulkRemediationState } from './ingest/BulkRemediationState';
import { InteractiveStepsState } from './ingest/InteractiveStepsState';
import { useIngestWizard } from './ingest/hooks/useIngestWizard';
import { useContentConflicts } from './ingest/hooks/useContentConflicts';
import { useHierarchyResolution } from './ingest/hooks/useHierarchyResolution';
import { useIngestRouter } from './ingest/hooks/useIngestRouter';

interface ImportDialogProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function ImportDialog({ onSuccess, onClose }: ImportDialogProps) {
  const t = useTranslations('admin');

  const wizard = useIngestWizard(onSuccess, onClose);
  const conflicts = useContentConflicts();
  const hierarchy = useHierarchyResolution();
  const router = useIngestRouter(wizard, conflicts, hierarchy);

  const {
    wizardState,
    file, sourceType, isUploading, fileInputRef,
    questions, setQuestions,
    setWizardState,
    incompleteIndices, setIncompleteIndices,
    currentIncompleteIndex,
    interactiveRemediationData, setInteractiveRemediationData,
    bulkData, setBulkData,
    handleFileChange, initInteractiveFrom,
    handleBulkRemediationSubmit, handleNextInteractive, handleIgnoreAndSubmit,
  } = wizard;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-2xl bg-background border border-border p-8 flex flex-col gap-6 shadow-2xl relative max-h-[90vh] overflow-y-auto rounded-none">
        <button
          onClick={onClose}
          aria-label={t('reset')}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {wizardState === 'upload' && (
          <UploadState
            file={file}
            sourceType={sourceType}
            isUploading={isUploading}
            fileInputRef={fileInputRef}
            onFileClick={() => fileInputRef.current?.click()}
            onFileChange={handleFileChange}
            onStartParsing={router.handleStartParsing}
          />
        )}

        {wizardState === 'select_context' && (
          <SelectContextState
            pendingCount={hierarchy.needsContextCount}
            onApply={router.handleContextSelection}
            onSkip={router.handleSkipContext}
            onBack={() => setWizardState('upload')}
          />
        )}

        {wizardState === 'remediation_ids' && (
          <RemediationIdsState
            conflicts={hierarchy.hierarchyConflicts}
            onApply={router.handleHierarchyResolution}
            onBack={() => setWizardState('upload')}
          />
        )}

        {wizardState === 'remediation_conflicts' && (
          <RemediationConflictsState
            totalConflicts={conflicts.contentConflicts.length}
            currentConflict={conflicts.contentConflicts[conflicts.resolvedConflictCount] ?? null}
            questionA={conflicts.contentConflicts[conflicts.resolvedConflictCount]
              ? questions[conflicts.contentConflicts[conflicts.resolvedConflictCount].indexA]
              : null}
            questionB={conflicts.contentConflicts[conflicts.resolvedConflictCount]
              ? questions[conflicts.contentConflicts[conflicts.resolvedConflictCount].indexB]
              : null}
            onApply={conflicts.handleContentConflictResolution}
            onResolveAll={router.handleContinueAfterAllResolved}
            resolvedSoFar={conflicts.resolvedConflictCount}
            onBack={() => setWizardState(
              hierarchy.hierarchyConflicts.length > 0 ? 'remediation_ids' : 'upload'
            )}
          />
        )}

        {wizardState === 'remediation_choice' && (
          <RemediationChoiceState
            countIncomplete={incompleteIndices.length}
            totalCount={questions.length}
            onBulkChoice={() => setWizardState('bulk_form')}
            onInteractiveChoice={() => {
              initInteractiveFrom(0, questions);
              setWizardState('interactive_steps');
            }}
            onIgnoreChoice={() => handleIgnoreAndSubmit(questions)}
          />
        )}

        {wizardState === 'bulk_form' && (
          <BulkRemediationState
            bulkData={bulkData}
            onDataChange={setBulkData}
            onSubmit={(e) => handleBulkRemediationSubmit(e, questions)}
            onBack={() => setWizardState('remediation_choice')}
            isUploading={isUploading}
          />
        )}

        {wizardState === 'interactive_steps' && (
          <InteractiveStepsState
            currentIncompleteIndex={currentIncompleteIndex}
            totalIncomplete={incompleteIndices.length}
            question={questions[incompleteIndices[currentIncompleteIndex]]}
            remediationData={interactiveRemediationData}
            onDataChange={setInteractiveRemediationData}
            onBack={() => setWizardState('remediation_choice')}
            onNext={() => handleNextInteractive(questions)}
            isUploading={isUploading}
          />
        )}
      </div>
    </div>
  );
}
