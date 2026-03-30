import { useNavigate } from 'react-router-dom';

import { type TestItem } from '@cnv-monitor/shared';

import { Button, EmptyState, EmptyStateBody, Tooltip } from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

type CompareTestItemTableProps = {
  items: TestItem[];
  label: string;
};

export const CompareTestItemTable = ({ items, label }: CompareTestItemTableProps) => {
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <EmptyState headingLevel="h4" icon={CheckCircleIcon} titleText={`No ${label.toLowerCase()}`}>
        <EmptyStateBody>Nothing here.</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <div className="app-table-scroll">
      <Table aria-label={label} variant="compact">
        <Thead>
          <Tr>
            <Th>Test Name</Th>
            <Th>Error Message</Th>
          </Tr>
        </Thead>
        <Tbody>
          {items.map(item => {
            const shortName = item.name.split('.').pop() || item.name;
            return (
              <Tr key={item.rp_id}>
                <Td className="app-cell-truncate" dataLabel="Test Name">
                  <Tooltip content={item.name}>
                    {item.unique_id ? (
                      <Button
                        isInline
                        size="sm"
                        variant="link"
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        onClick={() => navigate(`/test/${encodeURIComponent(item.unique_id!)}`)}
                      >
                        {shortName}
                      </Button>
                    ) : (
                      <span>{shortName}</span>
                    )}
                  </Tooltip>
                </Td>
                <Td className="app-cell-truncate" dataLabel="Error">
                  {item.error_message ? (
                    <Tooltip content={item.error_message}>
                      <span className="app-text-xs app-text-muted">
                        {item.error_message.split('\n')[0]}
                      </span>
                    </Tooltip>
                  ) : (
                    '—'
                  )}
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </div>
  );
};
