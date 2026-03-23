import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DrawerPanelContent,
  DrawerHead,
  DrawerPanelBody,
  DrawerActions,
  DrawerCloseButton,
  Title,
  Label,
  Spinner,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { fetchGaps } from '../../api/testExplorer';

interface AIInsightsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  component?: string;
  children: React.ReactNode;
}

const severityColor = (severity: string): 'red' | 'orange' | 'blue' => {
  switch (severity) {
    case 'error': return 'red';
    case 'warning': return 'orange';
    default: return 'blue';
  }
};

export const AIInsightsDrawer: React.FC<AIInsightsDrawerProps> = ({ isOpen, onClose, component, children }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['gaps', component],
    queryFn: () => fetchGaps(component),
    enabled: isOpen,
    staleTime: 60_000,
  });

  const panelContent = (
    <DrawerPanelContent widths={{ default: 'width_50' }}>
      <DrawerHead>
        <Title headingLevel="h3">AI Insights</Title>
        <DrawerActions><DrawerCloseButton onClick={onClose} /></DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        {isLoading ? (
          <div className="app-page-spinner"><Spinner /></div>
        ) : (
          <>
            <DescriptionList isHorizontal isCompact>
              <DescriptionListGroup>
                <DescriptionListTerm>Total Gaps</DescriptionListTerm>
                <DescriptionListDescription>{data?.total ?? 0}</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>

            <Title headingLevel="h4" className="app-mt-lg">Gaps</Title>
            <Table variant="compact" className="app-mt-md">
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
                    <Td><Label isCompact>{String(gap.type).replace('_', ' ')}</Label></Td>
                    <Td><Label color={severityColor(gap.severity as string)} isCompact>{gap.severity as string}</Label></Td>
                    <Td className="app-text-mono">{(gap.filePath as string).split('/').pop()}</Td>
                    <Td>{gap.repoName as string}</Td>
                  </Tr>
                ))}
                {(!data?.gaps || data.gaps.length === 0) && (
                  <Tr><Td colSpan={4}><em>No gaps detected</em></Td></Tr>
                )}
              </Tbody>
            </Table>
          </>
        )}
      </DrawerPanelBody>
    </DrawerPanelContent>
  );

  return (
    <Drawer isExpanded={isOpen} onExpand={() => {}}>
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>{children}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};
