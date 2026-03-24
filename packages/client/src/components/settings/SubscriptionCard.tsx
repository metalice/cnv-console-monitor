import React, { useMemo, useState } from 'react';

import type { Subscription } from '@cnv-monitor/shared';

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Dropdown,
  DropdownItem,
  DropdownList,
  ExpandableSection,
  Flex,
  FlexItem,
  Icon,
  Label,
  MenuToggle,
  Switch,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import {
  BanIcon,
  BellIcon,
  BugIcon,
  CheckCircleIcon,
  ClockIcon,
  EllipsisVIcon,
  EnvelopeIcon,
  SlackIcon,
  UserIcon,
} from '@patternfly/react-icons';

import { formatScheduleLabel } from '../../utils/cronHelpers';
import { ComponentMultiSelect } from '../common/ComponentMultiSelect';

import { ScheduleEditor } from './ScheduleEditor';
import type { AlertMessage } from './types';

type SubscriptionCardProps = {
  sub: Subscription;
  availableComponents: string[];
  testingSubId: number | string | null;
  subTestMessages: Record<number | string, AlertMessage>;
  canEdit: boolean;
  onUpdate: (data: Partial<Subscription>) => void;
  onToggle: (checked: boolean) => void;
  onTest: () => void;
  onDelete: () => void;
};

const truncateUrl = (url: string | null | undefined): string => {
  if (!url) {
    return '';
  }
  const segments = url.split('/');
  const last = segments[segments.length - 1];
  return last.length > 20 ? `...${last.slice(-18)}` : `.../${last}`;
};

