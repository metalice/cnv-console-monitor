import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  Content,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  EmptyState,
  EmptyStateBody,
  ExpandableSection,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  Label,
  Tooltip,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { ArrowDownIcon, ArrowUpIcon, ExclamationCircleIcon, CheckCircleIcon } from '@patternfly/react-icons';
import type { TestItem } from '@cnv-monitor/shared';
import { StatCard } from '../common/StatCard';
import type { CompareResult } from '../../api/compare';

type CompareResultsProps = {
  result: CompareResult;
  onReset: () => void;
};

const diffField = (valA: string | null, valB: string | null, label: string): React.ReactNode | null => {
  if (valA === valB) return null;
  return (
    <DescriptionListGroup key={label}>
      <DescriptionListTerm>{label}</DescriptionListTerm>
      <DescriptionListDescription>
        <span className="app-text-muted app-text-line-through">{valA ?? '—'}</span>{' → '}<strong>{valB ?? '—'}</strong>
      </DescriptionListDescription>
    </DescriptionListGroup>
  );
};

const TestItemTable: React.FC<{ items: TestItem[]; label: string }> = ({ items, label }) => {
  const navigate = useNavigate();
  if (items.length === 0) {
    return (
      <EmptyState headingLevel="h4" titleText={`No ${label.toLowerCase()}`} icon={CheckCircleIcon}>
        <EmptyStateBody>Nothing here.</EmptyStateBody>
      </EmptyState>
    );
  }
  return (
    <div className="app-table-scroll">
      <Table aria-label={label} variant="compact">
        <Thead><Tr><Th>Test Name</Th><Th>Error Message</Th></Tr></Thead>
        <Tbody>
          {items.map((item) => {
            const shortName = item.name.split('.').pop() || item.name;
            return (
              <Tr key={item.rp_id}>
                <Td dataLabel="Test Name" className="app-cell-truncate">
                  <Tooltip content={item.name}>
                    {item.unique_id ? (
                      <Button variant="link" isInline size="sm" onClick={() => navigate(`/test/${encodeURIComponent(item.unique_id!)}`)}>
                        {shortName}
                      </Button>
                    ) : <span>{shortName}</span>}
                  </Tooltip>
                </Td>
                <Td dataLabel="Error" className="app-cell-truncate">
                  {item.error_message ? (
                    <Tooltip content={item.error_message}><span className="app-text-xs app-text-muted">{item.error_message.split('\n')[0]}</span></Tooltip>
                  ) : '—'}
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </div>
  );
};

export const CompareResults: React.FC<CompareResultsProps> = ({ result, onReset }) => {
  const [regressionsOpen, setRegressionsOpen] = useState(true);
  const [fixesOpen, setFixesOpen] = useState(true);
  const [persistentOpen, setPersistentOpen] = useState(false);
  const { summary } = result;

  const diffs = [
    diffField(result.launchA.cnv_version, result.launchB.cnv_version, 'CNV Version'),
    diffField(result.launchA.ocp_version, result.launchB.ocp_version, 'OCP Version'),
    diffField(result.launchA.cluster_name, result.launchB.cluster_name, 'Cluster'),
    diffField(result.launchA.status, result.launchB.status, 'Status'),
  ].filter(Boolean);

  return (
    <>
      <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} className="app-mb-md">
        <FlexItem><Content component="h3">Run #{result.launchA.rp_id} vs #{result.launchB.rp_id}</Content></FlexItem>
        <FlexItem><Button variant="link" size="sm" onClick={onReset}>Pick different runs</Button></FlexItem>
      </Flex>

      <Gallery hasGutter minWidths={{ default: '200px' }} className="app-mb-md">
        <GalleryItem><StatCard value={summary.regressions} label="Regressions" help="Tests that passed in A but failed in B" color="var(--pf-t--global--color--status--danger--default)" /></GalleryItem>
        <GalleryItem><StatCard value={summary.fixes} label="Fixes" help="Tests that failed in A but passed in B" color="var(--pf-t--global--color--status--success--default)" /></GalleryItem>
        <GalleryItem><StatCard value={summary.persistent} label="Persistent" help="Tests that failed in both runs" /></GalleryItem>
      </Gallery>

      {diffs.length > 0 && (
        <Card isCompact className="app-mb-md">
          <CardBody>
            <Content component="h4" className="app-mb-sm">Environment Changes</Content>
            <DescriptionList isHorizontal isCompact>{diffs}</DescriptionList>
          </CardBody>
        </Card>
      )}

      <Card className="app-mb-md">
        <CardBody>
          <ExpandableSection toggleContent={<Label color="red" icon={<ArrowDownIcon />} isCompact>Regressions ({summary.regressions})</Label>} isExpanded={regressionsOpen} onToggle={(_e, v) => setRegressionsOpen(v)}>
            <TestItemTable items={result.regressions} label="Regressions" />
          </ExpandableSection>
        </CardBody>
      </Card>

      <Card className="app-mb-md">
        <CardBody>
          <ExpandableSection toggleContent={<Label color="green" icon={<ArrowUpIcon />} isCompact>Fixes ({summary.fixes})</Label>} isExpanded={fixesOpen} onToggle={(_e, v) => setFixesOpen(v)}>
            <TestItemTable items={result.fixes} label="Fixes" />
          </ExpandableSection>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <ExpandableSection toggleContent={<Label color="grey" icon={<ExclamationCircleIcon />} isCompact>Persistent Failures ({summary.persistent})</Label>} isExpanded={persistentOpen} onToggle={(_e, v) => setPersistentOpen(v)}>
            <TestItemTable items={result.persistent} label="Persistent failures" />
          </ExpandableSection>
        </CardBody>
      </Card>
    </>
  );
};
