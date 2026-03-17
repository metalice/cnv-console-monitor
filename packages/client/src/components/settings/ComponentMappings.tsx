import React, { useMemo, useState, useEffect } from 'react';
import {
  Card, CardBody, CardTitle, Button, Content, Flex, FlexItem,
  Badge, ExpandableSection, Spinner, Alert, Label,
  EmptyState, EmptyStateBody, Progress, ProgressSize,
} from '@patternfly/react-core';
import { PlusCircleIcon, SyncAltIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchComponentMappings, upsertComponentMapping,
  deleteComponentMapping, previewPattern, triggerAutoMap,
} from '../../api/componentMappings';
import { useAuth } from '../../context/AuthContext';
import type { SearchableSelectOption } from '../common/SearchableSelect';
import { MappingsTable, type MappingDraft } from './MappingsTable';
import { UnmappedLaunchRow } from './UnmappedLaunchRow';

export const ComponentMappings: React.FC = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['componentMappings'], queryFn: fetchComponentMappings });

  const [editingPattern, setEditingPattern] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<MappingDraft>({ pattern: '', component: '' });
  const [newDraft, setNewDraft] = useState<MappingDraft | null>(null);
  const [previewResult, setPreviewResult] = useState<{ matches: string[]; totalCount: number; nameCount: number; conflicts?: Array<{ pattern: string; component: string }> } | null>(null);
  const [unmappedExpanded, setUnmappedExpanded] = useState(false);

  const activePattern = newDraft?.pattern || (editingPattern ? editDraft.pattern : '');
  const includeDeleted = newDraft?.includeDeleted ?? false;
  useEffect(() => {
    if (!activePattern || activePattern.length < 2) { setPreviewResult(null); return; }
    const timer = setTimeout(() => { previewPattern(activePattern, includeDeleted).then(setPreviewResult).catch(() => setPreviewResult(null)); }, 400);
    return () => clearTimeout(timer);
  }, [activePattern, includeDeleted]);

  const componentOptions = useMemo((): SearchableSelectOption[] => {
    const jiraComps = data?.jiraComponents ?? [];
    const mappedComps = (data?.mappings ?? []).map((item) => item.component);
    return [...new Set([...jiraComps, ...mappedComps])].sort().map((comp) => ({ value: comp, label: comp }));
  }, [data?.jiraComponents, data?.mappings]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['componentMappings'] });
  const upsertMutation = useMutation({
    mutationFn: (draft: MappingDraft) => upsertComponentMapping(draft.pattern, draft.component, 'manual', draft.includeDeleted),
    onSuccess: () => { invalidate(); setNewDraft(null); setEditingPattern(null); setPreviewResult(null); },
  });
  const deleteMutation = useMutation({ mutationFn: deleteComponentMapping, onSuccess: invalidate });
  const autoMapMutation = useMutation({ mutationFn: triggerAutoMap, onSuccess: invalidate });

  const startNewRow = (prefill = '') => { setNewDraft({ pattern: prefill, component: '' }); setEditingPattern(null); };
  const startEdit = (pattern: string, component: string) => { setEditingPattern(pattern); setEditDraft({ pattern, component }); setNewDraft(null); };

  const mappings = data?.mappings ?? [];
  const allUnmapped = data?.unmapped ?? [];
  const activeLaunches = useMemo(() => allUnmapped.filter((entry) => !entry.jobDeleted), [allUnmapped]);
  const deletedLaunches = useMemo(() => allUnmapped.filter((entry) => entry.jobDeleted), [allUnmapped]);
  const unmappedTotal = useMemo(() => allUnmapped.reduce((sum, entry) => sum + entry.count, 0), [allUnmapped]);
  const hasData = (data?.launchCount ?? 0) > 0;
  const summary = data?.summary;

  if (isLoading) return <Card><CardBody><div className="app-card-spinner"><Spinner size="md" /></div></CardBody></Card>;

  return (
    <Card>
      <CardTitle>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>Component Mappings {mappings.length > 0 && <Badge isRead>{mappings.length}</Badge>}</FlexItem>
          {isAdmin && hasData && (
            <FlexItem>
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem><Button variant="secondary" size="sm" icon={<SyncAltIcon />} onClick={() => autoMapMutation.mutate()} isLoading={autoMapMutation.isPending}>Auto-Map from Jenkins</Button></FlexItem>
                <FlexItem><Button variant="primary" size="sm" icon={<PlusCircleIcon />} isDisabled={!!newDraft} onClick={() => startNewRow()}>Add Mapping</Button></FlexItem>
              </Flex>
            </FlexItem>
          )}
        </Flex>
      </CardTitle>
      <CardBody>
        {!hasData ? (
          <EmptyState variant="sm">
            <EmptyStateBody>
              <Content component="p"><strong>No launch data</strong></Content>
              <Content component="small">Fetch history data first using the Polling section above. Component mappings will be auto-generated after Jenkins enrichment completes.</Content>
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <>
            {autoMapMutation.isSuccess && (
              <Alert variant="success" isInline isPlain className="app-mb-md" title={`Auto-mapped ${autoMapMutation.data.mapped.length} teams. ${autoMapMutation.data.unmapped.length} unmatched.`} />
            )}
            {summary && (
              <Flex spaceItems={{ default: 'spaceItemsMd' }} alignItems={{ default: 'alignItemsCenter' }} className="app-mb-md" flexWrap={{ default: 'wrap' }}>
                <FlexItem><Label isCompact>{summary.totalLaunches.toLocaleString()} launches</Label></FlexItem>
                <FlexItem><Label color="green" isCompact>{summary.mappedLaunches.toLocaleString()} mapped</Label></FlexItem>
                <FlexItem><Label color={summary.unmappedLaunches > 0 ? 'orange' : 'green'} isCompact>{summary.unmappedLaunches.toLocaleString()} unmapped</Label></FlexItem>
                <FlexItem><Label color="blue" isCompact>{summary.componentCount} components</Label></FlexItem>
                <FlexItem className="app-poll-progress-bar">
                  <Progress value={summary.coveragePercent} size={ProgressSize.sm} title="" aria-label={`${summary.coveragePercent}% mapping coverage`} />
                </FlexItem>
              </Flex>
            )}
            <MappingsTable mappings={mappings} newDraft={newDraft} editingPattern={editingPattern} editDraft={editDraft}
              componentOptions={componentOptions} isAdmin={isAdmin} previewResult={previewResult}
              totalMappedLaunches={summary?.mappedLaunches}
              onNewDraftChange={setNewDraft} onStartEdit={startEdit} onCancelEdit={() => { setEditingPattern(null); setPreviewResult(null); }}
              onSaveEdit={() => upsertMutation.mutate(editDraft)} onSaveNew={() => newDraft && upsertMutation.mutate(newDraft)}
              onDelete={(pattern) => deleteMutation.mutate(pattern)} onEditDraftChange={setEditDraft} upsertPending={upsertMutation.isPending} />
            {activeLaunches.length > 0 && (
              <ExpandableSection toggleText={`${activeLaunches.length} unmapped launches (${activeLaunches.reduce((sum, entry) => sum + entry.count, 0).toLocaleString()} runs) — need manual mapping`}
                isExpanded={unmappedExpanded} onToggle={(_event, expanded) => setUnmappedExpanded(expanded)} className="app-mt-md">
                <div className="app-table-scroll">
                  <Table aria-label="Unmapped launches" variant="compact">
                    <Thead><Tr><Th>Launch Name</Th><Th width={10}>Runs</Th>{isAdmin && <Th width={10} />}</Tr></Thead>
                    <Tbody>
                      {activeLaunches.map((entry) => (
                        <UnmappedLaunchRow key={entry.name} entry={entry} isAdmin={isAdmin} onMap={startNewRow} />
                      ))}
                    </Tbody>
                  </Table>
                </div>
              </ExpandableSection>
            )}
            {deletedLaunches.length > 0 && (
              <ExpandableSection toggleText={`${deletedLaunches.length} deleted Jenkins jobs (${deletedLaunches.reduce((sum, entry) => sum + entry.count, 0).toLocaleString()} runs) — job removed from Jenkins`}
                className="app-mt-sm">
                <div className="app-table-scroll">
                  <Table aria-label="Deleted launches" variant="compact">
                    <Thead><Tr><Th>Launch Name</Th><Th width={10}>Runs</Th>{isAdmin && <Th width={10} />}</Tr></Thead>
                    <Tbody>
                      {deletedLaunches.map((entry) => (
                        <UnmappedLaunchRow key={entry.name} entry={entry} isAdmin={isAdmin} onMap={startNewRow} />
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
