import { Card, CardBody, CardTitle, EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { Table, Tbody, Th, Thead, Tr } from '@patternfly/react-table';

type SimpleTableProps = {
  label: string;
  headers: string[];
  items: unknown[];
  renderRow: (item: never, i: number) => React.ReactNode;
  emptyText: string;
};

export const SimpleTable = ({ emptyText, headers, items, label, renderRow }: SimpleTableProps) => (
  <Card>
    <CardTitle>
      {label} ({items.length})
    </CardTitle>
    <CardBody>
      {items.length === 0 ? (
        <EmptyState>
          <EmptyStateBody>{emptyText}</EmptyStateBody>
        </EmptyState>
      ) : (
        <div className="app-table-scroll">
          <Table aria-label={label} variant="compact">
            <Thead>
              <Tr>
                {headers.map(header => (
                  <Th key={header}>{header}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>{items.map((item, i) => renderRow(item as never, i))}</Tbody>
          </Table>
        </div>
      )}
    </CardBody>
  </Card>
);
