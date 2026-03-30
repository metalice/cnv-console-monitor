import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Switch,
} from '@patternfly/react-core';

import { HelpLabel } from '../common/HelpLabel';

import type { NewRowState } from './NewSubscriptionForm';

type NewSubscriptionExtrasProps = {
  newRow: NewRowState;
  onFieldChange: <K extends keyof NewRowState>(field: K, value: NewRowState[K]) => void;
};

export const NewSubscriptionExtras = ({ newRow, onFieldChange }: NewSubscriptionExtrasProps) => (
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
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Switch
              hasCheckIcon
              isReversed
              id="new-sub-reminder"
              isChecked={newRow.reminderEnabled}
              label="Enabled"
              onChange={(_e, checked) => onFieldChange('reminderEnabled', checked)}
            />
          </FlexItem>
          {}
          {newRow.reminderEnabled && (
            <FlexItem>
              <input
                className="app-time-input-sm"
                type="time"
                value={newRow.reminderTime}
                onChange={e => onFieldChange('reminderTime', e.target.value)}
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
          onChange={(_e, checked) => onFieldChange('aiDigest', checked)}
        />
      </DescriptionListDescription>
    </DescriptionListGroup>
  </DescriptionList>
);
