import React, { useState, useMemo } from 'react';
import {
  Card, CardBody, CardHeader, CardTitle,
  Button, Switch, Label, Tooltip, Flex, FlexItem,
  TextInput, Alert, Icon,
  Dropdown, DropdownItem, DropdownList, MenuToggle,
  DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
  ExpandableSection,
} from '@patternfly/react-core';
import {
  EllipsisVIcon, SlackIcon, EnvelopeIcon,
  ClockIcon, CalendarAltIcon, UserIcon,
  CheckCircleIcon, BanIcon, ExternalLinkAltIcon, BugIcon, BellIcon,
} from '@patternfly/react-icons';
import { ComponentMultiSelect } from '../common/ComponentMultiSelect';
import { ScheduleEditor } from './ScheduleEditor';
import { formatScheduleLabel } from '../../utils/cronHelpers';
import type { Subscription } from '@cnv-monitor/shared';
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
  if (!url) return '';
  const segments = url.split('/');
  const last = segments[segments.length - 1];
  return last.length > 20 ? `...${last.slice(-18)}` : `.../${last}`;
};

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  sub, availableComponents, testingSubId, subTestMessages, canEdit,
  onUpdate, onToggle, onTest, onDelete,
}) => {
  const [kebabOpen, setKebabOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Subscription>>({});

  const channelCount = useMemo(() => {
    let count = 0;
    if (sub.slackWebhook) count++;
    if (sub.jiraWebhook) count++;
    if (sub.emailRecipients.length > 0) count++;
    return count;
  }, [sub.slackWebhook, sub.jiraWebhook, sub.emailRecipients]);

  const componentLabel = useMemo(() => {
    if (sub.components.length === 0) return 'All Components';
    if (sub.components.length === 1) return sub.components[0];
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
    <Card className={cardClass} isCompact>
      <CardHeader
        actions={{
          actions: canEdit ? (
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <Switch
                  id={`sub-toggle-${sub.id}`}
                  isChecked={sub.enabled}
                  onChange={(_e, checked) => onToggle(checked)}
                  aria-label="Toggle subscription"
                  isReversed
                />
              </FlexItem>
              <FlexItem>
                <Dropdown
                  isOpen={kebabOpen}
                  onOpenChange={setKebabOpen}
                  onSelect={() => setKebabOpen(false)}
                  popperProps={{ position: 'right' }}
                  toggle={(ref) => (
                    <MenuToggle ref={ref} variant="plain" onClick={() => setKebabOpen(!kebabOpen)} isExpanded={kebabOpen} aria-label="Actions">
                      <EllipsisVIcon />
                    </MenuToggle>
                  )}
                >
                  <DropdownList>
                    <DropdownItem key="edit" onClick={() => { setIsEditing(true); setDraft({}); }}>Edit</DropdownItem>
                    <DropdownItem key="test" onClick={onTest}>{testingSubId === sub.id ? 'Testing...' : 'Test'}</DropdownItem>
                    <DropdownItem key="delete" isDanger onClick={onDelete}>Delete</DropdownItem>
                  </DropdownList>
                </Dropdown>
              </FlexItem>
            </Flex>
          ) : (
            <Switch
              id={`sub-toggle-${sub.id}`}
              isChecked={sub.enabled}
              onChange={() => {}}
              aria-label="Subscription status"
              isReversed
              isDisabled
            />
          ),
          hasNoOffset: true,
        }}
      >
        <CardTitle>
          <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              <Icon status={sub.enabled ? 'success' : 'danger'} size="sm">
                {sub.enabled ? <CheckCircleIcon /> : <BanIcon />}
              </Icon>
            </FlexItem>
            <FlexItem className="app-sub-card-name">{sub.name}</FlexItem>
          </Flex>
        </CardTitle>
      </CardHeader>

      <CardBody>
        <div className="app-sub-card-meta">
          <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              <Tooltip content={componentLabel}>
                <Label color={sub.components.length === 0 ? 'blue' : 'grey'} isCompact>
                  {componentLabel}
                </Label>
              </Tooltip>
            </FlexItem>
            <FlexItem className="app-sub-card-divider">|</FlexItem>
            <FlexItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsXs' }}>
                <FlexItem><Icon size="sm"><ClockIcon /></Icon></FlexItem>
                <FlexItem className="app-text-sm">{formatScheduleLabel(sub.schedule)}</FlexItem>
              </Flex>
            </FlexItem>
            <FlexItem className="app-sub-card-divider">|</FlexItem>
            <FlexItem>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsXs' }}>
                <FlexItem><Icon size="sm"><UserIcon /></Icon></FlexItem>
                <FlexItem className="app-text-sm app-text-muted">{owner}</FlexItem>
              </Flex>
            </FlexItem>
            {sub.reminderEnabled && (
              <>
                <FlexItem className="app-sub-card-divider">|</FlexItem>
                <FlexItem>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsXs' }}>
                    <FlexItem><Icon size="sm"><BellIcon /></Icon></FlexItem>
                    <FlexItem className="app-text-sm">Reminder {sub.reminderTime || '10:00'}</FlexItem>
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
                      {sub.emailRecipients.length === 1 ? sub.emailRecipients[0] : `${sub.emailRecipients.length} recipients`}
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

        {subTestMessages[sub.id] && (
          <Alert variant={subTestMessages[sub.id].type} isInline isPlain title={subTestMessages[sub.id].text} className="app-mt-sm" />
        )}

        {isEditing && (
          <ExpandableSection toggleText="Edit subscription" isExpanded isDetached className="app-mt-md">
            <div className="app-sub-edit-form">
              <DescriptionList isCompact isHorizontal columnModifier={{ default: '1Col' }}>
                <DescriptionListGroup>
                  <DescriptionListTerm>Name</DescriptionListTerm>
                  <DescriptionListDescription>
                    <TextInput value={draft.name ?? sub.name} onChange={(_e, v) => setDraft(d => ({ ...d, name: v }))} aria-label="Subscription name" />
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Components</DescriptionListTerm>
                  <DescriptionListDescription>
                    <ComponentMultiSelect
                      id={`sub-comp-edit-${sub.id}`}
                      selected={new Set(draft.components ?? sub.components)}
                      options={availableComponents}
                      onChange={(s) => setDraft(d => ({ ...d, components: [...s] }))}
                    />
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Slack Webhook</DescriptionListTerm>
                  <DescriptionListDescription>
                    <TextInput value={draft.slackWebhook ?? sub.slackWebhook ?? ''} onChange={(_e, v) => setDraft(d => ({ ...d, slackWebhook: v }))} placeholder="https://hooks.slack.com/..." aria-label="Slack Webhook" />
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Jira Webhook</DescriptionListTerm>
                  <DescriptionListDescription>
                    <TextInput value={draft.jiraWebhook ?? sub.jiraWebhook ?? ''} onChange={(_e, v) => setDraft(d => ({ ...d, jiraWebhook: v }))} placeholder="https://hooks.slack.com/..." aria-label="Jira Webhook" />
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Email Recipients</DescriptionListTerm>
                  <DescriptionListDescription>
                    <TextInput
                      value={draft.emailRecipients !== undefined ? (draft.emailRecipients as string[]).join(', ') : sub.emailRecipients.join(', ')}
                      onChange={(_e, v) => setDraft(d => ({ ...d, emailRecipients: v.split(',').map(a => a.trim()).filter(Boolean) }))}
                      placeholder="a@b.com, c@d.com" aria-label="Email Recipients"
                    />
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>

              <ScheduleEditor
                subId={sub.id}
                schedule={draft.schedule ?? sub.schedule}
                timezone={sub.timezone}
                onScheduleChange={(s) => setDraft(d => ({ ...d, schedule: s }))}
                onTimezoneChange={(tz) => setDraft(d => ({ ...d, timezone: tz }))}
              />

              <DescriptionList isCompact isHorizontal columnModifier={{ default: '1Col' }} className="app-mt-md">
                <DescriptionListGroup>
                  <DescriptionListTerm>Ack Reminder</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                      <FlexItem>
                        <Switch id={`sub-reminder-${sub.id}`} isChecked={draft.reminderEnabled ?? sub.reminderEnabled ?? false}
                          onChange={(_e, checked) => setDraft(d => ({ ...d, reminderEnabled: checked }))} label="Enabled" hasCheckIcon isReversed />
                      </FlexItem>
                      {(draft.reminderEnabled ?? sub.reminderEnabled) && (
                        <FlexItem>
                          <input type="time" className="app-time-input-sm"
                            value={draft.reminderTime ?? sub.reminderTime ?? '10:00'}
                            onChange={(e) => setDraft(d => ({ ...d, reminderTime: e.target.value }))} />
                        </FlexItem>
                      )}
                    </Flex>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>

              <Flex className="app-mt-md" spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
                </FlexItem>
                <FlexItem>
                  <Button variant="link" size="sm" onClick={handleCancel}>Cancel</Button>
                </FlexItem>
              </Flex>
            </div>
          </ExpandableSection>
        )}
      </CardBody>
    </Card>
  );
};
