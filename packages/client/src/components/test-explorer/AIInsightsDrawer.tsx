import React from 'react';

import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Label,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { useQuery } from '@tanstack/react-query';

import { fetchGaps } from '../../api/testExplorer';

type AIInsightsDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  component?: string;
  children: React.ReactNode;
};

const severityColor = (severity: string): 'red' | 'orange' | 'blue' => {
  switch (severity) {
    case 'error':
      return 'red';
    case 'warning':
      return 'orange';
    default:
      return 'blue';
  }
};

export const AIInsightsDrawer: React.FC<AIInsightsDrawerProps> = ({
  children,
  component,
  isOpen,
  onClose,
}) => {
  const { data, isLoading } = useQuery({
    enabled: isOpen,
    queryFn: () => fetchGaps(component),
    queryKey: ['gaps', component],
    staleTime: 60_000,
  });

  const panelContent = (
    <DrawerPanelContent widths={{ default: 'width_50' }}>
      <DrawerHead>
        <Title headingLevel="h3">AI Insights</Title>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        {isLoading ? (
          <div className="app-page-spinner">
            <Spinner />
          </div>
        ) : (
          <>
            <DescriptionList isCompact isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>Total Gaps</DescriptionListTerm>
                <DescriptionListDescription>{data?.total ?? 0}</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>

            <Title className="app-mt-lg" headingLevel="h4">
              Gaps
            </Title>
            <Table className="app-mt-md" variant="compact">
              <Thead>
                <Tr>
                  <Th>Type</Th>
                  <Th>Severity</Th>
                  <Th>File</Th>
                  <Th>Repo</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data?.gaps.map((gap: Record<string, unknown>, i: number) => (
                  <Tr key={i}>
                    <Td>
                      <Label isCompact>{String(gap.type).replace('_', ' ')}</Label>
                    </Td>
                    <Td>
                      <Label isCompact color={severityColor(gap.severity as string)}>
                        {gap.severity as string}
                      </Label>
                    </Td>
                    <Td className="app-text-mono">{(gap.filePath as string).split('/').pop()}</Td>
                    <Td>{gap.repoName as string}</Td>
                  </Tr>
                ))}
                {(!data?.gaps || data.gaps.length === 0) && (
                  <Tr>
                    <Td colSpan={4}>
                      <em>No gaps detected</em>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </>
        )}
      </DrawerPanelBody>
    </DrawerPanelContent>
  );

  return (
    <Drawer
      isExpanded={isOpen}
      onExpand={() => {
        // no-op
      }}
    >
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>{children}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};
