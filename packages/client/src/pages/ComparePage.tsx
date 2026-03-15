import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  Flex,
  FlexItem,
  TextInput,
  Button,
  Gallery,
  GalleryItem,
  ExpandableSection,
  Label,
  Spinner,
  EmptyState,
  EmptyStateBody,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Bullseye,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  SearchIcon,
} from '@patternfly/react-icons';
import type { TestItem } from '@cnv-monitor/shared';
import { fetchCompare, type CompareResult, type LaunchSummary } from '../api/compare';
import { StatCard } from '../components/common/StatCard';

function diffField(a: string | null, b: string | null, label: string): React.ReactNode | null {
  if (a === b) return null;
  return (
    <DescriptionListGroup key={label}>
      <DescriptionListTerm>{label}</DescriptionListTerm>
      <DescriptionListDescription>
        <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{a ?? '—'}</span>
        {' → '}
        <strong>{b ?? '—'}</strong>
      </DescriptionListDescription>
    </DescriptionListGroup>
  );
}

function TestItemTable({ items, navigate, label }: { items: TestItem[]; navigate: ReturnType<typeof useNavigate>; label: string }): React.JSX.Element {
  if (items.length === 0) {
    return (
      <EmptyState headingLevel="h4" titleText={`No ${label.toLowerCase()}`} icon={CheckCircleIcon}>
        <EmptyStateBody>Nothing here.</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <div className="app-table-scroll">
      <Table aria-label={label} variant="compact" isStickyHeader>
        <Thead>
          <Tr>
            <Th width={60}>Test Name</Th>
            <Th width={40}>Error Message</Th>
          </Tr>
        </Thead>
        <Tbody>
          {items.map((item) => {
            const shortName = item.name.split('.').pop() || item.name;
            return (
              <Tr key={item.rp_id}>
                <Td dataLabel="Test Name" className="app-cell-truncate">
                  {item.unique_id ? (
                    <Button
                      variant="link"
                      isInline
                      size="sm"
                      onClick={() => navigate(`/test/${encodeURIComponent(item.unique_id!)}`)}
                    >
                      {shortName}
                    </Button>
                  ) : (
                    shortName
                  )}
                </Td>
                <Td dataLabel="Error Message" className="app-cell-truncate">
                  <span style={{ fontSize: 'var(--pf-t--global--font--size--xs)', opacity: 0.8 }}>
                    {item.error_message || '—'}
                  </span>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </div>
  );
}

function EnvironmentDiff({ a, b }: { a: LaunchSummary; b: LaunchSummary }): React.JSX.Element | null {
  const diffs = [
    diffField(a.cnv_version, b.cnv_version, 'CNV Version'),
    diffField(a.ocp_version, b.ocp_version, 'OCP Version'),
    diffField(a.cluster_name, b.cluster_name, 'Cluster'),
    diffField(a.tier, b.tier, 'Tier'),
    diffField(a.status, b.status, 'Status'),
  ].filter(Boolean);

  if (diffs.length === 0) return null;

  return (
    <Card isCompact>
      <CardBody>
        <Content component="h3" style={{ marginBottom: 8 }}>Environment Changes</Content>
        <DescriptionList isHorizontal isCompact>
          {diffs}
        </DescriptionList>
      </CardBody>
    </Card>
  );
}

export const ComparePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => { document.title = 'Compare Launches | CNV Console Monitor'; }, []);

  const paramA = searchParams.get('a') ?? '';
  const paramB = searchParams.get('b') ?? '';

  const [inputA, setInputA] = useState(paramA);
  const [inputB, setInputB] = useState(paramB);

  useEffect(() => {
    setInputA(paramA);
    setInputB(paramB);
  }, [paramA, paramB]);

  const queryA = paramA ? parseInt(paramA, 10) : NaN;
  const queryB = paramB ? parseInt(paramB, 10) : NaN;
  const hasValidParams = !isNaN(queryA) && !isNaN(queryB);

  const { data, isLoading, error } = useQuery<CompareResult>({
    queryKey: ['compare', queryA, queryB],
    queryFn: () => fetchCompare(queryA, queryB),
    enabled: hasValidParams,
  });

  const handleCompare = () => {
    const a = inputA.trim();
    const b = inputB.trim();
    if (a && b) {
      setSearchParams({ a, b });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCompare();
  };

  const [regressionsOpen, setRegressionsOpen] = useState(true);
  const [fixesOpen, setFixesOpen] = useState(true);
  const [persistentOpen, setPersistentOpen] = useState(false);

  const summary = data?.summary;

  return (
    <>
      <PageSection>
        <Content component="h1">Compare Launches</Content>
        <Content component="small">Compare two launches side-by-side to find regressions and fixes</Content>
      </PageSection>

      <PageSection>
        <Card isCompact>
          <CardBody>
            <Flex alignItems={{ default: 'alignItemsFlexEnd' }} gap={{ default: 'gapMd' }}>
              <FlexItem>
                <Content component="small" style={{ marginBottom: 4 }}>Launch A (baseline)</Content>
                <TextInput
                  aria-label="Launch A ID"
                  placeholder="e.g. 12345"
                  value={inputA}
                  onChange={(_e, val) => setInputA(val)}
                  onKeyDown={handleKeyDown}
                  type="number"
                />
              </FlexItem>
              <FlexItem>
                <Content component="small" style={{ marginBottom: 4 }}>Launch B (compare)</Content>
                <TextInput
                  aria-label="Launch B ID"
                  placeholder="e.g. 12346"
                  value={inputB}
                  onChange={(_e, val) => setInputB(val)}
                  onKeyDown={handleKeyDown}
                  type="number"
                />
              </FlexItem>
              <FlexItem>
                <Button
                  variant="primary"
                  onClick={handleCompare}
                  isDisabled={!inputA.trim() || !inputB.trim()}
                  icon={<SearchIcon />}
                >
                  Compare
                </Button>
              </FlexItem>
            </Flex>
          </CardBody>
        </Card>
      </PageSection>

      {isLoading && (
        <PageSection>
          <Bullseye style={{ minHeight: 200 }}>
            <Spinner aria-label="Comparing launches" />
          </Bullseye>
        </PageSection>
      )}

      {error && (
        <PageSection>
          <EmptyState headingLevel="h4" titleText="Comparison failed" icon={ExclamationCircleIcon}>
            <EmptyStateBody>{(error as Error).message}</EmptyStateBody>
          </EmptyState>
        </PageSection>
      )}

      {data && summary && (
        <>
          <PageSection>
            <Gallery hasGutter minWidths={{ default: '200px' }}>
              <GalleryItem>
                <StatCard
                  value={summary.regressions}
                  label="Regressions"
                  help="Tests that passed in Launch A but failed in Launch B"
                  color="var(--pf-t--global--color--status--danger--default)"
                />
              </GalleryItem>
              <GalleryItem>
                <StatCard
                  value={summary.fixes}
                  label="Fixes"
                  help="Tests that failed in Launch A but passed in Launch B"
                  color="var(--pf-t--global--color--status--success--default)"
                />
              </GalleryItem>
              <GalleryItem>
                <StatCard
                  value={summary.persistent}
                  label="Persistent Failures"
                  help="Tests that failed in both launches"
                  color="var(--pf-t--global--color--nonstatus--gray--text--default)"
                />
              </GalleryItem>
            </Gallery>
          </PageSection>

          <PageSection>
            <Flex gap={{ default: 'gapMd' }} direction={{ default: 'column' }}>
              <FlexItem>
                <EnvironmentDiff a={data.launchA} b={data.launchB} />
              </FlexItem>

              <FlexItem>
                <Card>
                  <CardBody>
                    <ExpandableSection
                      toggleContent={
                        <span>
                          <Label color="red" icon={<ArrowDownIcon />} isCompact>
                            Regressions ({summary.regressions})
                          </Label>
                        </span>
                      }
                      isExpanded={regressionsOpen}
                      onToggle={(_e, expanded) => setRegressionsOpen(expanded)}
                    >
                      <TestItemTable items={data.regressions} navigate={navigate} label="Regressions" />
                    </ExpandableSection>
                  </CardBody>
                </Card>
              </FlexItem>

              <FlexItem>
                <Card>
                  <CardBody>
                    <ExpandableSection
                      toggleContent={
                        <span>
                          <Label color="green" icon={<ArrowUpIcon />} isCompact>
                            Fixes ({summary.fixes})
                          </Label>
                        </span>
                      }
                      isExpanded={fixesOpen}
                      onToggle={(_e, expanded) => setFixesOpen(expanded)}
                    >
                      <TestItemTable items={data.fixes} navigate={navigate} label="Fixes" />
                    </ExpandableSection>
                  </CardBody>
                </Card>
              </FlexItem>

              <FlexItem>
                <Card>
                  <CardBody>
                    <ExpandableSection
                      toggleContent={
                        <span>
                          <Label color="grey" icon={<ExclamationCircleIcon />} isCompact>
                            Persistent Failures ({summary.persistent})
                          </Label>
                        </span>
                      }
                      isExpanded={persistentOpen}
                      onToggle={(_e, expanded) => setPersistentOpen(expanded)}
                    >
                      <TestItemTable items={data.persistent} navigate={navigate} label="Persistent failures" />
                    </ExpandableSection>
                  </CardBody>
                </Card>
              </FlexItem>
            </Flex>
          </PageSection>
        </>
      )}

      {!hasValidParams && !isLoading && (
        <PageSection>
          <EmptyState headingLevel="h4" titleText="Enter two launch IDs" icon={SearchIcon}>
            <EmptyStateBody>
              Enter ReportPortal launch IDs above to compare test results between two runs.
            </EmptyStateBody>
          </EmptyState>
        </PageSection>
      )}
    </>
  );
};
