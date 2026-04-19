import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { type AggregateStats, type PersonReport, pluralize } from '@cnv-monitor/shared';

import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  Spinner,
  Tab,
  Tabs,
  TabTitleText,
  TextArea,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { ClockIcon, CopyIcon, CubesIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';

import { PersonCard } from '../components/report/PersonCard';
import {
  computeDaysAgo,
  formatHighlightText,
  generateMarkdown,
  STAT_ITEMS,
} from '../components/report/reportEditorUtils';
import {
  ReportAggregateStats,
  ReportAuditTrail,
  ReportProgressStepper,
  ReportWarnings,
} from '../components/report/ReportEditorWidgets';
import { TaskSummaryView } from '../components/report/TaskSummaryView';
import {
  useFinalizeReport,
  useReport,
  useReportList,
  useSendReport,
  useUpdateReport,
} from '../hooks/useReports';

const DEBOUNCE_MS = 800;
const SPARKLINE_WEEKS = 6;

type ManagerHighlightsCardProps = {
  highlights: string;
  isLocked: boolean;
  onChange: (_event: unknown, value: string) => void;
};

const ManagerHighlightsCard = ({ highlights, isLocked, onChange }: ManagerHighlightsCardProps) => (
  <Card>
    <CardTitle>Manager Highlights</CardTitle>
    <CardBody>
      {isLocked ? (
        <Content className="app-report-highlights" component="p">
          {highlights ? formatHighlightText(highlights) : <em>No highlights added.</em>}
        </Content>
      ) : (
        <Tabs defaultActiveKey={0}>
          <Tab eventKey={0} title={<TabTitleText>Write</TabTitleText>}>
            <div className="app-mt-sm">
              <TextArea
                aria-label="Manager highlights"
                className="app-report-highlights-textarea"
                placeholder="Add highlights... (CNV-1234 and #42 are auto-linked)"
                rows={4}
                value={highlights}
                onChange={onChange}
              />
            </div>
          </Tab>
          <Tab eventKey={1} title={<TabTitleText>Preview</TabTitleText>}>
            <div className="app-mt-sm">
              <Content className="app-report-highlights" component="p">
                {highlights ? (
                  formatHighlightText(highlights)
                ) : (
                  <em className="app-text-muted">Nothing to preview.</em>
                )}
              </Content>
            </div>
          </Tab>
        </Tabs>
      )}
    </CardBody>
  </Card>
);

type DraggablePersonCardsProps = {
  onDragEnd: (result: DropResult) => void;
  onNotesChange: (memberId: string, notes: string) => void;
  personReports: PersonReport[];
};

const DraggablePersonCards = ({
  onDragEnd,
  onNotesChange,
  personReports,
}: DraggablePersonCardsProps) => (
  <DragDropContext onDragEnd={onDragEnd}>
    <Droppable droppableId="person-cards">
      {provided => (
        <div ref={provided.innerRef} {...provided.droppableProps}>
          <Grid hasGutter>
            {personReports.map((person, idx) => (
              <Draggable draggableId={person.memberId} index={idx} key={person.memberId}>
                {dragProvided => (
                  <GridItem
                    ref={dragProvided.innerRef}
                    span={12}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                  >
                    <PersonCard
                      editable
                      personReport={person}
                      onNotesChange={notes => onNotesChange(person.memberId, notes)}
                    />
                  </GridItem>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </Grid>
        </div>
      )}
    </Droppable>
  </DragDropContext>
);

type ConfirmAction = 'finalize' | 'send';

const CONFIRM_CONFIG: Record<ConfirmAction, { body: string; title: string }> = {
  finalize: {
    body: 'Once finalized, the report content will be locked. You can still send it afterward.',
    title: 'Finalize this report?',
  },
  send: {
    body: 'This will distribute the report via configured notification channels (Slack, email).',
    title: 'Send this report?',
  },
};

type ConfirmModalProps = {
  action: ConfirmAction;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const ConfirmModal = ({ action, isPending, onClose, onConfirm }: ConfirmModalProps) => (
  <Modal isOpen aria-label={CONFIRM_CONFIG[action].title} variant="small" onClose={onClose}>
    <ModalHeader title={CONFIRM_CONFIG[action].title} />
    <ModalBody>{CONFIRM_CONFIG[action].body}</ModalBody>
    <ModalFooter>
      <Button isLoading={isPending} variant="primary" onClick={onConfirm}>
        Confirm
      </Button>
      <Button variant="link" onClick={onClose}>
        Cancel
      </Button>
    </ModalFooter>
  </Modal>
);

export const ReportEditorPage = () => {
  const { component: rawComponent, weekId } = useParams<{ component: string; weekId: string }>();
  const decodedComponent =
    rawComponent && rawComponent !== '_all' ? decodeURIComponent(rawComponent) : undefined;
  const { data: report, error, isLoading } = useReport(weekId, decodedComponent);
  const { data: allReports } = useReportList();
  const updateMutation = useUpdateReport();
  const finalizeMutation = useFinalizeReport();
  const sendMutation = useSendReport();
  const [highlights, setHighlights] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesDebounceRefs = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const parts = [decodedComponent, weekId].filter(Boolean).join(' — ');
    document.title = parts
      ? `Team Report: ${parts} | CNV Console Monitor`
      : 'Team Report | CNV Console Monitor';
  }, [decodedComponent, weekId]);

  useEffect(() => {
    if (report?.managerHighlights) {
      setHighlights(report.managerHighlights);
    }
  }, [report?.managerHighlights]);

  const debouncedSave = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!weekId) return;
      debounceRef.current = setTimeout(() => {
        updateMutation.mutate({
          component: decodedComponent,
          data: { managerHighlights: value },
          weekId,
        });
      }, DEBOUNCE_MS);
    },
    [decodedComponent, weekId, updateMutation],
  );

  const handleHighlightsChange = (_event: unknown, value: string) => {
    setHighlights(value);
    debouncedSave(value);
  };

  const handlePersonNotesChange = useCallback(
    (memberId: string, notes: string) => {
      if (!weekId) return;
      const existing = notesDebounceRefs.current.get(memberId);
      if (existing !== undefined) clearTimeout(existing);
      const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
        updateMutation.mutate({
          component: decodedComponent,
          data: { personUpdates: [{ managerNotes: notes, memberId }] },
          weekId,
        });
        notesDebounceRefs.current.delete(memberId);
      }, DEBOUNCE_MS);
      notesDebounceRefs.current.set(memberId, timer);
    },
    [decodedComponent, weekId, updateMutation],
  );

  const handleConfirm = () => {
    if (!weekId || !confirmAction) return;
    if (confirmAction === 'finalize') {
      finalizeMutation.mutate(
        { component: decodedComponent, weekId },
        { onSuccess: () => setConfirmAction(null) },
      );
    } else {
      sendMutation.mutate(
        { component: decodedComponent, weekId },
        { onSuccess: () => setConfirmAction(null) },
      );
    }
  };

  if (isLoading) {
    return (
      <div className="app-page-spinner">
        <Spinner aria-label="Loading report" />
      </div>
    );
  }
  if (error) {
    return (
      <PageSection>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationTriangleIcon}
          titleText="Error loading report"
        >
          <EmptyStateBody>{error.message}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }
  if (!report) {
    return (
      <PageSection>
        <EmptyState headingLevel="h2" icon={CubesIcon} titleText="Report not found">
          <EmptyStateBody>
            This report does not exist. Check the URL or go back to the Team Report page.
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  const isLocked = report.state === 'FINALIZED' || report.state === 'SENT';
  const isActionPending = finalizeMutation.isPending || sendMutation.isPending;

  const visiblePersonReports = [...report.personReports]
    .filter(person => !person.excluded)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !weekId) return;
    const items = [...visiblePersonReports];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    const personUpdates = items.map((person: PersonReport, idx: number) => ({
      memberId: person.memberId,
      sortOrder: idx,
    }));
    updateMutation.mutate({ component: decodedComponent, data: { personUpdates }, weekId });
  };

  const componentReports = allReports
    ? [...allReports]
        .filter(rep => (rep.component ?? '') === (report.component ?? ''))
        .sort((left, right) => left.weekId.localeCompare(right.weekId))
    : [];

  const previousStats = (() => {
    const sorted = [...componentReports].reverse();
    const currentIdx = sorted.findIndex(rep => rep.weekId === report.weekId);
    const prev = currentIdx >= 0 ? sorted[currentIdx + 1] : null;
    return prev?.aggregateStats ?? null;
  })();

  const sparklineData = (() => {
    const recent = componentReports.slice(-SPARKLINE_WEEKS);
    if (recent.length < 2) return undefined;
    const result = new Map<keyof AggregateStats, number[]>();
    for (const { key } of STAT_ITEMS) {
      result.set(
        key,
        recent.map(rep => rep.aggregateStats?.[key] ?? 0),
      );
    }
    return result;
  })();

  const daysAgo = computeDaysAgo(report.createdAt);

  return (
    <>
      <PageSection>
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to="/report">Team Report</Link>
          </BreadcrumbItem>
          {decodedComponent && <BreadcrumbItem>{decodedComponent}</BreadcrumbItem>}
          <BreadcrumbItem isActive>
            {report.weekStart} &ndash; {report.weekEnd}
          </BreadcrumbItem>
        </Breadcrumb>
        <Content className="app-mt-md" component="h1">
          {decodedComponent ?? 'Team Report'} &mdash; {report.weekStart} &ndash; {report.weekEnd}
        </Content>
      </PageSection>

      <PageSection>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem className="app-flex-1">
            <ReportProgressStepper state={report.state} />
          </FlexItem>
          {daysAgo !== null && (
            <FlexItem>
              <Label isCompact color={daysAgo > 5 ? 'orange' : 'grey'} icon={<ClockIcon />}>
                Generated {pluralize(daysAgo, 'day')} ago
              </Label>
            </FlexItem>
          )}
        </Flex>
      </PageSection>

      {report.warnings.length > 0 && (
        <PageSection>
          <ReportWarnings warnings={report.warnings} />
        </PageSection>
      )}

      {report.aggregateStats && (
        <PageSection>
          <ReportAggregateStats
            previousStats={previousStats}
            sparklineData={sparklineData}
            stats={report.aggregateStats}
          />
        </PageSection>
      )}

      <PageSection>
        <ManagerHighlightsCard
          highlights={highlights}
          isLocked={isLocked}
          onChange={handleHighlightsChange}
        />
      </PageSection>

      {report.taskSummary && (
        <PageSection>
          <Card>
            <CardTitle>Task Summary</CardTitle>
            <CardBody>
              <TaskSummaryView taskSummary={report.taskSummary} />
            </CardBody>
          </Card>
        </PageSection>
      )}

      <PageSection>
        <Content component="h2">Team Members</Content>
        {isLocked ? (
          <Grid hasGutter>
            {visiblePersonReports.map(person => (
              <GridItem key={person.memberId} span={12}>
                <PersonCard personReport={person} />
              </GridItem>
            ))}
          </Grid>
        ) : (
          <DraggablePersonCards
            personReports={visiblePersonReports}
            onDragEnd={handleDragEnd}
            onNotesChange={handlePersonNotesChange}
          />
        )}
      </PageSection>

      <PageSection>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Button
                icon={<CopyIcon />}
                variant="secondary"
                onClick={() => {
                  const md = generateMarkdown(report);
                  void navigator.clipboard.writeText(md);
                }}
              >
                Copy as Markdown
              </Button>
            </ToolbarItem>
            {!isLocked && (
              <ToolbarItem>
                <Button
                  isDisabled={isActionPending}
                  isLoading={finalizeMutation.isPending}
                  variant="primary"
                  onClick={() => setConfirmAction('finalize')}
                >
                  Finalize
                </Button>
              </ToolbarItem>
            )}
            {report.state === 'FINALIZED' && (
              <ToolbarItem>
                <Button
                  isDisabled={isActionPending}
                  isLoading={sendMutation.isPending}
                  variant="primary"
                  onClick={() => setConfirmAction('send')}
                >
                  Send
                </Button>
              </ToolbarItem>
            )}
          </ToolbarContent>
        </Toolbar>
      </PageSection>

      <PageSection>
        <ReportAuditTrail
          createdAt={report.createdAt}
          sentAt={report.sentAt}
          state={report.state}
          updatedAt={report.updatedAt}
        />
      </PageSection>

      {confirmAction && (
        <ConfirmModal
          action={confirmAction}
          isPending={finalizeMutation.isPending || sendMutation.isPending}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
};
