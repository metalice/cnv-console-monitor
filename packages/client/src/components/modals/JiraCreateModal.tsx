import React, { useState } from 'react';

import type { PublicConfig } from '@cnv-monitor/shared';

import {
  Alert,
  Button,
  Content,
  ExpandableSection,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Tooltip,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, MagicIcon } from '@patternfly/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type BugReport, generateBugReport } from '../../api/ai';
import { apiFetch } from '../../api/client';
import { createJiraBug } from '../../api/jira';

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
  component,
  errorMessage,
  isOpen,
  onClose,
  polarionId,
  testItemId,
  testName,
  version,
}) => {
  const queryClient = useQueryClient();
  const [aiReport, setAiReport] = useState<BugReport | null>(null);
  const [reportExpanded, setReportExpanded] = useState(false);

  const { data: config } = useQuery({
    queryFn: () => apiFetch<PublicConfig>('/config'),
    queryKey: ['config'],
    staleTime: Infinity,
  });

  const jiraBrowseUrl = config?.jiraUrl ? `${config.jiraUrl}/browse` : null;

  const aiGenMutation = useMutation({
    mutationFn: () =>
      generateBugReport({ component, errorMessage: errorMessage ?? '', testName, version }),
    onSuccess: data => {
      setAiReport(data);
      setReportExpanded(true);
    },
  });

  const mutation = useMutation({
    mutationFn: () => createJiraBug({ testItemId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['report'] });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
      void queryClient.invalidateQueries({ queryKey: ['testItems'] });
      void queryClient.invalidateQueries({ queryKey: ['untriaged'] });
      void queryClient.invalidateQueries({ queryKey: ['testProfile'] });
    },
  });

  const shortName = testName.split('.').pop() || testName;

  return (
    <Modal isOpen={isOpen} variant={ModalVariant.medium} onClose={onClose}>
      <ModalHeader title="Create Jira Bug" />
      <ModalBody>
        <Content component="p">This will create a Jira bug for the following test failure:</Content>
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
            <Tooltip content="AI generates a complete bug report from the test name, error message, and version context — including title, description, steps to reproduce, and expected vs actual results.">
              <Button
                icon={<MagicIcon />}
                isDisabled={aiGenMutation.isPending}
                isLoading={aiGenMutation.isPending}
                size="sm"
                variant="secondary"
                onClick={() => aiGenMutation.mutate()}
              >
                Generate with AI
              </Button>
            </Tooltip>
            {aiReport && (
              <ExpandableSection
                className="app-mt-sm"
                isExpanded={reportExpanded}
                toggleText="AI-Generated Bug Report"
                onToggle={(_e, v) => setReportExpanded(v)}
              >
                <div className="app-text-xs">
                  {aiReport.report.title && (
                    <div>
                      <strong>Title:</strong> {aiReport.report.title}
                    </div>
                  )}
                  {aiReport.report.description && (
                    <div className="app-mt-xs">
                      <strong>Description:</strong> {aiReport.report.description}
                    </div>
                  )}
                  {aiReport.report.stepsToReproduce && (
                    <div className="app-mt-xs">
                      <strong>Steps:</strong> {aiReport.report.stepsToReproduce}
                    </div>
                  )}
                  {aiReport.report.expectedResult && (
                    <div className="app-mt-xs">
                      <strong>Expected:</strong> {aiReport.report.expectedResult}
                    </div>
                  )}
                  {aiReport.report.actualResult && (
                    <div className="app-mt-xs">
                      <strong>Actual:</strong> {aiReport.report.actualResult}
                    </div>
                  )}
                  <div className="app-text-muted app-mt-xs">
                    {aiReport.model}
                    {aiReport.cached ? ' (cached)' : ''}
                  </div>
                </div>
              </ExpandableSection>
            )}
          </div>
        )}

        <Content className="app-mt-md app-text-muted" component="p">
          If a matching issue already exists, it will be linked instead of creating a duplicate.
        </Content>

        {mutation.isSuccess && mutation.data && (
          <Alert
            className="app-mt-md"
            title={mutation.data.existing ? 'Found existing issue' : 'Issue created'}
            variant={mutation.data.existing ? 'info' : 'success'}
          >
            <Content component="p">
              {jiraBrowseUrl ? (
                <a
                  href={`${jiraBrowseUrl}/${mutation.data.issue.key}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  {mutation.data.issue.key} <ExternalLinkAltIcon />
                </a>
              ) : (
                <strong>{mutation.data.issue.key}</strong>
              )}
              {' — '}
              {mutation.data.issue.summary}
            </Content>
          </Alert>
        )}
        {mutation.isError && (
          <Alert className="app-mt-md" title={mutation.error.message} variant="danger" />
        )}
      </ModalBody>
      <ModalFooter>
        {!mutation.isSuccess ? (
          <Button
            isLoading={mutation.isPending}
            variant="primary"
            onClick={() => mutation.mutate()}
          >
            Create Bug
          </Button>
        ) : (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        )}
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
