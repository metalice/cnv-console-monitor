import { useState } from 'react';

import type { Subscription } from '@cnv-monitor/shared';

import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  TextInput,
} from '@patternfly/react-core';

import { ComponentMultiSelect } from '../common/ComponentMultiSelect';

import { ScheduleEditor } from './ScheduleEditor';
import { SubscriptionReminderFields } from './SubscriptionReminderFields';

type SubscriptionEditFormProps = {
  sub: Subscription;
  availableComponents: string[];
  onUpdate: (data: Partial<Subscription>) => void;
  onClose: () => void;
};

export const SubscriptionEditForm = ({
  availableComponents,
  onClose,
  onUpdate,
  sub,
}: SubscriptionEditFormProps) => {
  const [draft, setDraft] = useState<Partial<Subscription>>({});

  const handleSave = () => {
    onUpdate(draft);
    onClose();
  };

  return (
    <ExpandableSection isDetached isExpanded className="app-mt-md" toggleText="Edit subscription">
      <div className="app-sub-edit-form">
        <DescriptionList isCompact isHorizontal columnModifier={{ default: '1Col' }}>
          <DescriptionListGroup>
            <DescriptionListTerm>Name</DescriptionListTerm>
            <DescriptionListDescription>
              <TextInput
                aria-label="Subscription name"
                value={draft.name ?? sub.name}
                onChange={(_e, value) => setDraft(prev => ({ ...prev, name: value }))}
              />
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Components</DescriptionListTerm>
            <DescriptionListDescription>
              <ComponentMultiSelect
                id={`sub-comp-edit-${sub.id}`}
                options={availableComponents}
                selected={new Set<string>(draft.components ?? sub.components)}
                onChange={selected => setDraft(prev => ({ ...prev, components: [...selected] }))}
              />
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Slack Webhook</DescriptionListTerm>
            <DescriptionListDescription>
              <TextInput
                aria-label="Slack Webhook"
                placeholder="https://hooks.slack.com/..."
                value={draft.slackWebhook ?? sub.slackWebhook ?? ''}
                onChange={(_e, value) => setDraft(prev => ({ ...prev, slackWebhook: value }))}
              />
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Jira Webhook</DescriptionListTerm>
            <DescriptionListDescription>
              <TextInput
                aria-label="Jira Webhook"
                placeholder="https://hooks.slack.com/..."
                value={draft.jiraWebhook ?? sub.jiraWebhook ?? ''}
                onChange={(_e, value) => setDraft(prev => ({ ...prev, jiraWebhook: value }))}
              />
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Email Recipients</DescriptionListTerm>
            <DescriptionListDescription>
              <TextInput
                aria-label="Email Recipients"
                placeholder="a@b.com, c@d.com"
                value={
                  draft.emailRecipients !== undefined
                    ? draft.emailRecipients.join(', ')
                    : sub.emailRecipients.join(', ')
                }
                onChange={(_e, value) =>
                  setDraft(prev => ({
                    ...prev,
                    emailRecipients: value
                      .split(',')
                      .map(addr => addr.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>

        <ScheduleEditor
          schedule={draft.schedule ?? sub.schedule}
          subId={sub.id}
          timezone={sub.timezone}
          onScheduleChange={schedule => setDraft(prev => ({ ...prev, schedule }))}
          onTimezoneChange={timezone => setDraft(prev => ({ ...prev, timezone }))}
        />

        <SubscriptionReminderFields
          draft={draft}
          sub={sub}
          onCancel={onClose}
          onDraftChange={setDraft}
          onSave={handleSave}
        />
      </div>
    </ExpandableSection>
  );
};
