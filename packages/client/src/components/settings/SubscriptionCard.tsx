import React, { useState, useMemo } from 'react';
import type { SearchableSelectOption } from '../common/SearchableSelect';
import {
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  TextInput,
  Button,
  Switch,
  Alert,
  Flex,
  FlexItem,
  Label,
  Select,
  SelectList,
  SelectOption,
  MenuToggle,
  MenuToggleCheckbox,
  Content,
  Checkbox,
  ToggleGroup,
  ToggleGroupItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { TrashIcon, PlusCircleIcon, PlayIcon } from '@patternfly/react-icons';
import { SearchableSelect } from '../common/SearchableSelect';
import type { Subscription } from '@cnv-monitor/shared';

const DAYS = [
  { id: '1', label: 'Mon' },
  { id: '2', label: 'Tue' },
  { id: '3', label: 'Wed' },
  { id: '4', label: 'Thu' },
  { id: '5', label: 'Fri' },
  { id: '6', label: 'Sat' },
  { id: '0', label: 'Sun' },
];

const WEEKDAY_IDS = new Set(['1', '2', '3', '4', '5']);
const ALL_DAY_IDS = new Set(DAYS.map(d => d.id));

function parseCron(cron: string): { hour: number; minute: number; days: Set<string> } {
  const parts = cron.split(' ');
  const minute = parseInt(parts[0]) || 0;
  const hour = parseInt(parts[1]) || 7;
  const daysPart = parts[4] || '*';
  if (daysPart === '*') return { hour, minute, days: new Set(ALL_DAY_IDS) };
  const dayIds = daysPart.split(',').flatMap(seg => {
    const match = seg.match(/^(\d)-(\d)$/);
    if (match) {
      const result: string[] = [];
      for (let i = parseInt(match[1]); i <= parseInt(match[2]); i++) result.push(String(i));
      return result;
    }
    return [seg];
  });
  return { hour, minute, days: new Set(dayIds) };
}

function buildCron(hour: number, minute: number, days: Set<string>): string {
  const dayStr = days.size === 0 || days.size === 7 ? '*' : [...days].sort((a, b) => parseInt(a) - parseInt(b)).join(',');
  return `${minute} ${hour} * * ${dayStr}`;
}

export function formatScheduleLabel(cron: string): string {
  const { hour, minute, days } = parseCron(cron);
  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  if (days.size === 7) return `Daily at ${time}`;
  if (days.size === 5 && [...WEEKDAY_IDS].every(d => days.has(d)) && !days.has('0') && !days.has('6')) return `Weekdays at ${time}`;
  if (days.size === 2 && days.has('0') && days.has('6')) return `Weekends at ${time}`;
  const labels = DAYS.filter(d => days.has(d.id)).map(d => d.label);
  return `${labels.join(', ')} at ${time}`;
}

type DayPreset = 'every-day' | 'weekdays' | 'custom';

function getDayPreset(days: Set<string>): DayPreset {
  if (days.size === 7) return 'every-day';
  if (days.size === 5 && [...WEEKDAY_IDS].every(d => days.has(d)) && !days.has('0') && !days.has('6')) return 'weekdays';
  return 'custom';
}

const TIMEZONE_LIST: string[] = (() => {
  const supportedValuesOf = (Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
  if (typeof supportedValuesOf === 'function') return supportedValuesOf('timeZone').slice().sort();
  return ['Asia/Jerusalem', 'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Europe/Prague', 'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney'];
})();

const TZ_OPTIONS: SearchableSelectOption[] = TIMEZONE_LIST.map(tz => ({ value: tz, label: tz }));

type SubscriptionCardProps = {
  subscription: Subscription;
  availableComponents: string[];
  onUpdate: (id: number, data: Partial<Subscription>) => void;
  onDelete: (id: number) => void;
  onTest: (id: number) => void;
  testMessage?: { type: 'success' | 'danger'; text: string } | null;
  isTesting?: boolean;
  currentUserEmail?: string;
  isAdmin?: boolean;
};

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  availableComponents,
  onUpdate,
  onDelete,
  onTest,
  testMessage,
  isTesting,
  currentUserEmail,
  isAdmin: isAdminProp,
}) => {
  const sub = subscription;
  const canEdit = isAdminProp || sub.createdBy === currentUserEmail;
  const [newEmail, setNewEmail] = useState('');
  const [compOpen, setCompOpen] = useState(false);

  const timezoneOptions = useMemo(() => {
    if (sub.timezone && !TIMEZONE_LIST.includes(sub.timezone)) {
      return [{ value: sub.timezone, label: sub.timezone }, ...TZ_OPTIONS];
    }
    return TZ_OPTIONS;
  }, [sub.timezone]);

  const cronParsed = useMemo(() => parseCron(sub.schedule), [sub.schedule]);
  const dayPreset = useMemo(() => getDayPreset(cronParsed.days), [cronParsed.days]);

  const updateSchedule = (hour: number, minute: number, days: Set<string>) => {
    onUpdate(sub.id, { schedule: buildCron(hour, minute, days) });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, m] = e.target.value.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) updateSchedule(h, m, cronParsed.days);
  };

  const handlePreset = (preset: DayPreset) => {
    if (preset === 'every-day') updateSchedule(cronParsed.hour, cronParsed.minute, new Set(ALL_DAY_IDS));
    else if (preset === 'weekdays') updateSchedule(cronParsed.hour, cronParsed.minute, new Set(WEEKDAY_IDS));
  };

  const toggleDay = (dayId: string) => {
    const next = new Set(cronParsed.days);
    if (next.has(dayId)) { if (next.size <= 1) return; next.delete(dayId); } else { next.add(dayId); }
    updateSchedule(cronParsed.hour, cronParsed.minute, next);
  };

  const toggleComponent = (comp: string): void => {
    const next = sub.components.includes(comp)
      ? sub.components.filter(c => c !== comp)
      : [...sub.components, comp];
    onUpdate(sub.id, { components: next });
  };

  const addEmail = (): void => {
    const email = newEmail.trim();
    if (email && !sub.emailRecipients.includes(email)) {
      onUpdate(sub.id, { emailRecipients: [...sub.emailRecipients, email] });
      setNewEmail('');
    }
  };

  const removeEmail = (email: string): void => {
    onUpdate(sub.id, { emailRecipients: sub.emailRecipients.filter(e => e !== email) });
  };

  const componentLabel = useMemo(() => {
    if (sub.components.length === 0) return 'All Components';
    if (sub.components.length === 1) return sub.components[0];
    return `${sub.components.length} components`;
  }, [sub.components]);

  return (
    <Card>
      <CardTitle>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem style={{ flex: 1 }}>
            <TextInput
              value={sub.name}
              onChange={(_e, v) => onUpdate(sub.id, { name: v })}
              aria-label="Subscription name"
              placeholder="Subscription name"
              isDisabled={!canEdit}
            />
          </FlexItem>
          <FlexItem>
            {sub.createdBy && (
              <Label color="grey" isCompact style={{ marginRight: 8 }}>{sub.createdBy}</Label>
            )}
          </FlexItem>
          <FlexItem>
            <Switch
              id={`sub-enabled-${sub.id}`}
              isChecked={sub.enabled}
              onChange={(_e, checked) => onUpdate(sub.id, { enabled: checked })}
              label="Enabled"
              isReversed
              isDisabled={!canEdit}
            />
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Form>
          <FormGroup label="Components" fieldId={`sub-comp-${sub.id}`}>
            <Select
              role="menu"
              id={`sub-comp-${sub.id}`}
              isOpen={compOpen}
              onOpenChange={setCompOpen}
              onSelect={(_e, val) => toggleComponent(val as string)}
              toggle={(ref) => (
                <MenuToggle ref={ref} onClick={() => setCompOpen(!compOpen)} isExpanded={compOpen} style={{ width: '100%' }}>
                  <MenuToggleCheckbox
                    id={`sub-comp-check-${sub.id}`}
                    isChecked={sub.components.length === availableComponents.length ? true : sub.components.length > 0 ? null : false}
                    onChange={(checked) => {
                      onUpdate(sub.id, { components: checked ? [...availableComponents] : [] });
                    }}
                    aria-label="Select components"
                  />
                  {componentLabel}
                </MenuToggle>
              )}
            >
              <SelectList>
                {availableComponents.map(comp => (
                  <SelectOption key={comp} value={comp} hasCheckbox isSelected={sub.components.includes(comp)}>
                    {comp}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>

          <FormGroup label="Slack Webhook" fieldId={`sub-slack-${sub.id}`}>
            <TextInput
              id={`sub-slack-${sub.id}`}
              value={sub.slackWebhook ?? ''}
              onChange={(_e, v) => onUpdate(sub.id, { slackWebhook: v || null })}
              placeholder="https://hooks.slack.com/services/..."
            />
          </FormGroup>

          <FormGroup label="Email Recipients" fieldId={`sub-email-${sub.id}`}>
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
              {sub.emailRecipients.map(email => (
                <FlexItem key={email}>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem><Label>{email}</Label></FlexItem>
                    <FlexItem>
                      <Button variant="plain" size="sm" aria-label={`Remove ${email}`} onClick={() => removeEmail(email)} icon={<TrashIcon />} />
                    </FlexItem>
                  </Flex>
                </FlexItem>
              ))}
              <FlexItem>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem style={{ flex: 1 }}>
                    <TextInput
                      value={newEmail}
                      onChange={(_e, v) => setNewEmail(v)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                      placeholder="Add email address..."
                      aria-label="New email"
                    />
                  </FlexItem>
                  <FlexItem>
                    <Button variant="plain" size="sm" onClick={addEmail} isDisabled={!newEmail.trim()} icon={<PlusCircleIcon />} aria-label="Add email" />
                  </FlexItem>
                </Flex>
              </FlexItem>
            </Flex>
          </FormGroup>

          <FormGroup label="Schedule" fieldId={`sub-sched-${sub.id}`}>
            <Stack hasGutter>
              <StackItem>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
                  <FlexItem>
                    <Content component="small" className="app-text-muted">Time</Content>
                  </FlexItem>
                  <FlexItem>
                    <input
                      type="time"
                      value={`${String(cronParsed.hour).padStart(2, '0')}:${String(cronParsed.minute).padStart(2, '0')}`}
                      onChange={handleTimeChange}
                      style={{ padding: '4px 8px', border: '1px solid var(--pf-t--global--border--color--default)', borderRadius: 4, background: 'transparent', color: 'inherit', fontSize: 14 }}
                    />
                  </FlexItem>
                </Flex>
              </StackItem>
              <StackItem>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
                  <FlexItem>
                    <Content component="small" className="app-text-muted">Days</Content>
                  </FlexItem>
                  <FlexItem>
                    <ToggleGroup>
                      <ToggleGroupItem text="Every day" isSelected={dayPreset === 'every-day'} onChange={() => handlePreset('every-day')} />
                      <ToggleGroupItem text="Weekdays" isSelected={dayPreset === 'weekdays'} onChange={() => handlePreset('weekdays')} />
                      <ToggleGroupItem text="Custom" isSelected={dayPreset === 'custom'} onChange={() => {}} />
                    </ToggleGroup>
                  </FlexItem>
                </Flex>
              </StackItem>
              <StackItem>
                <Flex spaceItems={{ default: 'spaceItemsMd' }}>
                  {DAYS.map(day => (
                    <FlexItem key={day.id}>
                      <Checkbox
                        id={`sub-day-${sub.id}-${day.id}`}
                        label={day.label}
                        isChecked={cronParsed.days.has(day.id)}
                        onChange={() => toggleDay(day.id)}
                        isDisabled={cronParsed.days.has(day.id) && cronParsed.days.size <= 1}
                      />
                    </FlexItem>
                  ))}
                </Flex>
              </StackItem>
            </Stack>
          </FormGroup>

          <FormGroup label="Timezone" fieldId={`sub-tz-${sub.id}`}>
            <SearchableSelect
              id={`sub-tz-${sub.id}`}
              value={sub.timezone || 'Asia/Jerusalem'}
              options={timezoneOptions}
              onChange={(v) => onUpdate(sub.id, { timezone: v })}
              placeholder="Select timezone"
            />
          </FormGroup>

          <Flex spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              <Button variant="secondary" size="sm" icon={<PlayIcon />} onClick={() => onTest(sub.id)} isLoading={isTesting}>
                Test
              </Button>
            </FlexItem>
            <FlexItem>
              <Button variant="danger" size="sm" icon={<TrashIcon />} onClick={() => onDelete(sub.id)} isDisabled={!canEdit}>
                Delete
              </Button>
            </FlexItem>
          </Flex>

          {testMessage && (
            <Alert variant={testMessage.type} isInline isPlain title={testMessage.text} style={{ marginTop: 8 }} />
          )}
        </Form>
      </CardBody>
    </Card>
  );
};
