import React, { useState } from 'react';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  TextInput,
  TextArea,
  NumberInput,
  Checkbox,
  Alert,
  HelperText,
  HelperTextItem,
  Label,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, CheckCircleIcon } from '@patternfly/react-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createQuarantineApi, resolveQuarantineApi } from '../../api/quarantine';

interface QuarantineResult {
  quarantineId?: string;
  jiraKey?: string;
  skipPrUrl?: string;
  jiraSkipped?: boolean;
  skipPrSkipped?: boolean;
}

interface CreateQuarantineModalProps {
  isOpen: boolean;
  onClose: () => void;
  testName: string;
  testFilePath?: string;
  repoId?: string;
  component?: string;
}

export const CreateQuarantineModal: React.FC<CreateQuarantineModalProps> = ({ isOpen, onClose, testName, testFilePath, repoId, component }) => {
  const [reason, setReason] = useState('');
  const [slaDays, setSlaDays] = useState(14);
  const [createJira, setCreateJira] = useState(true);
  const [createSkipPr, setCreateSkipPr] = useState(true);
  const [result, setResult] = useState<QuarantineResult | null>(null);
  const queryClient = useQueryClient();

  const shortName = (testName || '').split('/').pop() || (testName || '').split('.').pop() || testName || 'Unknown';

  const mutation = useMutation({
    mutationFn: () => createQuarantineApi({
      testName,
      testFilePath,
      repoId,
      component,
      reason,
      slaDays,
      createJira,
      createSkipPr,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quarantines'] });
      queryClient.invalidateQueries({ queryKey: ['quarantineStats'] });
      setResult(data as QuarantineResult);
    },
  });

  const handleClose = () => {
    setResult(null);
    setReason('');
    onClose();
  };

  if (result) {
    return (
      <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={handleClose}>
        <ModalHeader title="Test Quarantined" />
        <ModalBody>
          <Alert variant="success" isInline title="Quarantine created successfully" className="app-mb-md" />

          <DescriptionList isHorizontal isCompact>
            <DescriptionListGroup>
              <DescriptionListTerm>Test</DescriptionListTerm>
              <DescriptionListDescription className="app-text-mono">{shortName}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Status</DescriptionListTerm>
              <DescriptionListDescription><Label color="blue" icon={<CheckCircleIcon />} isCompact>Active</Label></DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>Jira Ticket</DescriptionListTerm>
              <DescriptionListDescription>
                {result.jiraKey ? (
                  <Button variant="link" component="a" href={`https://issues.redhat.com/browse/${result.jiraKey}`} target="_blank" rel="noreferrer" icon={<ExternalLinkAltIcon />} isInline>
                    {result.jiraKey}
                  </Button>
                ) : result.jiraSkipped ? (
                  <Label color="orange" isCompact>Skipped (no personal Jira token)</Label>
                ) : (
                  <Label color="grey" isCompact>Not requested</Label>
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>Skip PR</DescriptionListTerm>
              <DescriptionListDescription>
                {result.skipPrUrl ? (
                  <Button variant="link" component="a" href={result.skipPrUrl} target="_blank" rel="noreferrer" icon={<ExternalLinkAltIcon />} isInline>
                    View Pull Request
                  </Button>
                ) : result.skipPrSkipped ? (
                  <Label color="orange" isCompact>Skipped (no personal Git token)</Label>
                ) : (
                  <Label color="grey" isCompact>Not requested</Label>
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={handleClose}>Done</Button>
        </ModalFooter>
      </Modal>
    );
  }

  return (
    <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={handleClose}>
      <ModalHeader title={`Quarantine: ${shortName}`} description="Temporarily disable this test. A Jira ticket and skip PR can be created automatically." />
      <ModalBody>
        <Form>
          <FormGroup label="Test" fieldId="q-test">
            <TextInput id="q-test" value={testName || ''} isDisabled className="app-text-mono" />
          </FormGroup>
          <FormGroup label="Reason" isRequired fieldId="q-reason">
            <TextArea id="q-reason" value={reason} onChange={(_e, val) => setReason(val)} placeholder="Why is this test being quarantined?" rows={3} resizeOrientation="vertical" />
            <HelperText><HelperTextItem>Describe the failure pattern or why this test should be skipped.</HelperTextItem></HelperText>
          </FormGroup>
          <FormGroup label="SLA Duration" fieldId="q-sla">
            <NumberInput
              id="q-sla"
              value={slaDays}
              onChange={(e) => setSlaDays(Number((e.target as HTMLInputElement).value))}
              onMinus={() => setSlaDays(Math.max(1, slaDays - 1))}
              onPlus={() => setSlaDays(slaDays + 1)}
              min={1}
              max={90}
              unit="days"
            />
            <HelperText><HelperTextItem>You'll be notified when the SLA expires. Default is 14 days.</HelperTextItem></HelperText>
          </FormGroup>
          <FormGroup fieldId="q-actions" label="Automations">
            <Checkbox id="q-jira" label="Create Jira ticket (uses your personal Jira token)" isChecked={createJira} onChange={(_e, checked) => setCreateJira(checked)} className="app-mb-sm" />
            <Checkbox id="q-skip-pr" label="Create skip annotation PR (uses your personal Git token)" isChecked={createSkipPr} onChange={(_e, checked) => setCreateSkipPr(checked)} />
          </FormGroup>
          {mutation.isError && <Alert variant="danger" isInline title="Failed to quarantine">{(mutation.error as Error).message}</Alert>}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={() => mutation.mutate()} isDisabled={!reason || mutation.isPending} isLoading={mutation.isPending}>Quarantine</Button>
        <Button variant="link" onClick={handleClose}>Cancel</Button>
      </ModalFooter>
    </Modal>
  );
};

interface ResolveQuarantineModalProps {
  isOpen: boolean;
  onClose: () => void;
  quarantineId: string;
  testName: string;
}

export const ResolveQuarantineModal: React.FC<ResolveQuarantineModalProps> = ({ isOpen, onClose, quarantineId, testName }) => {
  const [fixDescription, setFixDescription] = useState('');
  const [fixCommitUrl, setFixCommitUrl] = useState('');
  const queryClient = useQueryClient();

  const shortName = (testName || '').split('/').pop() || (testName || '').split('.').pop() || testName || 'Unknown';

  const mutation = useMutation({
    mutationFn: () => resolveQuarantineApi(quarantineId, { fixDescription, fixCommitUrl: fixCommitUrl || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quarantines'] });
      queryClient.invalidateQueries({ queryKey: ['quarantineStats'] });
      onClose();
      setFixDescription('');
      setFixCommitUrl('');
    },
  });

  return (
    <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={onClose}>
      <ModalHeader title={`Unquarantine: ${shortName}`} description="Resolve this quarantine and re-enable the test." />
      <ModalBody>
        <Form>
          <FormGroup label="What was fixed?" isRequired fieldId="fix-desc">
            <TextArea id="fix-desc" value={fixDescription} onChange={(_e, val) => setFixDescription(val)} placeholder="Describe the fix..." rows={3} resizeOrientation="vertical" />
          </FormGroup>
          <FormGroup label="Fix Commit or PR URL" fieldId="fix-url">
            <TextInput id="fix-url" value={fixCommitUrl} onChange={(_e, val) => setFixCommitUrl(val)} placeholder="https://github.com/..." />
            <HelperText><HelperTextItem>Link to the commit or PR that resolved the issue.</HelperTextItem></HelperText>
          </FormGroup>
          {mutation.isError && <Alert variant="danger" isInline title="Failed to resolve">{(mutation.error as Error).message}</Alert>}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={() => mutation.mutate()} isDisabled={!fixDescription || mutation.isPending} isLoading={mutation.isPending}>Unquarantine</Button>
        <Button variant="link" onClick={onClose}>Cancel</Button>
      </ModalFooter>
    </Modal>
  );
};
