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
  Flex,
  FlexItem,
  Spinner,
} from '@patternfly/react-core';
import { PlusCircleIcon, SyncAltIcon } from '@patternfly/react-icons';

import { useAuth } from '../../context/AuthContext';

import { ComponentMappingsSummary } from './ComponentMappingsSummary';
import { MappingsTable } from './MappingsTable';
import { UnmappedSection } from './UnmappedSection';
import { useComponentMappings } from './useComponentMappings';

export const ComponentMappings = () => {
  const { isAdmin } = useAuth();
  const cmp = useComponentMappings();

  if (cmp.isLoading) {
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
            Component Mappings{' '}
            {cmp.mappings.length > 0 && <Badge isRead>{cmp.mappings.length}</Badge>}
          </FlexItem>
          {isAdmin && cmp.hasData && (
            <FlexItem>
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Button
                    icon={<SyncAltIcon />}
                    isLoading={cmp.autoMapMutation.isPending}
                    size="sm"
                    variant="secondary"
                    onClick={() => cmp.autoMapMutation.mutate()}
                  >
                    Auto-Map from Jenkins
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button
                    icon={<PlusCircleIcon />}
                    isDisabled={Boolean(cmp.newDraft)}
                    size="sm"
                    variant="primary"
                    onClick={() => cmp.startNewRow()}
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
        {!cmp.hasData ? (
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
            {cmp.autoMapMutation.isSuccess && (
              <Alert
                isInline
                isPlain
                className="app-mb-md"
                title={`Auto-mapped ${cmp.autoMapMutation.data.mapped.length} teams. ${cmp.autoMapMutation.data.unmapped.length} unmatched.`}
                variant="success"
              />
            )}
            {cmp.summary && <ComponentMappingsSummary summary={cmp.summary} />}
            <MappingsTable
              componentOptions={cmp.componentOptions}
              editDraft={cmp.editDraft}
              editingPattern={cmp.editingPattern}
              isAdmin={isAdmin}
              mappings={cmp.mappings}
              newDraft={cmp.newDraft}
              previewResult={cmp.previewResult}
              totalMappedLaunches={cmp.summary?.mappedLaunches}
              upsertPending={cmp.upsertMutation.isPending}
              onCancelEdit={() => {
                cmp.setEditingPattern(null);
                cmp.setPreviewResult(null);
              }}
              onDelete={pattern => cmp.deleteMutation.mutate(pattern)}
              onEditDraftChange={cmp.setEditDraft}
              onNewDraftChange={cmp.setNewDraft}
              onSaveEdit={() => cmp.upsertMutation.mutate(cmp.editDraft)}
              onSaveNew={() => cmp.newDraft && cmp.upsertMutation.mutate(cmp.newDraft)}
              onStartEdit={cmp.startEdit}
            />
            <UnmappedSection
              activeLaunches={cmp.activeLaunches}
              deletedLaunches={cmp.deletedLaunches}
              isAdmin={isAdmin}
              unmappedExpanded={cmp.unmappedExpanded}
              onMap={cmp.startNewRow}
              onToggleExpanded={cmp.setUnmappedExpanded}
            />
          </>
        )}
      </CardBody>
    </Card>
  );
};
