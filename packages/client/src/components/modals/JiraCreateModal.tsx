import { useState } from 'react';

import type { PublicConfig } from '@cnv-monitor/shared';

import {
  Alert,
  Button,
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type BugReport, generateBugReport } from '../../api/ai';
import { apiFetch } from '../../api/client';
import { createJiraBug } from '../../api/jira';

import { AiBugReportSection } from './AiBugReportSection';

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

export const JiraCreateModal = ({
  component,
  errorMessage,
  isOpen,
  onClose,
  polarionId,
  testItemId,
  testName,
  version,
}: JiraCreateModalProps) => {
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
          <AiBugReportSection
            isExpanded={reportExpanded}
            isPending={aiGenMutation.isPending}
            report={aiReport}
            onGenerate={() => aiGenMutation.mutate()}
            onToggle={(_e, expanded) => setReportExpanded(expanded)}
          />
        )}
        <Content className="app-mt-md app-text-muted" component="p">
          If a matching issue already exists, it will be linked instead of creating a duplicate.
        </Content>
        {mutation.isSuccess && (
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
