import { Label, Tooltip } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';

import type { LaunchRun } from '../../api/compare';
import { StatusBadge } from '../common/StatusBadge';

const formatDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString('en-US', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  });

type CompareRunRowProps = {
  run: LaunchRun;
  isRunA: boolean;
  isRunB: boolean;
  onClick: (run: LaunchRun) => void;
};

export const CompareRunRow = ({ isRunA, isRunB, onClick, run }: CompareRunRowProps) => (
  <Tr
    isClickable
    className="app-cursor-pointer"
    isRowSelected={isRunA || isRunB}
    key={run.rp_id}
    onRowClick={() => onClick(run)}
  >
    <Td className="app-cell-nowrap">
      {isRunA && (
        <Label isCompact color="blue">
          A (baseline)
        </Label>
      )}
      {isRunB && (
        <Label isCompact color="orange">
          B (compare)
        </Label>
      )}
    </Td>
    <Td className="app-cell-nowrap">
      <strong>#{run.number}</strong>
    </Td>
    <Td className="app-cell-nowrap">
      <StatusBadge status={run.status} />
    </Td>
    <Td className="app-cell-nowrap">
      {run.passed}/{run.total}
    </Td>
    <Td className="app-cell-nowrap">
      {run.failed > 0 ? (
        <Label isCompact color="red">
          {run.failed}
        </Label>
      ) : (
        '0'
      )}
    </Td>
    <Td className="app-cell-truncate">
      <Tooltip content={run.cluster_name ?? '—'}>
        <span>{run.cluster_name ?? '—'}</span>
      </Tooltip>
    </Td>
    <Td className="app-cell-nowrap">{formatDate(run.start_time)}</Td>
  </Tr>
);