// eslint-disable-next-line max-lines-per-function
export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  availableComponents,
  canEdit,
  onDelete,
  onTest,
  onToggle,
  onUpdate,
  sub,
  subTestMessages,
  testingSubId,
}) => {
  const [kebabOpen, setKebabOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Subscription>>({});

  const channelCount = useMemo(() => {
    let count = 0;
    if (sub.slackWebhook) {
      count++;
    }
    if (sub.jiraWebhook) {
      count++;
    }
    if (sub.emailRecipients.length > 0) {
      count++;
    }
    return count;
  }, [sub.slackWebhook, sub.jiraWebhook, sub.emailRecipients]);

  const componentLabel = useMemo(() => {
    if (sub.components.length === 0) {
      return 'All Components';
    }
    if (sub.components.length === 1) {
      return sub.components[0];
    }
    return `${sub.components.length} components`;
  }, [sub.components]);

  const owner = sub.createdBy ? sub.createdBy.split('@')[0] : 'Unknown';

  const handleSave = () => {
    onUpdate(draft);
    setIsEditing(false);
    setDraft({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraft({});
  };

  const cardClass = `app-sub-card ${sub.enabled ? '' : 'app-sub-card--disabled'}`;

  return (
    <Card isCompact className={cardClass}>
      <CardHeader
        actions={{
          actions: canEdit ? (
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsSm' }}
            >
              <FlexItem>
                <Switch
                  isReversed
                  aria-label="Toggle subscription"
                  id={`sub-toggle-${sub.id}`}
                  isChecked={sub.enabled}
                  onChange={(_e, checked) => onToggle(checked)}
                />
              </FlexItem>
              <FlexItem>
                <Dropdown
                  isOpen={kebabOpen}
                  popperProps={{ position: 'right' }}
                  // eslint-disable-next-line react/no-unstable-nested-components
                  toggle={ref => (
                    <MenuToggle
                      aria-label="Actions"
                      isExpanded={kebabOpen}
                      ref={ref}
                      variant="plain"
                      onClick={() => setKebabOpen(!kebabOpen)}
                    >
                      <EllipsisVIcon />
                    </MenuToggle>
                  )}
                  onOpenChange={setKebabOpen}
                  onSelect={() => setKebabOpen(false)}
                >
                  <DropdownList>
                    <DropdownItem
                      key="edit"
                      onClick={() => {
                        setIsEditing(true);
                        setDraft({});
                      }}
                    >
                      Edit
                    </DropdownItem>
                    <DropdownItem key="test" onClick={onTest}>
                      {testingSubId === sub.id ? 'Testing...' : 'Test'}
                    </DropdownItem>
                    <DropdownItem isDanger key="delete" onClick={onDelete}>
                      Delete
                    </DropdownItem>
                  </DropdownList>
                </Dropdown>
              </FlexItem>
            </Flex>
          ) : (
            <Switch
              isDisabled
              isReversed
              aria-label="Subscription status"
              id={`sub-toggle-${sub.id}`}
              isChecked={sub.enabled}
              onChange={() => {
                // no-op
              }}
            />
          ),
          hasNoOffset: true,
        }}
      >
        <CardTitle>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              <Icon size="sm" status={sub.enabled ? 'success' : 'danger'}>
                {sub.enabled ? <CheckCircleIcon /> : <BanIcon />}
              </Icon>
            </FlexItem>
            <FlexItem className="app-sub-card-name">{sub.name}</FlexItem>
          </Flex>
        </CardTitle>
      </CardHeader>

      <CardBody>
        <div className="app-sub-card-meta">
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              <Tooltip content={componentLabel}>
                <Label isCompact color={sub.components.length === 0 ? 'blue' : 'grey'}>
                  {componentLabel}
                </Label>
              </Tooltip>
            </FlexItem>
            <FlexItem className="app-sub-card-divider">|</FlexItem>
            <FlexItem>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsXs' }}
              >
                <FlexItem>
                  <Icon size="sm">
                    <ClockIcon />
                  </Icon>
                </FlexItem>
                <FlexItem className="app-text-sm">{formatScheduleLabel(sub.schedule)}</FlexItem>
              </Flex>
            </FlexItem>
            <FlexItem className="app-sub-card-divider">|</FlexItem>
            <FlexItem>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsXs' }}
              >
                <FlexItem>
                  <Icon size="sm">
                    <UserIcon />
                  </Icon>
                </FlexItem>
                <FlexItem className="app-text-sm app-text-muted">{owner}</FlexItem>
              </Flex>
            </FlexItem>
            {sub.reminderEnabled && (
              <>
                <FlexItem className="app-sub-card-divider">|</FlexItem>
                <FlexItem>
                  <Flex
                    alignItems={{ default: 'alignItemsCenter' }}
                    spaceItems={{ default: 'spaceItemsXs' }}
                  >
                    <FlexItem>
                      <Icon size="sm">
                        <BellIcon />
                      </Icon>
                    </FlexItem>
                    <FlexItem className="app-text-sm">
                      Reminder {sub.reminderTime || '10:00'}
                    </FlexItem>
                  </Flex>
                </FlexItem>
              </>
            )}
          </Flex>
        </div>

        <div className="app-sub-channels">
          <Flex spaceItems={{ default: 'spaceItemsMd' }}>
            {sub.slackWebhook && (
              <FlexItem>
                <Tooltip content={sub.slackWebhook}>
                  <div className="app-sub-channel-chip app-sub-channel-chip--slack">
                    <SlackIcon className="app-sub-channel-icon" />
                    <span>Slack</span>
                    <span className="app-sub-channel-detail">{truncateUrl(sub.slackWebhook)}</span>
                  </div>
                </Tooltip>
              </FlexItem>
            )}
            {sub.jiraWebhook && (
              <FlexItem>
                <Tooltip content={sub.jiraWebhook}>
                  <div className="app-sub-channel-chip app-sub-channel-chip--jira">
                    <BugIcon className="app-sub-channel-icon" />
                    <span>Jira</span>
                    <span className="app-sub-channel-detail">{truncateUrl(sub.jiraWebhook)}</span>
                  </div>
                </Tooltip>
              </FlexItem>
            )}
            {sub.emailRecipients.length > 0 && (
              <FlexItem>
                <Tooltip content={sub.emailRecipients.join(', ')}>
                  <div className="app-sub-channel-chip app-sub-channel-chip--email">
                    <EnvelopeIcon className="app-sub-channel-icon" />
                    <span>Email</span>
                    <span className="app-sub-channel-detail">
                      {sub.emailRecipients.length === 1
                        ? sub.emailRecipients[0]
                        : `${sub.emailRecipients.length} recipients`}
                    </span>
                  </div>
                </Tooltip>
              </FlexItem>
            )}
            {channelCount === 0 && (
              <FlexItem>
                <span className="app-text-muted app-text-sm">No channels configured</span>
              </FlexItem>
            )}
          </Flex>
        </div>

        {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data */}
        {subTestMessages[sub.id] && (
          <Alert
            isInline
            isPlain
            className="app-mt-sm"
            title={subTestMessages[sub.id].text}
            variant={subTestMessages[sub.id].type}
          />
        )}

        {isEditing && (
          <ExpandableSection
            isDetached
            isExpanded
            className="app-mt-md"
            toggleText="Edit subscription"
          >
            <div className="app-sub-edit-form">
              <DescriptionList isCompact isHorizontal columnModifier={{ default: '1Col' }}>
                <DescriptionListGroup>
                  <DescriptionListTerm>Name</DescriptionListTerm>
                  <DescriptionListDescription>
                    <TextInput
                      aria-label="Subscription name"
                      value={draft.name ?? sub.name}
                      onChange={(_e, v) => setDraft(d => ({ ...d, name: v }))}
                    />
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Components</DescriptionListTerm>
                  <DescriptionListDescription>
                    <ComponentMultiSelect
                      id={`sub-comp-edit-${sub.id}`}
                      options={availableComponents}
                      selected={new Set(draft.components ?? sub.components)}
                      onChange={s => setDraft(d => ({ ...d, components: [...s] }))}
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
                      onChange={(_e, v) => setDraft(d => ({ ...d, slackWebhook: v }))}
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
                      onChange={(_e, v) => setDraft(d => ({ ...d, jiraWebhook: v }))}
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
                      onChange={(_e, v) =>
                        setDraft(d => ({
                          ...d,
                          emailRecipients: v
                            .split(',')
                            .map(a => a.trim())
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
                onScheduleChange={s => setDraft(d => ({ ...d, schedule: s }))}
                onTimezoneChange={tz => setDraft(d => ({ ...d, timezone: tz }))}
              />

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
                            setDraft(d => ({ ...d, reminderEnabled: checked }))
                          }
                        />
                      </FlexItem>
                      {(draft.reminderEnabled ?? sub.reminderEnabled) && (
                        <FlexItem>
                          <input
                            className="app-time-input-sm"
                            type="time"
                            value={draft.reminderTime ?? sub.reminderTime ?? '10:00'}
                            onChange={e => setDraft(d => ({ ...d, reminderTime: e.target.value }))}
                          />
                        </FlexItem>
                      )}
                    </Flex>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>

              <Flex className="app-mt-md" spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Button size="sm" variant="primary" onClick={handleSave}>
                    Save
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Button size="sm" variant="link" onClick={handleCancel}>
                    Cancel
                  </Button>
                </FlexItem>
              </Flex>
            </div>
          </ExpandableSection>
        )}
      </CardBody>
    </Card>
  );
};
