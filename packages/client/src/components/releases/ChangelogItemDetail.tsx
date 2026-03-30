import { Label, Tooltip } from '@patternfly/react-core';
import { UserIcon, WrenchIcon } from '@patternfly/react-icons';

import type { ChangelogItem, ChangelogItemAvailability } from '../../api/ai';

type ChangelogItemDetailProps = {
  item: ChangelogItem;
};

export const ChangelogItemDetail = ({ item }: ChangelogItemDetailProps) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- typeof null === 'object'
  const avail = typeof item.availableIn === 'object' && item.availableIn ? item.availableIn : null;
  const availStr = typeof item.availableIn === 'string' ? item.availableIn : null;
  const availVersion = avail?.version || availStr || null;
  const availTooltip = buildAvailTooltip(item, avail);

  return (
    <div className="app-changelog-ticket-detail">
      {item.ticketSummary && (
        <div className="app-changelog-ticket-summary">{item.ticketSummary}</div>
      )}
      <div className="app-changelog-ticket-meta">
        <StatusLabel
          resolution={item.resolution}
          resolvedDate={item.resolvedDate}
          status={item.status}
        />
        {item.assignee && (
          <Tooltip content={`Assignee: ${item.assignee}`}>
            <span className="app-changelog-meta-item">
              <UserIcon className="app-text-xs" /> {item.assignee}
            </span>
          </Tooltip>
        )}
        {availVersion && (
          <Tooltip
            content={<div style={{ whiteSpace: 'pre-line' }}>{availTooltip}</div>}
            maxWidth="450px"
          >
            <Label
              isCompact
              className="app-changelog-meta-item app-cursor-help"
              color="blue"
              variant="outline"
            >
              {availVersion}
              {avail?.build ? ` (${avail.build})` : ''}
            </Label>
          </Tooltip>
        )}
        {avail?.prMergedTo && (
          <Tooltip
            content={`PR merged to branch ${avail.prMergedTo}${avail.prMergedDate ? ` on ${avail.prMergedDate}` : ''}`}
          >
            <span className="app-changelog-meta-item app-text-xs app-text-muted app-cursor-help">
              → {avail.prMergedTo}
            </span>
          </Tooltip>
        )}
        {item.buildInfo && !availVersion && (
          <Tooltip content={`Build: ${item.buildInfo}`}>
            <span className="app-changelog-meta-item">
              <WrenchIcon className="app-text-xs" /> {item.buildInfo}
            </span>
          </Tooltip>
        )}
        {item.blockedBy && (
          <Label isCompact className="app-changelog-meta-item" color="red" variant="outline">
            Blocked: {item.blockedBy}
          </Label>
        )}
      </div>
    </div>
  );
};

type StatusLabelProps = {
  status?: string;
  resolution?: string;
  resolvedDate?: string;
};

const StatusLabel = ({ resolution, resolvedDate, status }: StatusLabelProps) => {
  if (!status) {
    return null;
  }
  return (
    <Tooltip
      content={`Status: ${status}${resolution ? ` (${resolution})` : ''}${resolvedDate ? ` — resolved ${resolvedDate}` : ''}`}
    >
      <span className="app-changelog-meta-item">
        <Label
          isCompact
          color={
            status === 'Closed' || status === 'Done'
              ? 'green'
              : status === 'In Progress'
                ? 'blue'
                : 'grey'
          }
          variant="outline"
        >
          {status}
        </Label>
      </span>
    </Tooltip>
  );
};

const buildAvailTooltip = (
  item: ChangelogItem,
  avail: ChangelogItemAvailability | null,
): string => {
  const lines: string[] = [];
  if (avail) {
    if (avail.evidence) {
      lines.push(`📋 ${avail.evidence}`);
    }
    if (avail.build) {
      lines.push(`🔧 Build: ${avail.build}${avail.buildDate ? ` (${avail.buildDate})` : ''}`);
    }
    if (avail.prMergedTo) {
      lines.push(
        `🔀 PR merged to: ${avail.prMergedTo}${avail.prMergedDate ? ` on ${avail.prMergedDate}` : ''}`,
      );
    }
    if (item.resolvedDate) {
      lines.push(`✅ Resolved: ${item.resolvedDate}`);
    }
  } else {
    if (item.availableInReason) {
      lines.push(item.availableInReason);
    } else if (item.buildInfo) {
      lines.push(`Build info: ${item.buildInfo}`);
    }
    if (item.resolvedDate) {
      lines.push(`Resolved: ${item.resolvedDate}`);
    }
    if (lines.length === 0) {
      lines.push(
        'Version determined from Jira fixVersion field. Regenerate the changelog for detailed evidence.',
      );
    }
  }
  return lines.join('\n');
};
