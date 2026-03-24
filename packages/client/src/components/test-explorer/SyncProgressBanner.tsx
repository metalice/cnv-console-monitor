import React, { useState } from 'react';

import {
  Content,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  Progress,
  ProgressSize,
} from '@patternfly/react-core';
import { CheckCircleIcon, SyncAltIcon } from '@patternfly/react-icons';

import { useSyncProgress } from '../../hooks/useWebSocket';

export const SyncProgressBanner: React.FC = () => {
  const sync = useSyncProgress();
  const [logExpanded, setLogExpanded] = useState(false);

  if (!sync.active && sync.log.length === 0) {
    return null;
  }

  const percent = sync.total > 0 ? Math.round((sync.current / sync.total) * 100) : 0;
  const isComplete = sync.phase === 'complete';

  return (
    <div className="app-sync-banner">
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          {isComplete ? (
            <CheckCircleIcon className="app-text-success" />
          ) : (
            <SyncAltIcon className={sync.active ? 'app-spin' : ''} />
          )}
        </FlexItem>
        <FlexItem grow={{ default: 'grow' }}>
          {sync.active ? (
            <Progress
              label={`${sync.current}/${sync.total}`}
              size={ProgressSize.sm}
              title={sync.message}
              value={percent}
            />
          ) : (
            <Content component="small">{sync.message || 'Sync complete'}</Content>
          )}
        </FlexItem>
        {sync.repoName && (
          <FlexItem>
            <Label isCompact>{sync.repoName}</Label>
          </FlexItem>
        )}
      </Flex>

      {sync.log.length > 0 && (
        <ExpandableSection
          className="app-mt-xs"
          isExpanded={logExpanded}
          toggleText={logExpanded ? 'Hide log' : `Show log (${sync.log.length})`}
          onToggle={(_e, val) => setLogExpanded(val)}
        >
          <div className="app-sync-log">
            {sync.log.map((entry, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div className="app-sync-log-entry" key={i}>
                {entry}
              </div>
            ))}
          </div>
        </ExpandableSection>
      )}
    </div>
  );
};
