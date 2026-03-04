import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  Button,
  Flex,
  FlexItem,
  Label,
  ExpandableSection,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Divider,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { SearchIcon, WrenchIcon, BugIcon, LinkIcon } from '@patternfly/react-icons';
import type { TestItem } from '@cnv-monitor/shared';
import { fetchTestItems } from '../api/testItems';
import { triggerAutoAnalysis, triggerPatternAnalysis, triggerUniqueErrorAnalysis } from '../api/analysis';
import { StatusBadge } from '../components/common/StatusBadge';
import { LogViewer } from '../components/detail/LogViewer';
import { SimilarFailuresPanel } from '../components/detail/SimilarFailuresPanel';
import { TriageModal } from '../components/modals/TriageModal';
import { JiraCreateModal } from '../components/modals/JiraCreateModal';
import { JiraLinkModal } from '../components/modals/JiraLinkModal';

export const LaunchDetailPage: React.FC = () => {
  const { launchId } = useParams<{ launchId: string }>();
  const id = parseInt(launchId || '0');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [triageItem, setTriageItem] = useState<number | null>(null);
  const [jiraCreateItem, setJiraCreateItem] = useState<TestItem | null>(null);
  const [jiraLinkItem, setJiraLinkItem] = useState<number | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ['testItems', id],
    queryFn: () => fetchTestItems(id),
    enabled: id > 0,
  });

  const toggleExpand = (itemId: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const failedItems = items?.filter((i) => i.status === 'FAILED') || [];
  const passedItems = items?.filter((i) => i.status === 'PASSED') || [];
  const skippedItems = items?.filter((i) => i.status === 'SKIPPED') || [];

  return (
    <>
      <PageSection variant="light">
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Content component="h1">Launch #{id}</Content>
            <Content component="small">
              {items ? `${passedItems.length} passed / ${failedItems.length} failed / ${skippedItems.length} skipped` : 'Loading...'}
            </Content>
          </FlexItem>
          <FlexItem>
            <Toolbar>
              <ToolbarContent>
                <ToolbarItem>
                  <Button variant="secondary" icon={<SearchIcon />} onClick={() => triggerAutoAnalysis(id)}>Auto-Analysis</Button>
                </ToolbarItem>
                <ToolbarItem>
                  <Button variant="secondary" icon={<WrenchIcon />} onClick={() => triggerPatternAnalysis(id)}>Pattern Analysis</Button>
                </ToolbarItem>
                <ToolbarItem>
                  <Button variant="secondary" onClick={() => triggerUniqueErrorAnalysis(id)}>Unique Error</Button>
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        {isLoading ? (
          <Content>Loading test items...</Content>
        ) : (
          <Card>
            <CardBody>
              <Table aria-label="Test items table">
                <Thead>
                  <Tr>
                    <Th />
                    <Th>Test Name</Th>
                    <Th>Status</Th>
                    <Th>Polarion</Th>
                    <Th>AI Prediction</Th>
                    <Th>Jira</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {failedItems.map((item) => {
                    const isExpanded = expandedItems.has(item.rp_id);
                    const shortName = item.name.split('.').pop() || item.name;
                    return (
                      <React.Fragment key={item.rp_id}>
                        <Tr>
                          <Td
                            expand={{ isExpanded, onToggle: () => toggleExpand(item.rp_id), rowIndex: item.rp_id }}
                          />
                          <Td dataLabel="Test Name">{shortName}</Td>
                          <Td dataLabel="Status"><StatusBadge status={item.status} /></Td>
                          <Td dataLabel="Polarion">
                            {item.polarion_id && <Label color="blue" isCompact>{item.polarion_id}</Label>}
                          </Td>
                          <Td dataLabel="AI">
                            {item.ai_prediction && (
                              <Label
                                isCompact
                                color={item.ai_prediction.includes('Product') ? 'red' : item.ai_prediction.includes('System') ? 'orange' : 'grey'}
                              >
                                {item.ai_prediction.replace('Predicted ', '')} {item.ai_confidence}%
                              </Label>
                            )}
                          </Td>
                          <Td dataLabel="Jira">
                            {item.jira_key && <Label color="blue" isCompact>{item.jira_key} ({item.jira_status})</Label>}
                          </Td>
                          <Td dataLabel="Actions">
                            <Flex>
                              <FlexItem>
                                <Button variant="link" isInline icon={<WrenchIcon />} onClick={() => setTriageItem(item.rp_id)}>Classify</Button>
                              </FlexItem>
                              <FlexItem>
                                <Button variant="link" isInline icon={<BugIcon />} onClick={() => setJiraCreateItem(item)}>Bug</Button>
                              </FlexItem>
                              <FlexItem>
                                <Button variant="link" isInline icon={<LinkIcon />} onClick={() => setJiraLinkItem(item.rp_id)}>Link</Button>
                              </FlexItem>
                            </Flex>
                          </Td>
                        </Tr>
                        {isExpanded && (
                          <Tr isExpanded>
                            <Td colSpan={7} noPadding={false}>
                              <ExpandableSection toggleText="Error Logs" isExpanded>
                                <LogViewer itemId={item.rp_id} />
                              </ExpandableSection>
                              <Divider style={{ margin: '16px 0' }} />
                              {item.unique_id && (
                                <ExpandableSection toggleText="Similar Failures History" isExpanded>
                                  <SimilarFailuresPanel uniqueId={item.unique_id} />
                                </ExpandableSection>
                              )}
                            </Td>
                          </Tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </Tbody>
              </Table>
            </CardBody>
          </Card>
        )}
      </PageSection>

      {triageItem && (
        <TriageModal isOpen onClose={() => setTriageItem(null)} itemIds={[triageItem]} />
      )}
      {jiraCreateItem && (
        <JiraCreateModal
          isOpen
          onClose={() => setJiraCreateItem(null)}
          testItemId={jiraCreateItem.rp_id}
          testName={jiraCreateItem.name}
          polarionId={jiraCreateItem.polarion_id}
        />
      )}
      {jiraLinkItem && (
        <JiraLinkModal isOpen onClose={() => setJiraLinkItem(null)} testItemId={jiraLinkItem} />
      )}
    </>
  );
};
