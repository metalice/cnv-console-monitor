import { useState } from 'react';

import {
  Content,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  Progress,
  ProgressSize,
} from '@patternfly/react-core';
import { CheckCircleIcon, MagicIcon } from '@patternfly/react-icons';

import { useDocGenProgress } from '../../hooks/useWebSocket';

export const GenerateProgressBanner = () => {
  const docGen = useDocGenProgress();
  const [logExpanded, setLogExpanded] = useState(false);

  if (!docGen.active && docGen.log.length === 0) {
    return null;
  }

  const percent = docGen.total > 0 ? Math.round((docGen.current / docGen.total) * 100) : 0;
  const isComplete = docGen.phase === 'complete';

  return (
    <div className="app-docgen-banner">
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          {isComplete ? (
            <CheckCircleIcon className="app-text-success" />
          ) : (
            <MagicIcon className={docGen.active ? 'app-spin' : ''} />
          )}
        </FlexItem>
        <FlexItem grow={{ default: 'grow' }}>
          {docGen.active ? (
            <Progress
              label={`Generating docs (${docGen.current}/${docGen.total})...`}
              size={ProgressSize.sm}
              title={docGen.message}
              value={percent}
            />
          ) : (
            <Content component="small">{docGen.message || 'Generation complete'}</Content>
          )}
        </FlexItem>
        {docGen.total > 0 && (
          <FlexItem>
            <Label isCompact>
              {docGen.current}/{docGen.total}
            </Label>
          </FlexItem>
        )}
      </Flex>

      {docGen.log.length > 0 && (
        <ExpandableSection
          className="app-mt-xs"
          isExpanded={logExpanded}
          toggleText={logExpanded ? 'Hide log' : `Show log (${docGen.log.length})`}
          onToggle={(_e, val) => setLogExpanded(val)}
        >
          <div className="app-sync-log">
            {docGen.log.map((entry, i) => (
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
