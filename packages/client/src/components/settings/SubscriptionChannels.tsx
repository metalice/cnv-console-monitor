import { useMemo } from 'react';

import type { Subscription } from '@cnv-monitor/shared';

import { Flex, FlexItem, Tooltip } from '@patternfly/react-core';
import { BugIcon, EnvelopeIcon, SlackIcon } from '@patternfly/react-icons';

type SubscriptionChannelsProps = {
  sub: Subscription;
};

const truncateUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  const segments = url.split('/');
  const last = segments[segments.length - 1];
  const MAX_VISIBLE = 18;
  return last.length > MAX_VISIBLE + 2 ? `...${last.slice(-MAX_VISIBLE)}` : `.../${last}`;
};

export const SubscriptionChannels = ({ sub }: SubscriptionChannelsProps) => {
  const channelCount = useMemo(() => {
    let count = 0;
    if (sub.slackWebhook) count++;
    if (sub.jiraWebhook) count++;
    if (sub.emailRecipients.length > 0) count++;
    return count;
  }, [sub.slackWebhook, sub.jiraWebhook, sub.emailRecipients]);

  return (
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
  );
};
