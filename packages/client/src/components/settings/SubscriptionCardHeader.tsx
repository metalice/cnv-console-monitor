import { useState } from 'react';

import type { Subscription } from '@cnv-monitor/shared';

import {
  CardHeader,
  CardTitle,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Icon,
  MenuToggle,
  Switch,
} from '@patternfly/react-core';
import { BanIcon, CheckCircleIcon, EllipsisVIcon } from '@patternfly/react-icons';

type SubscriptionCardHeaderProps = {
  sub: Subscription;
  canEdit: boolean;
  testingSubId: number | string | null;
  onToggle: (checked: boolean) => void;
  onEdit: () => void;
  onTest: () => void;
  onDelete: () => void;
};

export const SubscriptionCardHeader = ({
  canEdit,
  onDelete,
  onEdit,
  onTest,
  onToggle,
  sub,
  testingSubId,
}: SubscriptionCardHeaderProps) => {
  const [kebabOpen, setKebabOpen] = useState(false);

  const editableActions = (
    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
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
            <DropdownItem key="edit" onClick={onEdit}>
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
  );

  const readOnlyActions = (
    <Switch
      isDisabled
      isReversed
      aria-label="Subscription status"
      id={`sub-toggle-${sub.id}`}
      isChecked={sub.enabled}
      // eslint-disable-next-line @typescript-eslint/no-empty-function -- required prop, no-op for read-only
      onChange={() => {}}
    />
  );

  return (
    <CardHeader
      actions={{ actions: canEdit ? editableActions : readOnlyActions, hasNoOffset: true }}
    >
      <CardTitle>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Icon size="sm" status={sub.enabled ? 'success' : 'danger'}>
              {sub.enabled ? <CheckCircleIcon /> : <BanIcon />}
            </Icon>
          </FlexItem>
          <FlexItem className="app-sub-card-name">{sub.name}</FlexItem>
        </Flex>
      </CardTitle>
    </CardHeader>
  );
};
