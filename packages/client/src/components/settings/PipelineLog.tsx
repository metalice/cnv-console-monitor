import { useState } from 'react';

import { ExpandableSection } from '@patternfly/react-core';

import { type PipelineLogEntry } from '../../api/poll';

import { levelColor } from './pipelineHelpers';

type PipelineLogProps = {
  log: PipelineLogEntry[];
  totalEntries?: number;
};

export const PipelineLog = ({ log, totalEntries }: PipelineLogProps) => {
  const [expanded, setExpanded] = useState(false);
  if (log.length === 0) {
    return null;
  }

  const all = [...log].reverse();
  const total = totalEntries ?? log.length;

  return (
    <ExpandableSection
      className="app-mt-sm"
      isExpanded={expanded}
      toggleText={`Activity Log (${total > log.length ? `${log.length} of ${total}` : log.length})`}
      onToggle={(_e, value) => setExpanded(value)}
    >
      <div className="app-max-h-300 app-text-xs app-mono-sm">
        {all.map((entry, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div className={levelColor(entry.level)} key={i}>
            {new Date(entry.timestamp).toLocaleTimeString()} [{entry.phase}] {entry.message}
          </div>
        ))}
      </div>
    </ExpandableSection>
  );
};
