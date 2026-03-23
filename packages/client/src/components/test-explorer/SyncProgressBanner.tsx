import React, { useState } from 'react';
import {
  Progress,
  ProgressSize,
  Content,
  ExpandableSection,
  Label,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { SyncAltIcon, CheckCircleIcon } from '@patternfly/react-icons';
import { useSyncProgress } from '../../hooks/useWebSocket';

export const SyncProgressBanner: React.FC = () => {
  const sync = useSyncProgress();
  const [logExpanded, setLogExpanded] = useState(false);

  if (!sync.active && sync.log.length === 0) return null;

  const percent = sync.total > 0 ? Math.round((sync.current / sync.total) * 100) : 0;
  const isComplete = sync.phase === 'complete';

  return (
    <div className="app-sync-banner">
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          {isComplete ? <CheckCircleIcon className="app-text-success" /> : <SyncAltIcon className={sync.active ? 'app-spin' : ''} />}
        </FlexItem>
        <FlexItem grow={{ default: 'grow' }}>
          {sync.active ? (
            <Progress
              value={percent}
              size={ProgressSize.sm}
              title={sync.message}
              label={`${sync.current}/${sync.total}`}
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
          toggleText={logExpanded ? 'Hide log' : `Show log (${sync.log.length})`}
          isExpanded={logExpanded}
          onToggle={(_e, val) => setLogExpanded(val)}
          className="app-mt-xs"
        >
          <div className="app-sync-log">
            {sync.log.map((entry, i) => (
              <div key={i} className="app-sync-log-entry">{entry}</div>
            ))}
          </div>
        </ExpandableSection>
      )}
    </div>
  );
};
