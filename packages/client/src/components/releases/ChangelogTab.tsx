import { useRef } from 'react';

import { Alert } from '@patternfly/react-core';

import { ChangelogCategories } from './ChangelogCategories';
import { Concerns, Contributors, EpicStatus, TestImpact } from './ChangelogExtras';
import { ChangelogProgress } from './ChangelogProgress';
import { ChangelogResultActions } from './ChangelogResultActions';
import {
  BreakingChanges,
  ChangelogHighlights,
  ChangelogSummary,
  RawOutput,
} from './ChangelogSections';
import { ChangelogToolbar } from './ChangelogToolbar';
import { useChangelog } from './useChangelog';

type ChangelogTabProps = {
  version: string;
  milestones: { name: string; date: string; isPast: boolean }[];
};

export const ChangelogTab = ({ milestones, version }: ChangelogTabProps) => {
  const state = useChangelog(version);
  const reportRef = useRef<HTMLDivElement>(null);

  const changelog = state.result?.changelog;
  /* eslint-disable @typescript-eslint/no-unnecessary-condition -- defensive: runtime data */
  const hasCategories =
    changelog?.categories &&
    Object.values(changelog.categories).some(items => items && items.length > 0);
  const totalItems = changelog?.categories
    ? Object.values(changelog.categories).reduce((sum, items) => sum + (items?.length ?? 0), 0)
    : 0;
  /* eslint-enable @typescript-eslint/no-unnecessary-condition */

  return (
    <div className="app-mt-md">
      <ChangelogToolbar
        compareEnabled={state.compareEnabled}
        compareFrom={state.compareFrom}
        isGenerating={state.isGenerating}
        milestones={milestones}
        subVersions={state.subVersions}
        targetVer={state.targetVer}
        onClearResult={() => state.setResult(null)}
        onCompareFromChange={state.setCompareFrom}
        onCompareToggle={enabled => {
          state.setCompareEnabled(enabled);
          if (!enabled) {
            state.resetCompare();
          }
        }}
        onGenerate={() => state.startGeneration()}
        onTargetChange={state.setTargetVer}
      />

      {state.isGenerating && state.jobStatus?.status === 'running' && (
        <ChangelogProgress jobStatus={state.jobStatus} />
      )}

      {state.jobStatus?.status === 'error' && (
        <Alert
          isInline
          className="app-mb-md"
          title={state.jobStatus.error || 'Generation failed'}
          variant="danger"
        />
      )}

      {state.result && (
        <div ref={reportRef}>
          <ChangelogResultActions
            editMode={state.editMode}
            pendingEditsCount={state.pendingEdits.length}
            reportRef={reportRef}
            result={state.result}
            savingEdits={state.savingEdits}
            onCancelEdit={() => {
              state.setEditMode(false);
              state.setPendingEdits([]);
            }}
            onRegenerate={() => {
              state.setResult(null);
              void state.startGeneration();
            }}
            onSaveEdits={() => {
              void state.handleSaveEdits();
            }}
            onToggleEdit={() => {
              if (state.editMode && state.pendingEdits.length > 0) {
                void state.handleSaveEdits();
              } else {
                state.setEditMode(!state.editMode);
                state.setPendingEdits([]);
              }
            }}
          />

          <ChangelogSummary summary={changelog?.summary} />
          <ChangelogHighlights highlights={changelog?.highlights} />
          <BreakingChanges breakingChanges={changelog?.breakingChanges} />

          {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- narrows changelog for TS */}
          {hasCategories && changelog?.categories && (
            <ChangelogCategories
              categories={changelog.categories}
              editMode={state.editMode}
              totalItems={totalItems}
              onAddEdit={state.addEdit}
            />
          )}

          <Contributors contributors={state.result.meta.contributors} />
          <EpicStatus epicStatus={changelog?.epicStatus} />
          <Concerns concerns={changelog?.concerns} />
          <TestImpact testImpact={changelog?.testImpact} />
          <RawOutput
            hasContent={Boolean(hasCategories)}
            hasSummary={Boolean(changelog?.summary)}
            raw={changelog?.raw}
          />
        </div>
      )}
    </div>
  );
};
