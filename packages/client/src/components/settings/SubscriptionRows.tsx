import React from 'react';
import {
  TextInput,
  Button,
  Alert,
  Flex,
  FlexItem,
  Label,
  Switch,
  Tooltip,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { Tr, Td } from '@patternfly/react-table';
import { ComponentMultiSelect } from '../common/ComponentMultiSelect';
import { formatScheduleLabel } from '../../utils/cronHelpers';
import { ScheduleInlineEditor } from './ScheduleInlineEditor';
import type { Subscription } from '@cnv-monitor/shared';
import type { AlertMessage } from './types';

type SubscriptionRowProps = {
  sub: Subscription;
  isEditing: boolean;
  editDraft: Partial<Subscription>;
  setEditDraft: React.Dispatch<React.SetStateAction<Partial<Subscription>>>;
  availableComponents: string[];
  kebabOpenId: number | null;
  setKebabOpenId: (id: number | null) => void;
  testingSubId: number | string | null;
  subTestMessages: Record<number | string, AlertMessage>;
  canEdit: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onToggle: (checked: boolean) => void;
  onTest: () => void;
  onDelete: () => void;
};

export const SubscriptionRow: React.FC<SubscriptionRowProps> = ({
  sub, isEditing, editDraft, setEditDraft, availableComponents,
  kebabOpenId, setKebabOpenId, testingSubId, subTestMessages, canEdit,
  onEdit, onCancelEdit, onSave, onToggle, onTest, onDelete,
}) => (
  <Tr>
    <Td className="app-cell-nowrap">
      {isEditing
        ? <TextInput value={editDraft.name ?? sub.name} onChange={(_e, inputValue) => setEditDraft(draft => ({ ...draft, name: inputValue }))} aria-label="Name" />
        : <Tooltip content={sub.name}><span className="app-cell-truncate">{sub.name}</span></Tooltip>}
    </Td>
    <Td className="app-cell-nowrap">
      {isEditing
        ? <ComponentMultiSelect id={`sub-comp-${sub.id}`} selected={new Set(editDraft.components ?? sub.components)} options={availableComponents} onChange={(selected) => setEditDraft(draft => ({ ...draft, components: [...selected] }))} />
        : (sub.components.length === 0 ? <Label color="blue" isCompact>All</Label> : sub.components.map(component => <Label key={component} color="grey" isCompact className="app-mr-sm">{component}</Label>))}
    </Td>
    <Td>
      {isEditing
        ? <TextInput value={editDraft.slackWebhook ?? sub.slackWebhook ?? ''} onChange={(_e, inputValue) => setEditDraft(draft => ({ ...draft, slackWebhook: inputValue }))} aria-label="Webhook" />
        : <Tooltip content={sub.slackWebhook || '--'}><span className="app-cell-truncate">{sub.slackWebhook ? '.../' + sub.slackWebhook.split('/').slice(-1)[0] : '--'}</span></Tooltip>}
    </Td>
    <Td>
      {isEditing
        ? <TextInput value={editDraft.jiraWebhook ?? sub.jiraWebhook ?? ''} onChange={(_e, inputValue) => setEditDraft(draft => ({ ...draft, jiraWebhook: inputValue }))} aria-label="Jira Webhook" />
        : <Tooltip content={sub.jiraWebhook || '--'}><span className="app-cell-truncate">{sub.jiraWebhook ? '.../' + sub.jiraWebhook.split('/').slice(-1)[0] : '--'}</span></Tooltip>}
    </Td>
    <Td>
      {isEditing
        ? <TextInput value={editDraft.emailRecipients !== undefined ? (editDraft.emailRecipients as string[]).join(', ') : sub.emailRecipients.join(', ')} onChange={(_e, inputValue) => setEditDraft(draft => ({ ...draft, emailRecipients: inputValue.split(',').map(addr => addr.trim()).filter(Boolean) }))} aria-label="Emails" />
        : <Tooltip content={sub.emailRecipients.join(', ') || '--'}><span className="app-cell-truncate">{sub.emailRecipients.length > 0 ? sub.emailRecipients.join(', ') : '--'}</span></Tooltip>}
    </Td>
    <Td className="app-cell-nowrap">
      {isEditing
        ? <ScheduleInlineEditor schedule={editDraft.schedule ?? sub.schedule} onChange={(schedule) => setEditDraft(draft => ({ ...draft, schedule }))} />
        : formatScheduleLabel(sub.schedule)}
    </Td>
    <Td>
      <Switch id={`sub-enabled-${sub.id}`} isChecked={sub.enabled} onChange={(_e, checked) => onToggle(checked)} isDisabled={!canEdit} aria-label="Toggle notification" />
    </Td>
    <Td>{sub.createdBy ? <Label color="grey" isCompact>{sub.createdBy.split('@')[0]}</Label> : '--'}</Td>
    <Td>
      {isEditing ? (
        <Flex spaceItems={{ default: 'spaceItemsXs' }} flexWrap={{ default: 'nowrap' }}>
          <FlexItem><Button variant="primary" size="sm" onClick={onSave}>Save</Button></FlexItem>
          <FlexItem><Button variant="link" size="sm" onClick={onCancelEdit}>Cancel</Button></FlexItem>
        </Flex>
      ) : canEdit ? (
        <Dropdown
          isOpen={kebabOpenId === sub.id}
          onOpenChange={(open) => setKebabOpenId(open ? sub.id : null)}
          onSelect={() => setKebabOpenId(null)}
          popperProps={{ position: 'right' }}
          toggle={(ref) => (
            <MenuToggle ref={ref} variant="plain" onClick={() => setKebabOpenId(kebabOpenId === sub.id ? null : sub.id)} isExpanded={kebabOpenId === sub.id} aria-label="Actions">
              <EllipsisVIcon />
            </MenuToggle>
          )}
        >
          <DropdownList>
            <DropdownItem key="edit" onClick={onEdit}>Edit</DropdownItem>
            <DropdownItem key="test" onClick={onTest}>{testingSubId === sub.id ? 'Testing...' : 'Test'}</DropdownItem>
            <DropdownItem key="delete" isDanger onClick={onDelete}>Delete</DropdownItem>
          </DropdownList>
        </Dropdown>
      ) : null}
      {subTestMessages[sub.id] && <Alert variant={subTestMessages[sub.id].type} isInline isPlain title={subTestMessages[sub.id].text} className="app-mt-sm" />}
    </Td>
  </Tr>
);
