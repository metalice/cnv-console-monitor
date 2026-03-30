import { Button, Card, CardBody, CardTitle, Content, Flex, FlexItem } from '@patternfly/react-core';
import { Table, Tbody, Th, Thead, Tr } from '@patternfly/react-table';

import type { LaunchGroup, LaunchRun } from '../../api/compare';

import { CompareRunRow } from './CompareRunRow';

type CompareRunPickerProps = {
  selectedGroup: LaunchGroup;
  selectedRunA: number | null;
  selectedRunB: number | null;
  onSelectRunA: (id: number | null) => void;
  onSelectRunB: (id: number | null) => void;
  onCompare: () => void;
  onClearLaunch: () => void;
  isComparing: boolean;
};

export const CompareRunPicker = ({
  isComparing,
  onClearLaunch,
  onCompare,
  onSelectRunA,
  onSelectRunB,
  selectedGroup,
  selectedRunA,
  selectedRunB,
}: CompareRunPickerProps) => {
  const handleRunClick = (run: LaunchRun) => {
    if (selectedRunA === run.rp_id) {
      onSelectRunA(null);
      return;
    }
    if (selectedRunB === run.rp_id) {
      onSelectRunB(null);
      return;
    }
    if (!selectedRunA) {
      onSelectRunA(run.rp_id);
      return;
    }
    if (!selectedRunB) {
      onSelectRunB(run.rp_id);
      return;
    }
    onSelectRunB(run.rp_id);
  };

  return (
    <Card>
      <CardTitle>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            Step 2: Select two runs of{' '}
            <strong>
              {selectedGroup.cnvVersion} {selectedGroup.tier}
            </strong>
          </FlexItem>
          <FlexItem>
            <Button size="sm" variant="link" onClick={onClearLaunch}>
              Change launch
            </Button>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Content className="app-mb-sm app-text-muted" component="small">
          Click a row to set it as Run A (baseline), click another for Run B (compare). Then press
          Compare.
        </Content>
        <Table aria-label="Select runs" variant="compact">
          <Thead>
            <Tr>
              <Th>Role</Th>
              <Th>Run #</Th>
              <Th>Status</Th>
              <Th>Passed</Th>
              <Th>Failed</Th>
              <Th>Cluster</Th>
              <Th>Date</Th>
            </Tr>
          </Thead>
          <Tbody>
            {selectedGroup.runs.map(run => (
              <CompareRunRow
                isRunA={selectedRunA === run.rp_id}
                isRunB={selectedRunB === run.rp_id}
                key={run.rp_id}
                run={run}
                onClick={handleRunClick}
              />
            ))}
          </Tbody>
        </Table>

        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          className="app-mt-md"
          gap={{ default: 'gapMd' }}
        >
          <FlexItem>
            <Button
              isDisabled={!selectedRunA || !selectedRunB || selectedRunA === selectedRunB}
              isLoading={isComparing}
              variant="primary"
              onClick={onCompare}
            >
              Compare
            </Button>
          </FlexItem>
          {selectedRunA && selectedRunB && selectedRunA === selectedRunB && (
            <FlexItem>
              <Content className="app-text-danger" component="small">
                Select two different runs.
              </Content>
            </FlexItem>
          )}
        </Flex>
      </CardBody>
    </Card>
  );
};
