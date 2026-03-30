import type { Subscription } from '@cnv-monitor/shared';

import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Switch,
} from '@patternfly/react-core';

type SubscriptionReminderFieldsProps = {
  sub: Subscription;
  draft: Partial<Subscription>;
  onDraftChange: (updater: (prev: Partial<Subscription>) => Partial<Subscription>) => void;
  onSave: () => void;
  onCancel: () => void;
};

export const SubscriptionReminderFields = ({
  draft,
  onCancel,
  onDraftChange,
  onSave,
  sub,
}: SubscriptionReminderFieldsProps) => (
  <>
    <DescriptionList
      isCompact
      isHorizontal
      className="app-mt-md"
      columnModifier={{ default: '1Col' }}
    >
      <DescriptionListGroup>
        <DescriptionListTerm>Ack Reminder</DescriptionListTerm>
        <DescriptionListDescription>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              <Switch
                hasCheckIcon
                isReversed
                id={`sub-reminder-${sub.id}`}
                isChecked={draft.reminderEnabled ?? sub.reminderEnabled ?? false}
                label="Enabled"
                onChange={(_e, checked) =>
                  onDraftChange(prev => ({ ...prev, reminderEnabled: checked }))
                }
              />
            </FlexItem>
            {(draft.reminderEnabled ?? sub.reminderEnabled) && (
              <FlexItem>
                <input
                  className="app-time-input-sm"
                  type="time"
                  value={draft.reminderTime ?? sub.reminderTime ?? '10:00'}
                  onChange={evt =>
                    onDraftChange(prev => ({ ...prev, reminderTime: evt.target.value }))
                  }
                />
              </FlexItem>
            )}
          </Flex>
        </DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>

    <Flex className="app-mt-md" spaceItems={{ default: 'spaceItemsSm' }}>
      <FlexItem>
        <Button size="sm" variant="primary" onClick={onSave}>
          Save
        </Button>
      </FlexItem>
      <FlexItem>
        <Button size="sm" variant="link" onClick={onCancel}>
          Cancel
        </Button>
      </FlexItem>
    </Flex>
  </>
);
