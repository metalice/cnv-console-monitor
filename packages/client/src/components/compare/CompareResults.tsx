import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { TestItem } from '@cnv-monitor/shared';

import {
  Button,
  Card,
  CardBody,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
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
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import type { CompareResult } from '../../api/compare';
import { StatCard } from '../common/StatCard';

type CompareResultsProps = {
  result: CompareResult;
  onReset: () => void;
};

const diffField = (
  valA: string | null,
  valB: string | null,
  label: string,
): React.ReactNode | null => {
  if (valA === valB) {
    return null;
  }
  return (
    <DescriptionListGroup key={label}>
      <DescriptionListTerm>{label}</DescriptionListTerm>
      <DescriptionListDescription>
        <span className="app-text-muted app-text-line-through">{valA ?? '—'}</span>
        {' → '}
        <strong>{valB ?? '—'}</strong>
      </DescriptionListDescription>
    </DescriptionListGroup>
  );
};

const TestItemTable: React.FC<{ items: TestItem[]; label: string }> = ({ items, label }) => {
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

export const CompareResults: React.FC<CompareResultsProps> = ({ onReset, result }) => {
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
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        className="app-mb-md"
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
      >
        <FlexItem>
          <Content component="h3">
            Run #{result.launchA.rp_id} vs #{result.launchB.rp_id}
          </Content>
        </FlexItem>
        <FlexItem>
          <Button size="sm" variant="link" onClick={onReset}>
            Pick different runs
          </Button>
        </FlexItem>
      </Flex>

      <Gallery hasGutter className="app-mb-md" minWidths={{ default: '200px' }}>
        <GalleryItem>
          <StatCard
            color="var(--pf-t--global--color--status--danger--default)"
            help="Tests that passed in A but failed in B"
            label="Regressions"
            value={summary.regressions}
          />
        </GalleryItem>
        <GalleryItem>
          <StatCard
            color="var(--pf-t--global--color--status--success--default)"
            help="Tests that failed in A but passed in B"
            label="Fixes"
            value={summary.fixes}
          />
        </GalleryItem>
        <GalleryItem>
          <StatCard
            help="Tests that failed in both runs"
            label="Persistent"
            value={summary.persistent}
          />
        </GalleryItem>
      </Gallery>

      {diffs.length > 0 && (
        <Card isCompact className="app-mb-md">
          <CardBody>
            <Content className="app-mb-sm" component="h4">
              Environment Changes
            </Content>
            <DescriptionList isCompact isHorizontal>
              {diffs}
            </DescriptionList>
          </CardBody>
        </Card>
      )}

      <Card className="app-mb-md">
        <CardBody>
          <ExpandableSection
            isExpanded={regressionsOpen}
            toggleContent={
              <Label isCompact color="red" icon={<ArrowDownIcon />}>
                Regressions ({summary.regressions})
              </Label>
            }
            onToggle={(_e, v) => setRegressionsOpen(v)}
          >
            <TestItemTable items={result.regressions} label="Regressions" />
          </ExpandableSection>
        </CardBody>
      </Card>

      <Card className="app-mb-md">
        <CardBody>
          <ExpandableSection
            isExpanded={fixesOpen}
            toggleContent={
              <Label isCompact color="green" icon={<ArrowUpIcon />}>
                Fixes ({summary.fixes})
              </Label>
            }
            onToggle={(_e, v) => setFixesOpen(v)}
          >
            <TestItemTable items={result.fixes} label="Fixes" />
          </ExpandableSection>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <ExpandableSection
            isExpanded={persistentOpen}
            toggleContent={
              <Label isCompact color="grey" icon={<ExclamationCircleIcon />}>
                Persistent Failures ({summary.persistent})
              </Label>
            }
            onToggle={(_e, v) => setPersistentOpen(v)}
          >
            <TestItemTable items={result.persistent} label="Persistent failures" />
          </ExpandableSection>
        </CardBody>
      </Card>
    </>
  );
};
