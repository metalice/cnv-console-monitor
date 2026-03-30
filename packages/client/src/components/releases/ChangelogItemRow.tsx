import { Label, Tooltip } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';

import type { ChangelogCorrection, ChangelogItem } from '../../api/ai';

import { EditControls, ReadOnlyBadges } from './ChangelogEditControls';
import { ChangelogItemDetail } from './ChangelogItemDetail';
import { ConfidenceBadge } from './ConfidenceBadge';

type ChangelogItemRowProps = {
  item: ChangelogItem;
  category: string;
  editMode: boolean;
  onAddEdit: (correction: ChangelogCorrection) => void;
};

export const ChangelogItemRow = ({
  category,
  editMode,
  item,
  onAddEdit,
}: ChangelogItemRowProps) => {
  const hasDetail = Boolean(
    item.ticketSummary ||
    item.status ||
    item.assignee ||
    item.availableIn ||
    item.buildInfo ||
    item.blockedBy,
  );

  return (
    <div className="app-changelog-item-wrap">
      <div className="app-changelog-item">
        {item.key && (
          <a
            className="app-changelog-key"
            href={`https://issues.redhat.com/browse/${item.key}`}
            rel="noreferrer"
            target="_blank"
          >
            {item.key} <ExternalLinkAltIcon className="app-text-xs" />
          </a>
        )}
        <Tooltip content={item.reasoning || item.title || ''} maxWidth="400px">
          <span className="app-changelog-title">{item.title || ''}</span>
        </Tooltip>
        {item.component && (
          <Label isCompact className="app-ml-xs" color="grey">
            {item.component}
          </Label>
        )}
        {editMode && item.key ? (
          <EditControls category={category} item={item} onAddEdit={onAddEdit} />
        ) : (
          <ReadOnlyBadges item={item} />
        )}
        <ConfidenceBadge confidence={item.confidence} reason={item.confidenceReason} />
        <PrLinks prLinks={item.prLinks} />
      </div>
      {hasDetail && <ChangelogItemDetail item={item} />}
    </div>
  );
};

const PrLinks = ({ prLinks }: { prLinks?: string[] }) => {
  if (!prLinks?.length) {
    return null;
  }
  return (
    <>
      {prLinks
        .filter((link): link is string => typeof link === 'string')
        .map(link => (
          <a
            className="app-text-xs app-ml-xs"
            href={link}
            key={link}
            rel="noreferrer"
            target="_blank"
          >
            PR <ExternalLinkAltIcon />
          </a>
        ))}
    </>
  );
};
