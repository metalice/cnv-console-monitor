import React from 'react';

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Switch,
  TextInput,
} from '@patternfly/react-core';
import { PlusCircleIcon, TimesIcon } from '@patternfly/react-icons';

import { ComponentMultiSelect } from '../common/ComponentMultiSelect';
import { HelpLabel } from '../common/HelpLabel';

import { ScheduleEditor } from './ScheduleEditor';
import type { AlertMessage } from './types';

export type NewRowState = {
  name: string;
  components: string[];
  slackWebhook: string;
  jiraWebhook: string;
  emailRecipients: string;
  schedule: string;
  enabled: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
  aiDigest?: boolean;
};

type NewSubscriptionFormProps = {
  newRow: NewRowState;
  setNewRow: React.Dispatch<React.SetStateAction<NewRowState | null>>;
  setNewRowTested: (v: boolean) => void;
  newRowTested: boolean;
  availableComponents: string[];
  testingSubId: number | string | null;
  subTestMessages: Record<number | string, AlertMessage>;
  userEmail: string;
  onTest: () => void;
  onSave: () => void;
  onCancel: () => void;
  isCreatePending: boolean;
};

export const NewSubscriptionForm: React.FC<NewSubscriptionFormProps> = ({
  availableComponents,
  isCreatePending,
  newRow,
  newRowTested,
  onCancel,
  onSave,
  onTest,
  setNewRow,
  setNewRowTested,
  subTestMessages,
  testingSubId,
  userEmail: _userEmail,
}) => {
  const updateField = <K extends keyof NewRowState>(field: K, value: NewRowState[K]) => {
    setNewRow(prev => (prev ? { ...prev, [field]: value } : prev));
    setNewRowTested(false);
  };

  const hasDestination = Boolean(newRow.slackWebhook || newRow.emailRecipients);

  return (
    <Card isCompact className="app-sub-card app-sub-card--new">
      <CardTitle>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsSm' }}
            >
              <FlexItem>
                <PlusCircleIcon className="app-sub-new-icon" />
              </FlexItem>
              <FlexItem>New Subscription</FlexItem>
            </Flex>
          </FlexItem>
          <FlexItem>
            <Button aria-label="Cancel" size="sm" variant="plain" onClick={onCancel}>
              <TimesIcon />
            </Button>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Content className="app-text-muted app-mb-md" component="small">
          Set up a new notification channel. You must test delivery before saving.
        </Content>

        <DescriptionList isCompact isHorizontal columnModifier={{ default: '1Col' }}>
          <DescriptionListGroup>
            <DescriptionListTerm>
              <HelpLabel
                help='A friendly name to identify this subscription, e.g. "CNV 4.17 Daily" or "Networking Team".'
                label="Name"
              />
            </DescriptionListTerm>
            <DescriptionListDescription>
              <div className="app-max-w-350">
                <TextInput
                  aria-label="Subscription name"
                  placeholder="e.g. CNV 4.17 Daily Report"
                  value={newRow.name}
                  onChange={(_e, v) => updateField('name', v)}
                />
              </div>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>
              <HelpLabel
                help="Filter the report to only include specific components. Leave empty to include all components."
                label="Components"
              />
            </DescriptionListTerm>
            <DescriptionListDescription>
              <div className="app-max-w-350">
                <ComponentMultiSelect
                  id="new-sub-comp"
                  options={availableComponents}
                  selected={new Set(newRow.components || [])}
                  onChange={selected => updateField('components', [...selected])}
                />
              </div>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>
              <HelpLabel
                help="Incoming Webhook URL for a Slack channel. The daily test report will be posted here. Create one at: Slack > Apps > Incoming Webhooks."
                label="Slack Webhook"
              />
            </DescriptionListTerm>
            <DescriptionListDescription>
              <div className="app-max-w-350">
                <TextInput
                  aria-label="Slack Webhook"
                  placeholder="https://hooks.slack.com/services/..."
                  value={newRow.slackWebhook}
                  onChange={(_e, v) => updateField('slackWebhook', v)}
                />
              </div>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>
              <HelpLabel
                help="Slack Incoming Webhook URL for Jira bug alerts. New bugs created from this dashboard will be posted here."
                label="Jira Webhook"
              />
            </DescriptionListTerm>
            <DescriptionListDescription>
              <div className="app-max-w-350">
                <TextInput
                  aria-label="Jira Webhook"
                  placeholder="Jira bug alert webhook URL"
                  value={newRow.jiraWebhook}
                  onChange={(_e, v) => updateField('jiraWebhook', v)}
                />
              </div>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>
              <HelpLabel
                help="Comma-separated list of email addresses to receive the daily report via email."
                label="Email Recipients"
              />
            </DescriptionListTerm>
            <DescriptionListDescription>
              <div className="app-max-w-350">
                <TextInput
                  aria-label="Email Recipients"
                  placeholder="a@b.com, c@d.com"
                  value={newRow.emailRecipients}
                  onChange={(_e, v) => updateField('emailRecipients', v)}
                />
              </div>
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>

        <ScheduleEditor
          schedule={newRow.schedule}
          subId={0}
          timezone="Asia/Jerusalem"
          onScheduleChange={s => updateField('schedule', s)}
          onTimezoneChange={() => {
            // no-op
          }}
        />

        <DescriptionList
          isCompact
          isHorizontal
          className="app-mt-sm"
          columnModifier={{ default: '1Col' }}
        >
          <DescriptionListGroup>
            <DescriptionListTerm>
              <HelpLabel
                help="Send a Slack reminder if the daily report has not been acknowledged by the configured time. Only triggers on selected days."
                label="Ack Reminder"
              />
            </DescriptionListTerm>
            <DescriptionListDescription>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <FlexItem>
                  <Switch
                    hasCheckIcon
                    isReversed
                    id="new-sub-reminder"
                    isChecked={newRow.reminderEnabled}
                    label="Enabled"
                    onChange={(_e, checked) => updateField('reminderEnabled', checked)}
                  />
                </FlexItem>
                {newRow.reminderEnabled && (
                  <FlexItem>
                    <input
                      className="app-time-input-sm"
                      type="time"
                      value={newRow.reminderTime}
                      onChange={e => updateField('reminderTime', e.target.value)}
                    />
                  </FlexItem>
                )}
              </Flex>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>
              <HelpLabel
                help="When enabled, notifications will include an AI-generated natural language summary of the daily test results. Requires AI to be configured in Settings."
                label="AI Digest"
              />
            </DescriptionListTerm>
            <DescriptionListDescription>
              <Switch
                id="new-sub-ai-digest"
                isChecked={Boolean(newRow.aiDigest)}
                label={newRow.aiDigest ? 'AI summary enabled' : 'AI summary disabled'}
                onChange={(_e, checked) => updateField('aiDigest', checked)}
              />
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>

        {subTestMessages.new && (
          <Alert
            isInline
            isPlain
            className="app-mt-sm"
            title={subTestMessages.new.text}
            variant={subTestMessages.new.type}
          />
        )}

        <Flex className="app-mt-md" spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Button
              isDisabled={!newRow.name.trim() || !hasDestination}
              isLoading={testingSubId === 'new'}
              size="sm"
              variant="secondary"
              onClick={onTest}
            >
              Test Delivery
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              isDisabled={!newRowTested}
              isLoading={isCreatePending}
              size="sm"
              variant="primary"
              onClick={onSave}
            >
              Save
            </Button>
          </FlexItem>
          <FlexItem>
            <Button size="sm" variant="link" onClick={onCancel}>
              Cancel
            </Button>
          </FlexItem>
          {!newRowTested && newRow.name.trim() && hasDestination && (
            <FlexItem>
              <Content className="app-text-muted" component="small">
                Test delivery first to enable Save
              </Content>
            </FlexItem>
          )}
        </Flex>
      </CardBody>
    </Card>
  );
};
