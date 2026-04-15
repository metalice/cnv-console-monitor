import { useMemo } from 'react';

import type { Subscription } from '@cnv-monitor/shared';

import { Flex, FlexItem, Tooltip } from '@patternfly/react-core';
import { BugIcon, ClipboardCheckIcon, EnvelopeIcon, SlackIcon } from '@patternfly/react-icons';

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
  const isTeamReport = sub.type === 'team_report';

  const channelCount = useMemo(() => {
    if (isTeamReport) {
      let count = 0;
      if (sub.teamReportSlackWebhook) count++;
      if (sub.teamReportEmailRecipients.length > 0) count++;
      return count;
    }
    let count = 0;
    if (sub.slackWebhook) count++;
    if (sub.jiraWebhook) count++;
    if (sub.emailRecipients.length > 0) count++;
    return count;
  }, [
    isTeamReport,
    sub.slackWebhook,
    sub.jiraWebhook,
    sub.emailRecipients,
    sub.teamReportSlackWebhook,
    sub.teamReportEmailRecipients,
  ]);

  return (
    <div className="app-sub-channels">
      <Flex spaceItems={{ default: 'spaceItemsMd' }}>
        {!isTeamReport && sub.slackWebhook && (
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
        {!isTeamReport && sub.jiraWebhook && (
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
        {!isTeamReport && sub.emailRecipients.length > 0 && (
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
        {sub.teamReportSlackWebhook && (
          <FlexItem>
            <Tooltip content={`Team Report: ${sub.teamReportSlackWebhook}`}>
              <div className="app-sub-channel-chip app-sub-channel-chip--slack">
                <ClipboardCheckIcon className="app-sub-channel-icon" />
                <span>Team Slack</span>
              </div>
            </Tooltip>
          </FlexItem>
        )}
        {sub.teamReportEmailRecipients.length > 0 && (
          <FlexItem>
            <Tooltip content={`Team Report: ${sub.teamReportEmailRecipients.join(', ')}`}>
              <div className="app-sub-channel-chip app-sub-channel-chip--email">
                <ClipboardCheckIcon className="app-sub-channel-icon" />
                <span>Team Email</span>
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
