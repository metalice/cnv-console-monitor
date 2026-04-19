import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  TextInput,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';

import { ComponentMultiSelect } from '../common/ComponentMultiSelect';
import { HelpLabel } from '../common/HelpLabel';

import type { NewRowState } from './NewSubscriptionForm';

type NewSubscriptionFieldsProps = {
  newRow: NewRowState;
  availableComponents: string[];
  onFieldChange: <K extends keyof NewRowState>(field: K, value: NewRowState[K]) => void;
};

export const NewSubscriptionFields = ({
  availableComponents,
  newRow,
  onFieldChange,
}: NewSubscriptionFieldsProps) => {
  const isTeamReport = newRow.type === 'team_report';

  return (
    <DescriptionList isCompact isHorizontal columnModifier={{ default: '1Col' }}>
      <DescriptionListGroup>
        <DescriptionListTerm>
          <HelpLabel
            help="Choose the subscription type. Test notifications send daily test results. Team reports send team report summaries."
            label="Type"
          />
        </DescriptionListTerm>
        <DescriptionListDescription>
          <ToggleGroup aria-label="Subscription type">
            <ToggleGroupItem
              aria-label="Test Notification"
              buttonId="type-test"
              isSelected={!isTeamReport}
              text="Test Notification"
              onChange={() => onFieldChange('type', 'test')}
            />
            <ToggleGroupItem
              aria-label="Team Report"
              buttonId="type-team-report"
              isSelected={isTeamReport}
              text="Team Report"
              onChange={() => onFieldChange('type', 'team_report')}
            />
          </ToggleGroup>
        </DescriptionListDescription>
      </DescriptionListGroup>
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
              placeholder={
                isTeamReport ? 'e.g. Networking Team Report' : 'e.g. CNV 4.17 Daily Report'
              }
              value={newRow.name}
              onChange={(_e, value) => onFieldChange('name', value)}
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
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data
              selected={new Set(newRow.components || [])}
              onChange={selected => onFieldChange('components', [...selected])}
            />
          </div>
        </DescriptionListDescription>
      </DescriptionListGroup>
      {isTeamReport ? (
        <>
          <DescriptionListGroup>
            <DescriptionListTerm>
              <HelpLabel help="Slack webhook for team report delivery." label="Team Report Slack" />
            </DescriptionListTerm>
            <DescriptionListDescription>
              <div className="app-max-w-350">
                <TextInput
                  aria-label="Team Report Slack Webhook"
                  placeholder="https://hooks.slack.com/services/..."
                  value={newRow.teamReportSlackWebhook}
                  onChange={(_e, value) => onFieldChange('teamReportSlackWebhook', value)}
                />
              </div>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>
              <HelpLabel
                help="Comma-separated email addresses to receive the team report."
                label="Team Report Email"
              />
            </DescriptionListTerm>
            <DescriptionListDescription>
              <div className="app-max-w-350">
                <TextInput
                  aria-label="Team Report Email Recipients"
                  placeholder="a@b.com, c@d.com"
                  value={newRow.teamReportEmailRecipients}
                  onChange={(_e, value) => onFieldChange('teamReportEmailRecipients', value)}
                />
              </div>
            </DescriptionListDescription>
          </DescriptionListGroup>
        </>
      ) : (
        <>
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
                  onChange={(_e, value) => onFieldChange('slackWebhook', value)}
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
                  onChange={(_e, value) => onFieldChange('jiraWebhook', value)}
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
                  onChange={(_e, value) => onFieldChange('emailRecipients', value)}
                />
              </div>
            </DescriptionListDescription>
          </DescriptionListGroup>
        </>
      )}
    </DescriptionList>
  );
};
