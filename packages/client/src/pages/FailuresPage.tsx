import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Label,
  Flex,
  FlexItem,
  EmptyState,
  EmptyStateBody,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { CheckCircleIcon, WrenchIcon, BugIcon } from '@patternfly/react-icons';
import { fetchUntriagedItems } from '../api/testItems';
import { StatusBadge } from '../components/common/StatusBadge';
import { TriageModal } from '../components/modals/TriageModal';
import { JiraCreateModal } from '../components/modals/JiraCreateModal';
import type { TestItem } from '@cnv-monitor/shared';

export const FailuresPage: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [triageOpen, setTriageOpen] = useState(false);
  const [jiraCreateItem, setJiraCreateItem] = useState<TestItem | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ['untriaged'],
    queryFn: () => fetchUntriagedItems(24),
  });

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked && items ? items.map((i) => i.rp_id) : []);
  };

  const handleSelect = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
  };

  const allSelected = items ? selectedIds.length === items.length && items.length > 0 : false;

  return (
    <>
      <PageSection>
        <Content component="h1">Untriaged Failures</Content>
        <Content component="small">Test items that need classification</Content>
      </PageSection>

      <PageSection>
        <Card>
          <CardBody>
            {selectedIds.length > 0 && (
              <Toolbar>
                <ToolbarContent>
                  <ToolbarItem>
                    <Content>{selectedIds.length} selected</Content>
                  </ToolbarItem>
                  <ToolbarItem>
                    <Button variant="primary" icon={<WrenchIcon />} onClick={() => setTriageOpen(true)}>
                      Classify Selected
                    </Button>
                  </ToolbarItem>
                </ToolbarContent>
              </Toolbar>
            )}

            {isLoading ? (
              <Content>Loading...</Content>
            ) : !items?.length ? (
              <EmptyState icon={CheckCircleIcon} headingLevel="h4" titleText="All caught up!">
                <EmptyStateBody>No untriaged failures.</EmptyStateBody>
              </EmptyState>
            ) : (
              <Table aria-label="Untriaged failures">
                <Thead>
                  <Tr>
                    <Th select={{ isSelected: allSelected, onSelect: (_e, checked) => handleSelectAll(checked) }} />
                    <Th>Test Name</Th>
                    <Th>Status</Th>
                    <Th>Polarion</Th>
                    <Th>AI Prediction</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {items.map((item) => {
                    const shortName = item.name.split('.').pop() || item.name;
                    return (
                      <Tr key={item.rp_id}>
                        <Td select={{ isSelected: selectedIds.includes(item.rp_id), onSelect: (_e, checked) => handleSelect(item.rp_id, checked), rowIndex: item.rp_id }} />
                        <Td dataLabel="Test Name">{shortName}</Td>
                        <Td dataLabel="Status"><StatusBadge status={item.status} /></Td>
                        <Td dataLabel="Polarion">
                          {item.polarion_id && <Label color="blue" isCompact>{item.polarion_id}</Label>}
                        </Td>
                        <Td dataLabel="AI">
                          {item.ai_prediction && (
                            <Label isCompact color={item.ai_prediction.includes('Product') ? 'red' : 'orange'}>
                              {item.ai_prediction.replace('Predicted ', '')} {item.ai_confidence}%
                            </Label>
                          )}
                        </Td>
                        <Td dataLabel="Actions">
                          <Flex>
                            <FlexItem>
                              <Button variant="link" isInline icon={<WrenchIcon />} onClick={() => { setSelectedIds([item.rp_id]); setTriageOpen(true); }}>Classify</Button>
                            </FlexItem>
                            <FlexItem>
                              <Button variant="link" isInline icon={<BugIcon />} onClick={() => setJiraCreateItem(item)}>Bug</Button>
                            </FlexItem>
                          </Flex>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </PageSection>

      <TriageModal isOpen={triageOpen} onClose={() => { setTriageOpen(false); setSelectedIds([]); }} itemIds={selectedIds} />
      {jiraCreateItem && (
        <JiraCreateModal
          isOpen
          onClose={() => setJiraCreateItem(null)}
          testItemId={jiraCreateItem.rp_id}
          testName={jiraCreateItem.name}
          polarionId={jiraCreateItem.polarion_id}
        />
      )}
    </>
  );
};
