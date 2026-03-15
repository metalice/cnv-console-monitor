import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
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
  Tooltip,
  TextInput,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  CodeBranchIcon,
} from '@patternfly/react-icons';
import type { TestItem } from '@cnv-monitor/shared';
import { fetchCompare, fetchCompareLaunches, type CompareResult, type LaunchSummary, type LaunchGroup, type LaunchRun } from '../api/compare';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';

const diffField = (valA: string | null, valB: string | null, label: string): React.ReactNode | null => {
  if (valA === valB) return null;
  return (
    <DescriptionListGroup key={label}>
      <DescriptionListTerm>{label}</DescriptionListTerm>
      <DescriptionListDescription>
        <span className="app-text-muted" style={{ textDecoration: 'line-through' }}>{valA ?? '—'}</span>
        {' → '}
        <strong>{valB ?? '—'}</strong>
      </DescriptionListDescription>
    </DescriptionListGroup>
  );
};

const TestItemTable = ({ items, navigate, label }: { items: TestItem[]; navigate: ReturnType<typeof useNavigate>; label: string }): React.JSX.Element => {
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

const formatDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export const ComparePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => { document.title = 'Compare Launches | CNV Console Monitor'; }, []);

  const paramA = searchParams.get('a') ?? '';
  const paramB = searchParams.get('b') ?? '';
  const queryA = paramA ? parseInt(paramA, 10) : NaN;
  const queryB = paramB ? parseInt(paramB, 10) : NaN;
  const hasValidParams = !isNaN(queryA) && !isNaN(queryB);

  const [selectedLaunchName, setSelectedLaunchName] = useState<string | null>(null);
  const [selectedRunA, setSelectedRunA] = useState<number | null>(!isNaN(queryA) ? queryA : null);
  const [selectedRunB, setSelectedRunB] = useState<number | null>(!isNaN(queryB) ? queryB : null);
  const [launchSearch, setLaunchSearch] = useState('');

  const { data: launchGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['compareLaunches'],
    queryFn: () => fetchCompareLaunches(60),
    staleTime: 5 * 60 * 1000,
  });

  const filteredGroups = useMemo(() => {
    if (!launchGroups) return [];
    const term = launchSearch.toLowerCase();
    return launchGroups
      .filter((group) => group.runCount >= 2)
      .filter((group) => !term || group.name.toLowerCase().includes(term) || (group.cnvVersion ?? '').toLowerCase().includes(term) || (group.component ?? '').toLowerCase().includes(term));
  }, [launchGroups, launchSearch]);

  const selectedGroup = useMemo(() => {
    if (!selectedLaunchName || !launchGroups) return null;
    return launchGroups.find((group) => group.name === selectedLaunchName) ?? null;
  }, [selectedLaunchName, launchGroups]);

  const { data: result, isLoading: comparing, error: compareError } = useQuery<CompareResult>({
    queryKey: ['compare', queryA, queryB],
    queryFn: () => fetchCompare(queryA, queryB),
    enabled: hasValidParams,
  });

  const handleCompare = () => {
    if (selectedRunA && selectedRunB) {
      setSearchParams({ a: String(selectedRunA), b: String(selectedRunB) });
    }
  };

  const handleSelectLaunch = (name: string) => {
    setSelectedLaunchName(name);
    setSelectedRunA(null);
    setSelectedRunB(null);
  };

  const [regressionsOpen, setRegressionsOpen] = useState(true);
  const [fixesOpen, setFixesOpen] = useState(true);
  const [persistentOpen, setPersistentOpen] = useState(false);

  const summary = result?.summary;

  return (
    <>
      <PageSection>
        <Content component="h1">Compare Runs</Content>
        <Content component="small">Pick a launch, then select two runs to compare</Content>
      </PageSection>

      {/* Step 1: Pick a launch name */}
      {!selectedGroup && (
        <PageSection>
          <Card>
            <CardTitle>Step 1: Select a Launch</CardTitle>
            <CardBody>
              <TextInput
                aria-label="Search launches"
                placeholder="Filter by name, version, or component..."
                value={launchSearch}
                onChange={(_event, value) => setLaunchSearch(value)}
                className="app-mb-md"
              />
              {groupsLoading ? (
                <Bullseye style={{ minHeight: 100 }}><Spinner aria-label="Loading launches" /></Bullseye>
              ) : filteredGroups.length === 0 ? (
                <EmptyState headingLevel="h4" titleText="No launches with multiple runs">
                  <EmptyStateBody>Only launches with 2+ runs in the last 60 days can be compared.</EmptyStateBody>
                </EmptyState>
              ) : (
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  <Table aria-label="Select launch" variant="compact">
                    <Thead>
                      <Tr>
                        <Th>Launch Name</Th>
                        <Th>Version</Th>
                        <Th>Tier</Th>
                        <Th>Component</Th>
                        <Th>Runs</Th>
                        <Th>Latest</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredGroups.map((group) => (
                        <Tr key={group.name} isClickable onRowClick={() => handleSelectLaunch(group.name)} style={{ cursor: 'pointer' }}>
                          <Td dataLabel="Name" className="app-cell-truncate">
                            <Tooltip content={group.name}><span>{group.name}</span></Tooltip>
                          </Td>
                          <Td dataLabel="Version" className="app-cell-nowrap">{group.cnvVersion ?? '—'}</Td>
                          <Td dataLabel="Tier" className="app-cell-nowrap">{group.tier ?? '—'}</Td>
                          <Td dataLabel="Component" className="app-cell-nowrap">{group.component ?? '—'}</Td>
                          <Td dataLabel="Runs" className="app-cell-nowrap"><strong>{group.runCount}</strong></Td>
                          <Td dataLabel="Latest" className="app-cell-nowrap"><StatusBadge status={group.latestStatus} /></Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </PageSection>
      )}

      {/* Step 2: Pick two runs */}
      {selectedGroup && !hasValidParams && (
        <PageSection>
          <Card>
            <CardTitle>
              <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>
                  Step 2: Select two runs of <strong>{selectedGroup.cnvVersion} {selectedGroup.tier}</strong>
                </FlexItem>
                <FlexItem>
                  <Button variant="link" size="sm" onClick={() => setSelectedLaunchName(null)}>Change launch</Button>
                </FlexItem>
              </Flex>
            </CardTitle>
            <CardBody>
              <Content component="small" className="app-mb-sm app-text-muted">
                Click a row to set it as Run A (baseline), click another for Run B (compare). Then press Compare.
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
                  {selectedGroup.runs.map((run) => {
                    const isA = selectedRunA === run.rp_id;
                    const isB = selectedRunB === run.rp_id;
                    return (
                      <Tr
                        key={run.rp_id}
                        isClickable
                        isRowSelected={isA || isB}
                        onRowClick={() => {
                          if (isA) { setSelectedRunA(null); return; }
                          if (isB) { setSelectedRunB(null); return; }
                          if (!selectedRunA) { setSelectedRunA(run.rp_id); return; }
                          if (!selectedRunB) { setSelectedRunB(run.rp_id); return; }
                          setSelectedRunB(run.rp_id);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <Td className="app-cell-nowrap">
                          {isA && <Label color="blue" isCompact>A (baseline)</Label>}
                          {isB && <Label color="orange" isCompact>B (compare)</Label>}
                        </Td>
                        <Td className="app-cell-nowrap"><strong>#{run.number}</strong></Td>
                        <Td className="app-cell-nowrap"><StatusBadge status={run.status} /></Td>
                        <Td className="app-cell-nowrap">{run.passed}/{run.total}</Td>
                        <Td className="app-cell-nowrap">{run.failed > 0 ? <Label color="red" isCompact>{run.failed}</Label> : '0'}</Td>
                        <Td className="app-cell-truncate"><Tooltip content={run.cluster_name ?? '—'}><span>{run.cluster_name ?? '—'}</span></Tooltip></Td>
                        <Td className="app-cell-nowrap">{formatDate(run.start_time)}</Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>

              <Flex className="app-mt-md" gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>
                  <Button variant="primary" onClick={handleCompare} isDisabled={!selectedRunA || !selectedRunB || selectedRunA === selectedRunB} isLoading={comparing}>
                    Compare
                  </Button>
                </FlexItem>
                {selectedRunA && selectedRunB && selectedRunA === selectedRunB && (
                  <FlexItem>
                    <Content component="small" style={{ color: 'var(--pf-t--global--color--status--danger--default)' }}>
                      Select two different runs.
                    </Content>
                  </FlexItem>
                )}
              </Flex>
            </CardBody>
          </Card>
        </PageSection>
      )}

      {/* Results */}
      {comparing && (
        <PageSection><Bullseye style={{ minHeight: 200 }}><Spinner aria-label="Comparing" /></Bullseye></PageSection>
      )}

      {compareError && (
        <PageSection>
          <EmptyState headingLevel="h4" titleText="Comparison failed" icon={ExclamationCircleIcon}>
            <EmptyStateBody>{(compareError as Error).message}</EmptyStateBody>
          </EmptyState>
        </PageSection>
      )}

      {result && summary && (
        <>
          <PageSection>
            <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} className="app-mb-md">
              <FlexItem>
                <Content component="h3">
                  Run #{result.launchA.rp_id} vs #{result.launchB.rp_id}
                </Content>
              </FlexItem>
              <FlexItem>
                <Button variant="link" size="sm" onClick={() => { setSearchParams({}); setSelectedRunA(null); setSelectedRunB(null); }}>
                  Pick different runs
                </Button>
              </FlexItem>
            </Flex>

            <Gallery hasGutter minWidths={{ default: '200px' }} className="app-mb-md">
              <GalleryItem>
                <StatCard value={summary.regressions} label="Regressions" help="Tests that passed in A but failed in B" color="var(--pf-t--global--color--status--danger--default)" />
              </GalleryItem>
              <GalleryItem>
                <StatCard value={summary.fixes} label="Fixes" help="Tests that failed in A but passed in B" color="var(--pf-t--global--color--status--success--default)" />
              </GalleryItem>
              <GalleryItem>
                <StatCard value={summary.persistent} label="Persistent" help="Tests that failed in both runs" />
              </GalleryItem>
            </Gallery>

            {(() => {
              const diffs = [
                diffField(result.launchA.cnv_version, result.launchB.cnv_version, 'CNV Version'),
                diffField(result.launchA.ocp_version, result.launchB.ocp_version, 'OCP Version'),
                diffField(result.launchA.cluster_name, result.launchB.cluster_name, 'Cluster'),
                diffField(result.launchA.status, result.launchB.status, 'Status'),
              ].filter(Boolean);
              if (diffs.length === 0) return null;
              return (
                <Card isCompact className="app-mb-md">
                  <CardBody>
                    <Content component="h4" className="app-mb-sm">Environment Changes</Content>
                    <DescriptionList isHorizontal isCompact>{diffs}</DescriptionList>
                  </CardBody>
                </Card>
              );
            })()}

            <Card className="app-mb-md">
              <CardBody>
                <ExpandableSection
                  toggleContent={<Label color="red" icon={<ArrowDownIcon />} isCompact>Regressions ({summary.regressions})</Label>}
                  isExpanded={regressionsOpen}
                  onToggle={(_e, expanded) => setRegressionsOpen(expanded)}
                >
                  <TestItemTable items={result.regressions} navigate={navigate} label="Regressions" />
                </ExpandableSection>
              </CardBody>
            </Card>

            <Card className="app-mb-md">
              <CardBody>
                <ExpandableSection
                  toggleContent={<Label color="green" icon={<ArrowUpIcon />} isCompact>Fixes ({summary.fixes})</Label>}
                  isExpanded={fixesOpen}
                  onToggle={(_e, expanded) => setFixesOpen(expanded)}
                >
                  <TestItemTable items={result.fixes} navigate={navigate} label="Fixes" />
                </ExpandableSection>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <ExpandableSection
                  toggleContent={<Label color="grey" icon={<ExclamationCircleIcon />} isCompact>Persistent Failures ({summary.persistent})</Label>}
                  isExpanded={persistentOpen}
                  onToggle={(_e, expanded) => setPersistentOpen(expanded)}
                >
                  <TestItemTable items={result.persistent} navigate={navigate} label="Persistent failures" />
                </ExpandableSection>
              </CardBody>
            </Card>
          </PageSection>
        </>
      )}
    </>
  );
};
