import React, { useState } from 'react';

import {
  Alert,
  Button,
  Checkbox,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  NumberInput,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createQuarantineApi } from '../../api/quarantine';

type QuarantineResult = {
  quarantineId?: string;
  status?: string;
  errors?: string[];
  jiraKey?: string;
  skipPrUrl?: string;
  jiraSkipped?: boolean;
  skipPrSkipped?: boolean;
  skipPrFailed?: boolean;
  skipPrError?: string;
};

type CreateQuarantineModalProps = {
  isOpen: boolean;
  onClose: () => void;
  testName: string;
  testFilePath?: string;
  repoId?: string;
  component?: string;
};

export const CreateQuarantineModal: React.FC<CreateQuarantineModalProps> = ({
  component,
  isOpen,
  onClose,
  repoId,
  testFilePath,
  testName,
}) => {
  const [reason, setReason] = useState('');
  const [slaDays, setSlaDays] = useState(14);
  const [createJira, setCreateJira] = useState(true);
  const [createSkipPr, setCreateSkipPr] = useState(true);
  const [result, setResult] = useState<QuarantineResult | null>(null);
  const queryClient = useQueryClient();

  const shortName =
    (testName || '').split('/').pop() || (testName || '').split('.').pop() || testName || 'Unknown';

  const mutation = useMutation({
    mutationFn: () =>
      createQuarantineApi({
        component,
        createJira,
        createSkipPr,
        reason,
        repoId,
        slaDays,
        testFilePath,
        testName,
      }),
    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: ['quarantines'] });
      void queryClient.invalidateQueries({ queryKey: ['quarantineStats'] });
      setResult(data as QuarantineResult);
    },
  });

  const handleClose = () => {
    setResult(null);
    setReason('');
    onClose();
  };

  if (result) {
    const isValidationFailure = result.status === 'validation_failed';

    return (
      <Modal isOpen={isOpen} variant={ModalVariant.medium} onClose={handleClose}>
        <ModalHeader title={isValidationFailure ? 'Cannot Quarantine' : 'Test Quarantined'} />
        <ModalBody>
          {isValidationFailure ? (
            <Alert isInline className="app-mb-md" title="Pre-flight check failed" variant="danger">
              {result.errors?.map(errMsg => (
                <p key={errMsg}>{errMsg}</p>
              ))}
            </Alert>
          ) : (
            <Alert
              isInline
              className="app-mb-md"
              title="Quarantine created successfully"
              variant="success"
            />
          )}

          {!isValidationFailure && (
            <DescriptionList isCompact isHorizontal>
              <DescriptionListGroup>
                <DescriptionListTerm>Test</DescriptionListTerm>
                <DescriptionListDescription className="app-text-mono">
                  {shortName}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Status</DescriptionListTerm>
                <DescriptionListDescription>
                  <Label isCompact color="blue" icon={<CheckCircleIcon />}>
                    Active
                  </Label>
                </DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>Jira Ticket</DescriptionListTerm>
                <DescriptionListDescription>
                  {result.jiraKey ? (
                    <Button
                      isInline
                      component="a"
                      href={`https://issues.redhat.com/browse/${result.jiraKey}`}
                      icon={<ExternalLinkAltIcon />}
                      rel="noreferrer"
                      target="_blank"
                      variant="link"
                    >
                      {result.jiraKey}
                    </Button>
                  ) : result.jiraSkipped ? (
                    <Label isCompact color="orange">
                      Skipped (no personal Jira token)
                    </Label>
                  ) : (
                    <Label isCompact color="grey">
                      Not requested
                    </Label>
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>

              <DescriptionListGroup>
                <DescriptionListTerm>Skip PR</DescriptionListTerm>
                <DescriptionListDescription>
                  {result.skipPrUrl ? (
                    <Button
                      isInline
                      component="a"
                      href={result.skipPrUrl}
                      icon={<ExternalLinkAltIcon />}
                      rel="noreferrer"
                      target="_blank"
                      variant="link"
                    >
                      View Pull Request
                    </Button>
                  ) : result.skipPrFailed ? (
                    <Label isCompact color="red">
                      Failed: {result.skipPrError ?? 'Unknown error'}
                    </Label>
                  ) : result.skipPrSkipped ? (
                    <Label isCompact color="orange">
                      Skipped (no personal Git token)
                    </Label>
                  ) : (
                    <Label isCompact color="grey">
                      Not requested
                    </Label>
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={handleClose}>
            Done
          </Button>
        </ModalFooter>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} variant={ModalVariant.medium} onClose={handleClose}>
      <ModalHeader
        description="Temporarily disable this test. A Jira ticket and skip PR can be created automatically."
        title={`Quarantine: ${shortName}`}
      />
      <ModalBody>
        <Form>
          <FormGroup fieldId="q-test" label="Test">
            <TextInput isDisabled className="app-text-mono" id="q-test" value={testName || ''} />
          </FormGroup>
          <FormGroup isRequired fieldId="q-reason" label="Reason">
            <TextArea
              id="q-reason"
              placeholder="Why is this test being quarantined?"
              resizeOrientation="vertical"
              rows={3}
              value={reason}
              onChange={(_e, val) => setReason(val)}
            />
            <HelperText>
              <HelperTextItem>
                Describe the failure pattern or why this test should be skipped.
              </HelperTextItem>
            </HelperText>
          </FormGroup>
          <FormGroup fieldId="q-sla" label="SLA Duration">
            <NumberInput
              id="q-sla"
              max={90}
              min={1}
              unit="days"
              value={slaDays}
              onChange={e => setSlaDays(Number((e.target as HTMLInputElement).value))}
              onMinus={() => setSlaDays(Math.max(1, slaDays - 1))}
              onPlus={() => setSlaDays(slaDays + 1)}
            />
            <HelperText>
              <HelperTextItem>
                You'll be notified when the SLA expires. Default is 14 days.
              </HelperTextItem>
            </HelperText>
          </FormGroup>
          <FormGroup fieldId="q-actions" label="Automations">
            <Checkbox
              className="app-mb-sm"
              id="q-jira"
              isChecked={createJira}
              label="Create Jira ticket (uses your personal Jira token)"
              onChange={(_e, checked) => setCreateJira(checked)}
            />
            <Checkbox
              id="q-skip-pr"
              isChecked={createSkipPr}
              label="Create skip annotation PR (uses your personal Git token)"
              onChange={(_e, checked) => setCreateSkipPr(checked)}
            />
          </FormGroup>
          {mutation.isError && (
            <Alert isInline title="Failed to quarantine" variant="danger">
              {mutation.error.message}
            </Alert>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          isDisabled={!reason || mutation.isPending}
          isLoading={mutation.isPending}
          variant="primary"
          onClick={() => mutation.mutate()}
        >
          Quarantine
        </Button>
        <Button variant="link" onClick={handleClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
