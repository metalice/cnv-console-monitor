import { useMemo } from 'react';

import type { Subscription } from '@cnv-monitor/shared';

import { Flex, FlexItem, Icon, Label, Tooltip } from '@patternfly/react-core';
import { BellIcon, ClockIcon, UserIcon } from '@patternfly/react-icons';

import { formatScheduleLabel } from '../../utils/cronHelpers';

type SubscriptionCardMetaProps = {
  sub: Subscription;
};

export const SubscriptionCardMeta = ({ sub }: SubscriptionCardMetaProps) => {
  const componentLabel = useMemo(() => {
    if (sub.components.length === 0) return 'All Components';
    if (sub.components.length === 1) return sub.components[0];
    return `${sub.components.length} components`;
  }, [sub.components]);

  const owner = sub.createdBy ? sub.createdBy.split('@')[0] : 'Unknown';

  return (
    <div className="app-sub-card-meta">
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
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
                <FlexItem className="app-text-sm">Reminder {sub.reminderTime || '10:00'}</FlexItem>
              </Flex>
            </FlexItem>
          </>
        )}
      </Flex>
    </div>
  );
};
