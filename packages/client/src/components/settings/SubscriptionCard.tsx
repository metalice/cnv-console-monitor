import React, { useState, useMemo } from 'react';
import {
  Card, CardBody, CardTitle, Form, FormGroup,
  TextInput, Button, Switch, Alert, Flex, FlexItem, Label,
  Select, SelectList, SelectOption, MenuToggle, MenuToggleCheckbox,
} from '@patternfly/react-core';
import { TrashIcon, PlusCircleIcon, PlayIcon } from '@patternfly/react-icons';
import type { Subscription } from '@cnv-monitor/shared';
import { ScheduleEditor } from './ScheduleEditor';

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
  subscription, availableComponents, onUpdate, onDelete, onTest,
  testMessage, isTesting, currentUserEmail, isAdmin: isAdminProp,
}) => {
  const sub = subscription;
  const canEdit = isAdminProp || sub.createdBy === currentUserEmail;
  const [newEmail, setNewEmail] = useState('');
  const [compOpen, setCompOpen] = useState(false);

  const toggleComponent = (component: string): void => {
    const next = sub.components.includes(component) ? sub.components.filter(existing => existing !== component) : [...sub.components, component];
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
    onUpdate(sub.id, { emailRecipients: sub.emailRecipients.filter(existing => existing !== email) });
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
          <FlexItem className="app-flex-1">
            <TextInput value={sub.name} onChange={(_e, inputValue) => onUpdate(sub.id, { name: inputValue })} aria-label="Subscription name" placeholder="Subscription name" isDisabled={!canEdit} />
          </FlexItem>
          <FlexItem>
            {sub.createdBy && <Label color="grey" isCompact className="app-mr-sm">{sub.createdBy}</Label>}
          </FlexItem>
          <FlexItem>
            <Switch id={`sub-enabled-${sub.id}`} isChecked={sub.enabled} onChange={(_e, checked) => onUpdate(sub.id, { enabled: checked })} label="Enabled" isReversed isDisabled={!canEdit} />
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Form>
          <FormGroup label="Components" fieldId={`sub-comp-${sub.id}`}>
            <Select role="menu" id={`sub-comp-${sub.id}`} isOpen={compOpen} onOpenChange={setCompOpen} onSelect={(_e, selected) => toggleComponent(selected as string)}
              toggle={(ref) => (
                <MenuToggle ref={ref} onClick={() => setCompOpen(!compOpen)} isExpanded={compOpen} className="app-w-full">
                  <MenuToggleCheckbox id={`sub-comp-check-${sub.id}`} isChecked={sub.components.length === availableComponents.length ? true : sub.components.length > 0 ? null : false}
                    onChange={(checked) => onUpdate(sub.id, { components: checked ? [...availableComponents] : [] })} aria-label="Select components" />
                  {componentLabel}
                </MenuToggle>
              )}>
              <SelectList>
                {availableComponents.map(component => (
                  <SelectOption key={component} value={component} hasCheckbox isSelected={sub.components.includes(component)}>{component}</SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>

          <FormGroup label="Slack Webhook" fieldId={`sub-slack-${sub.id}`}>
            <TextInput id={`sub-slack-${sub.id}`} value={sub.slackWebhook ?? ''} onChange={(_e, inputValue) => onUpdate(sub.id, { slackWebhook: inputValue || null })} placeholder="https://hooks.slack.com/services/..." />
          </FormGroup>

          <FormGroup label="Email Recipients" fieldId={`sub-email-${sub.id}`}>
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
              {sub.emailRecipients.map(email => (
                <FlexItem key={email}>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem><Label>{email}</Label></FlexItem>
                    <FlexItem><Button variant="plain" size="sm" aria-label={`Remove ${email}`} onClick={() => removeEmail(email)} icon={<TrashIcon />} /></FlexItem>
                  </Flex>
                </FlexItem>
              ))}
              <FlexItem>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem className="app-flex-1">
                    <TextInput value={newEmail} onChange={(_e, inputValue) => setNewEmail(inputValue)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }} placeholder="Add email address..." aria-label="New email" />
                  </FlexItem>
                  <FlexItem><Button variant="plain" size="sm" onClick={addEmail} isDisabled={!newEmail.trim()} icon={<PlusCircleIcon />} aria-label="Add email" /></FlexItem>
                </Flex>
              </FlexItem>
            </Flex>
          </FormGroup>

          <ScheduleEditor subId={sub.id} schedule={sub.schedule} timezone={sub.timezone} onScheduleChange={(schedule) => onUpdate(sub.id, { schedule })} onTimezoneChange={(timezone) => onUpdate(sub.id, { timezone })} />

          <Flex spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem><Button variant="secondary" size="sm" icon={<PlayIcon />} onClick={() => onTest(sub.id)} isLoading={isTesting}>Test</Button></FlexItem>
            <FlexItem><Button variant="danger" size="sm" icon={<TrashIcon />} onClick={() => onDelete(sub.id)} isDisabled={!canEdit}>Delete</Button></FlexItem>
          </Flex>

          {testMessage && <Alert variant={testMessage.type} isInline isPlain title={testMessage.text} className="app-mt-sm" />}
        </Form>
      </CardBody>
    </Card>
  );
};
