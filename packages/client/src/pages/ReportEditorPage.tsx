import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { type ReportState } from '@cnv-monitor/shared';

import {
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
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  ProgressStep,
  ProgressStepper,
  Spinner,
  TextArea,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { CubesIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';

import { PersonCard } from '../components/weekly/PersonCard';
import { TaskSummaryView } from '../components/weekly/TaskSummaryView';
import {
  useAIEnhanceReport,
  useFinalizeWeeklyReport,
  useSendWeeklyReport,
  useUpdateWeeklyReport,
  useWeeklyReport,
} from '../hooks/useWeeklyReports';

const DEBOUNCE_MS = 800;

const STEP_ORDER: ReportState[] = ['DRAFT', 'REVIEW', 'FINALIZED', 'SENT'];

const STEP_LABELS: Record<ReportState, string> = {
  DRAFT: 'Draft',
  FINALIZED: 'Finalized',
  REVIEW: 'Review',
  SENT: 'Sent',
};

const getStepVariant = (step: ReportState, current: ReportState) => {
  const currentIdx = STEP_ORDER.indexOf(current);
  const stepIdx = STEP_ORDER.indexOf(step);
  if (stepIdx < currentIdx) return 'success' as const;
  if (stepIdx === currentIdx) return 'info' as const;
  return 'pending' as const;
};

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

const EditorLoading = () => (
  <div className="app-page-spinner">
    <Spinner aria-label="Loading report" />
  </div>
);

const EditorError = ({ message }: { message: string }) => (
  <PageSection>
    <EmptyState headingLevel="h2" icon={ExclamationTriangleIcon} titleText="Error loading report">
      <EmptyStateBody>{message}</EmptyStateBody>
    </EmptyState>
  </PageSection>
);

const EditorEmpty = () => (
  <PageSection>
    <EmptyState headingLevel="h2" icon={CubesIcon} titleText="Report not found">
      <EmptyStateBody>
        This weekly report does not exist. Check the URL or go back to the weekly dashboard.
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

const ReportProgressStepper = ({ state }: { state: ReportState }) => (
  <ProgressStepper>
    {STEP_ORDER.map(step => (
      <ProgressStep
        id={step}
        isCurrent={step === state}
        key={step}
        titleId={step}
        variant={getStepVariant(step, state)}
      >
        {STEP_LABELS[step]}
      </ProgressStep>
    ))}
  </ProgressStepper>
);

export const ReportEditorPage = () => {
  const { weekId } = useParams<{ weekId: string }>();
  const { data: report, error, isLoading } = useWeeklyReport(weekId);
  const updateMutation = useUpdateWeeklyReport();
  const finalizeMutation = useFinalizeWeeklyReport();
  const sendMutation = useSendWeeklyReport();
  const aiEnhanceMutation = useAIEnhanceReport();

  const [highlights, setHighlights] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.title = weekId
      ? `Edit Report ${weekId} | CNV Console Monitor`
      : 'Edit Report | CNV Console Monitor';
  }, [weekId]);

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
        updateMutation.mutate({ data: { managerHighlights: value }, weekId });
      }, DEBOUNCE_MS);
    },
    [weekId, updateMutation],
  );

  const handleHighlightsChange = (_event: unknown, value: string) => {
    setHighlights(value);
    debouncedSave(value);
  };

  const handlePersonNotesChange = useCallback(
    (memberId: string, notes: string) => {
      if (!weekId) return;
      updateMutation.mutate({
        data: { personUpdates: [{ managerNotes: notes, memberId }] },
        weekId,
      });
    },
    [weekId, updateMutation],
  );

  const handleConfirm = () => {
    if (!weekId || !confirmAction) return;
    if (confirmAction === 'finalize') {
      finalizeMutation.mutate(weekId, { onSuccess: () => setConfirmAction(null) });
    } else {
      sendMutation.mutate(weekId, { onSuccess: () => setConfirmAction(null) });
    }
  };

  if (isLoading) return <EditorLoading />;
  if (error) return <EditorError message={error.message} />;
  if (!report) return <EditorEmpty />;

  const isLocked = report.state === 'FINALIZED' || report.state === 'SENT';
  const isActionPending =
    finalizeMutation.isPending || sendMutation.isPending || aiEnhanceMutation.isPending;

  return (
    <>
      <PageSection>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Content component="h1">Edit Report &mdash; {report.weekId}</Content>
            <Content component="small">
              {report.weekStart} &ndash; {report.weekEnd}
            </Content>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <ReportProgressStepper state={report.state} />
      </PageSection>

      <PageSection>
        <Card>
          <CardTitle>Manager Highlights</CardTitle>
          <CardBody>
            <TextArea
              aria-label="Manager highlights"
              className="app-weekly-highlights-textarea"
              isDisabled={isLocked}
              rows={4}
              value={highlights}
              onChange={handleHighlightsChange}
            />
          </CardBody>
        </Card>
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
        <Grid hasGutter>
          {report.personReports
            .filter(person => !person.excluded)
            .map(person => (
              <GridItem key={person.memberId} span={12}>
                <PersonCard
                  editable={!isLocked}
                  personReport={person}
                  onNotesChange={notes => handlePersonNotesChange(person.memberId, notes)}
                />
              </GridItem>
            ))}
        </Grid>
      </PageSection>

      <PageSection>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Button
                isDisabled={isLocked || isActionPending}
                isLoading={aiEnhanceMutation.isPending}
                variant="secondary"
                onClick={() => weekId && aiEnhanceMutation.mutate(weekId)}
              >
                AI Enhance
              </Button>
            </ToolbarItem>
            <ToolbarItem>
              <Button
                isDisabled={report.state !== 'DRAFT' || isActionPending}
                isLoading={finalizeMutation.isPending}
                variant="primary"
                onClick={() => setConfirmAction('finalize')}
              >
                Finalize
              </Button>
            </ToolbarItem>
            <ToolbarItem>
              <Button
                isDisabled={report.state !== 'FINALIZED' || isActionPending}
                isLoading={sendMutation.isPending}
                variant="primary"
                onClick={() => setConfirmAction('send')}
              >
                Send
              </Button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </PageSection>

      {confirmAction && (
        <Modal
          isOpen
          aria-label={CONFIRM_CONFIG[confirmAction].title}
          variant="small"
          onClose={() => setConfirmAction(null)}
        >
          <ModalHeader title={CONFIRM_CONFIG[confirmAction].title} />
          <ModalBody>{CONFIRM_CONFIG[confirmAction].body}</ModalBody>
          <ModalFooter>
            <Button
              isLoading={finalizeMutation.isPending || sendMutation.isPending}
              variant="primary"
              onClick={handleConfirm}
            >
              Confirm
            </Button>
            <Button variant="link" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
};
