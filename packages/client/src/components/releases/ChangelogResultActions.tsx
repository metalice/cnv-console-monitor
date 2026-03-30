import { Button, Flex, FlexItem, Label, Tooltip } from '@patternfly/react-core';
import {
  CopyIcon,
  DownloadIcon,
  ExternalLinkAltIcon,
  PencilAltIcon,
  TimesIcon,
} from '@patternfly/react-icons';

import type { ChangelogResult } from '../../api/ai';

import { buildSlackText, openPrintView } from './changelogExport';
import { EditModeAlert } from './EditModeAlert';

type ChangelogResultActionsProps = {
  result: ChangelogResult;
  editMode: boolean;
  pendingEditsCount: number;
  savingEdits: boolean;
  reportRef: React.RefObject<HTMLDivElement | null>;
  onToggleEdit: () => void;
  onSaveEdits: () => void;
  onCancelEdit: () => void;
  onRegenerate: () => void;
};

export const ChangelogResultActions = ({
  editMode,
  onCancelEdit,
  onRegenerate,
  onSaveEdits,
  onToggleEdit,
  pendingEditsCount,
  reportRef,
  result,
  savingEdits,
}: ChangelogResultActionsProps) => {
  const jiraUrl = `https://issues.redhat.com/issues/?jql=project%3DCNV%20AND%20fixVersion%3D%22${encodeURIComponent(result.meta.targetVersion)}%22`;
  const copyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('clTarget', result.meta.targetVersion);
    if (result.meta.compareFrom) {
      url.searchParams.set('clFrom', result.meta.compareFrom);
    }
    void navigator.clipboard.writeText(url.toString());
  };

  return (
    <>
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        className="app-mb-md"
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
      >
        <FlexItem>
          <Label isCompact className="app-mr-sm" color="blue">
            {result.meta.label}
          </Label>
          <span className="app-text-xs app-text-muted">
            {result.meta.issueCount} issues
            {result.meta.batches > 1 ? ` (${result.meta.batches} batches)` : ''}
            {' · '}
            {result.meta.tokensUsed} tokens{result.meta.cached ? ' · cached' : ''}
            {' · '}
            {result.meta.model}
          </span>
        </FlexItem>
        <FlexItem>
          <Flex spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              <Button
                aria-label="Download PDF"
                icon={<DownloadIcon />}
                size="sm"
                variant="plain"
                onClick={() => openPrintView(result, reportRef)}
              />
            </FlexItem>
            <FlexItem>
              <Button
                aria-label="Copy Slack"
                icon={<CopyIcon />}
                size="sm"
                variant="plain"
                onClick={() => navigator.clipboard.writeText(buildSlackText(result))}
              />
            </FlexItem>
            <FlexItem>
              <Tooltip content="Open Jira filter">
                <Button
                  aria-label="Jira filter"
                  icon={<ExternalLinkAltIcon />}
                  size="sm"
                  variant="plain"
                  onClick={() => window.open(jiraUrl, '_blank')}
                />
              </Tooltip>
            </FlexItem>
            <FlexItem>
              <Tooltip content="Copy shareable link">
                <Button
                  aria-label="Copy link"
                  icon={<CopyIcon />}
                  size="sm"
                  variant="plain"
                  onClick={copyLink}
                />
              </Tooltip>
            </FlexItem>
            <FlexItem>
              <Tooltip
                content={editMode ? 'Exit edit mode' : 'Edit classifications and risk levels'}
              >
                <Button
                  aria-label="Edit"
                  icon={editMode ? <TimesIcon /> : <PencilAltIcon />}
                  size="sm"
                  variant={editMode ? 'secondary' : 'plain'}
                  onClick={onToggleEdit}
                />
              </Tooltip>
            </FlexItem>
            <FlexItem>
              <Button size="sm" variant="link" onClick={onRegenerate}>
                Regenerate
              </Button>
            </FlexItem>
          </Flex>
        </FlexItem>
      </Flex>
      {editMode && (
        <EditModeAlert
          pendingEditsCount={pendingEditsCount}
          savingEdits={savingEdits}
          onCancelEdit={onCancelEdit}
          onSaveEdits={onSaveEdits}
        />
      )}
    </>
  );
};
