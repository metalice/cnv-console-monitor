import React, { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  EmptyState,
  EmptyStateBody,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  Progress,
  ProgressSize,
  Spinner,
} from '@patternfly/react-core';
import { PlusCircleIcon, SyncAltIcon } from '@patternfly/react-icons';
import { Table, Tbody, Th, Thead, Tr } from '@patternfly/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteComponentMapping,
  fetchComponentMappings,
  previewPattern,
  triggerAutoMap,
  upsertComponentMapping,
} from '../../api/componentMappings';
import { useAuth } from '../../context/AuthContext';
import type { SearchableSelectOption } from '../common/SearchableSelect';

import { type MappingDraft, MappingsTable } from './MappingsTable';
import { UnmappedLaunchRow } from './UnmappedLaunchRow';

export const ComponentMappings: React.FC = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryFn: fetchComponentMappings,
    queryKey: ['componentMappings'],
  });

  const [editingPattern, setEditingPattern] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<MappingDraft>({ component: '', pattern: '' });
  const [newDraft, setNewDraft] = useState<MappingDraft | null>(null);
  const [previewResult, setPreviewResult] = useState<{
    matches: string[];
    totalCount: number;
    nameCount: number;
    conflicts?: { pattern: string; component: string }[];
  } | null>(null);
  const [unmappedExpanded, setUnmappedExpanded] = useState(false);

  const activePattern = newDraft?.pattern || (editingPattern ? editDraft.pattern : '');
  const includeDeleted = newDraft?.includeDeleted ?? false;
  useEffect(() => {
    if (!activePattern || activePattern.length < 2) {
      setPreviewResult(null);
      return;
    }
    const timer = setTimeout(() => {
      previewPattern(activePattern, includeDeleted)
        .then(setPreviewResult)
        .catch(() => setPreviewResult(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [activePattern, includeDeleted]);

  const componentOptions = useMemo((): SearchableSelectOption[] => {
    const jiraComps = data?.jiraComponents ?? [];
    const mappedComps = (data?.mappings ?? []).map(item => item.component);
    return [...new Set([...jiraComps, ...mappedComps])]
      .sort()
      .map(comp => ({ label: comp, value: comp }));
  }, [data?.jiraComponents, data?.mappings]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['componentMappings'] });
  };
  const upsertMutation = useMutation({
    mutationFn: (draft: MappingDraft) =>
      upsertComponentMapping(draft.pattern, draft.component, 'manual', draft.includeDeleted),
    onSuccess: () => {
      invalidate();
      setNewDraft(null);
      setEditingPattern(null);
      setPreviewResult(null);
    },
  });
  const deleteMutation = useMutation({ mutationFn: deleteComponentMapping, onSuccess: invalidate });
  const autoMapMutation = useMutation({ mutationFn: triggerAutoMap, onSuccess: invalidate });

  const startNewRow = (prefill = '') => {
    setNewDraft({ component: '', pattern: prefill });
    setEditingPattern(null);
  };
  const startEdit = (pattern: string, component: string) => {
    setEditingPattern(pattern);
    setEditDraft({ component, pattern });
    setNewDraft(null);
  };

  const mappings = data?.mappings ?? [];
  const allUnmapped = useMemo(() => data?.unmapped ?? [], [data?.unmapped]);
  const activeLaunches = useMemo(
    () => allUnmapped.filter(entry => !entry.jobDeleted),
    [allUnmapped],
  );
  const deletedLaunches = useMemo(
    () => allUnmapped.filter(entry => entry.jobDeleted),
    [allUnmapped],
  );
  const hasData = (data?.launchCount ?? 0) > 0;
  const summary = data?.summary;

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <div className="app-card-spinner">
            <Spinner size="md" />
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            Component Mappings {mappings.length > 0 && <Badge isRead>{mappings.length}</Badge>}
          </FlexItem>
          {isAdmin && hasData && (
            <FlexItem>
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Button
                    icon={<SyncAltIcon />}
                    isLoading={autoMapMutation.isPending}
                    size="sm"
                    variant="secondary"
                    onClick={() => autoMapMutation.mutate()}
                  >
                    Auto-Map from Jenkins
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button
                    icon={<PlusCircleIcon />}
                    isDisabled={Boolean(newDraft)}
                    size="sm"
                    variant="primary"
                    onClick={() => startNewRow()}
                  >
                    Add Mapping
                  </Button>
                </FlexItem>
              </Flex>
            </FlexItem>
          )}
        </Flex>
      </CardTitle>
      <CardBody>
        {!hasData ? (
          <EmptyState variant="sm">
            <EmptyStateBody>
              <Content component="p">
                <strong>No launch data</strong>
              </Content>
              <Content component="small">
                Fetch history data first using the Polling section above. Component mappings will be
                auto-generated after Jenkins enrichment completes.
              </Content>
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <>
            {autoMapMutation.isSuccess && (
              <Alert
                isInline
                isPlain
                className="app-mb-md"
                title={`Auto-mapped ${autoMapMutation.data.mapped.length} teams. ${autoMapMutation.data.unmapped.length} unmatched.`}
                variant="success"
              />
            )}
            {summary && (
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                className="app-mb-md"
                flexWrap={{ default: 'wrap' }}
                spaceItems={{ default: 'spaceItemsMd' }}
              >
                <FlexItem>
                  <Label isCompact>{summary.totalLaunches.toLocaleString()} launches</Label>
                </FlexItem>
                <FlexItem>
                  <Label isCompact color="green">
                    {summary.mappedLaunches.toLocaleString()} mapped
                  </Label>
                </FlexItem>
                <FlexItem>
                  <Label isCompact color={summary.unmappedLaunches > 0 ? 'orange' : 'green'}>
                    {summary.unmappedLaunches.toLocaleString()} unmapped
                  </Label>
                </FlexItem>
                <FlexItem>
                  <Label isCompact color="blue">
                    {summary.componentCount} components
                  </Label>
                </FlexItem>
                <FlexItem className="app-poll-progress-bar">
                  <Progress
                    aria-label={`${summary.coveragePercent}% mapping coverage`}
                    size={ProgressSize.sm}
                    title=""
                    value={summary.coveragePercent}
                  />
                </FlexItem>
              </Flex>
            )}
            <MappingsTable
              componentOptions={componentOptions}
              editDraft={editDraft}
              editingPattern={editingPattern}
              isAdmin={isAdmin}
              mappings={mappings}
              newDraft={newDraft}
              previewResult={previewResult}
              totalMappedLaunches={summary?.mappedLaunches}
              upsertPending={upsertMutation.isPending}
              onCancelEdit={() => {
                setEditingPattern(null);
                setPreviewResult(null);
              }}
              onDelete={pattern => deleteMutation.mutate(pattern)}
              onEditDraftChange={setEditDraft}
              onNewDraftChange={setNewDraft}
              onSaveEdit={() => upsertMutation.mutate(editDraft)}
              onSaveNew={() => newDraft && upsertMutation.mutate(newDraft)}
              onStartEdit={startEdit}
            />
            {activeLaunches.length > 0 && (
              <ExpandableSection
                className="app-mt-md"
                isExpanded={unmappedExpanded}
                toggleText={`${activeLaunches.length} unmapped launches (${activeLaunches.reduce((sum, entry) => sum + entry.count, 0).toLocaleString()} runs) — need manual mapping`}
                onToggle={(_event, expanded) => setUnmappedExpanded(expanded)}
              >
                <div className="app-table-scroll">
                  <Table aria-label="Unmapped launches" variant="compact">
                    <Thead>
                      <Tr>
                        <Th>Launch Name</Th>
                        <Th width={10}>Runs</Th>
                        {isAdmin && <Th width={10} />}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {activeLaunches.map(entry => (
                        <UnmappedLaunchRow
                          entry={entry}
                          isAdmin={isAdmin}
                          key={entry.name}
                          onMap={startNewRow}
                        />
                      ))}
                    </Tbody>
                  </Table>
                </div>
              </ExpandableSection>
            )}
            {deletedLaunches.length > 0 && (
              <ExpandableSection
                className="app-mt-sm"
                toggleText={`${deletedLaunches.length} deleted Jenkins jobs (${deletedLaunches.reduce((sum, entry) => sum + entry.count, 0).toLocaleString()} runs) — job removed from Jenkins`}
              >
                <div className="app-table-scroll">
                  <Table aria-label="Deleted launches" variant="compact">
                    <Thead>
                      <Tr>
                        <Th>Launch Name</Th>
                        <Th width={10}>Runs</Th>
                        {isAdmin && <Th width={10} />}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {deletedLaunches.map(entry => (
                        <UnmappedLaunchRow
                          entry={entry}
                          isAdmin={isAdmin}
                          key={entry.name}
                          onMap={startNewRow}
                        />
                      ))}
                    </Tbody>
                  </Table>
                </div>
              </ExpandableSection>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
};
