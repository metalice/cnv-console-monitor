import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Content,
  Alert,
  ExpandableSection,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, MagicIcon } from '@patternfly/react-icons';
import type { PublicConfig } from '@cnv-monitor/shared';
import { apiFetch } from '../../api/client';
import { createJiraBug } from '../../api/jira';
import { generateBugReport, type BugReport } from '../../api/ai';

type JiraCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  testItemId: number;
  testName: string;
  polarionId?: string | null;
  errorMessage?: string;
  component?: string;
  version?: string;
};

export const JiraCreateModal: React.FC<JiraCreateModalProps> = ({
  isOpen,
  onClose,
  testItemId,
  testName,
  polarionId,
  errorMessage,
  component,
  version,
}) => {
  const queryClient = useQueryClient();
  const [aiReport, setAiReport] = useState<BugReport | null>(null);
  const [reportExpanded, setReportExpanded] = useState(false);

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => apiFetch<PublicConfig>('/config'),
    staleTime: Infinity,
  });

  const jiraBrowseUrl = config?.jiraUrl ? `${config.jiraUrl}/browse` : null;

  const aiGenMutation = useMutation({
    mutationFn: () => generateBugReport({ testName, component, errorMessage: errorMessage ?? '', version }),
    onSuccess: (data) => { setAiReport(data); setReportExpanded(true); },
  });

  const mutation = useMutation({
    mutationFn: () => createJiraBug({ testItemId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['testItems'] });
      queryClient.invalidateQueries({ queryKey: ['untriaged'] });
      queryClient.invalidateQueries({ queryKey: ['testProfile'] });
    },
  });

  const shortName = testName.split('.').pop() || testName;

  return (
    <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Create Jira Bug" />
      <ModalBody>
        <Content component="p">
          This will create a Jira bug for the following test failure:
        </Content>
        <Content component="dl">
          <Content component="dt">Test</Content>
          <Content component="dd">{shortName}</Content>
          {polarionId && (
            <>
              <Content component="dt">Polarion ID</Content>
              <Content component="dd">{polarionId}</Content>
            </>
          )}
        </Content>
        {errorMessage && (
          <div className="app-mt-md">
            <Button variant="secondary" icon={<MagicIcon />} size="sm"
              onClick={() => aiGenMutation.mutate()}
              isLoading={aiGenMutation.isPending}
              isDisabled={aiGenMutation.isPending}
            >
              Generate with AI
            </Button>
            {aiReport && (
              <ExpandableSection toggleText="AI-Generated Bug Report" isExpanded={reportExpanded} onToggle={(_e, v) => setReportExpanded(v)} className="app-mt-sm">
                <div className="app-text-xs">
                  {aiReport.report.title && <div><strong>Title:</strong> {aiReport.report.title}</div>}
                  {aiReport.report.description && <div className="app-mt-xs"><strong>Description:</strong> {aiReport.report.description}</div>}
                  {aiReport.report.stepsToReproduce && <div className="app-mt-xs"><strong>Steps:</strong> {aiReport.report.stepsToReproduce}</div>}
                  {aiReport.report.expectedResult && <div className="app-mt-xs"><strong>Expected:</strong> {aiReport.report.expectedResult}</div>}
                  {aiReport.report.actualResult && <div className="app-mt-xs"><strong>Actual:</strong> {aiReport.report.actualResult}</div>}
                  <div className="app-text-muted app-mt-xs">{aiReport.model}{aiReport.cached ? ' (cached)' : ''}</div>
                </div>
              </ExpandableSection>
            )}
          </div>
        )}

        <Content component="p" className="app-mt-md app-text-muted">
          If a matching issue already exists, it will be linked instead of creating a duplicate.
        </Content>

        {mutation.isSuccess && mutation.data && (
          <Alert
            variant={mutation.data.existing ? 'info' : 'success'}
            title={mutation.data.existing ? 'Found existing issue' : 'Issue created'}
            className="app-mt-md"
          >
            <Content component="p">
              {jiraBrowseUrl ? (
                <a href={`${jiraBrowseUrl}/${mutation.data.issue.key}`} target="_blank" rel="noreferrer">
                  {mutation.data.issue.key} <ExternalLinkAltIcon />
                </a>
              ) : (
                <strong>{mutation.data.issue.key}</strong>
              )}
              {' — '}{mutation.data.issue.summary}
            </Content>
          </Alert>
        )}
        {mutation.isError && (
          <Alert variant="danger" title={(mutation.error as Error).message} className="app-mt-md" />
        )}
      </ModalBody>
      <ModalFooter>
        {!mutation.isSuccess ? (
          <Button variant="primary" onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
            Create Bug
          </Button>
        ) : (
          <Button variant="primary" onClick={onClose}>Done</Button>
        )}
        <Button variant="link" onClick={onClose}>Cancel</Button>
      </ModalFooter>
    </Modal>
  );
};
