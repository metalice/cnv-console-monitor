import { type ActivityEntry, timeAgo } from '@cnv-monitor/shared';

import { Content, Divider, Flex, FlexItem, Label, Tooltip } from '@patternfly/react-core';
import { ArrowRightIcon } from '@patternfly/react-icons';

import { actionLabel } from './actionLabel';

type RelatedActivityListProps = {
  related: ActivityEntry[];
  currentEntryId: number;
};

export const RelatedActivityList = ({ currentEntryId, related }: RelatedActivityListProps) => {
  if (related.length <= 1) {
    return null;
  }

  return (
    <>
      <Divider className="app-mt-md app-mb-md" />
      <Content className="app-mb-sm" component="h4">
        Related Activity ({related.length})
      </Content>
      <div className="app-text-xs">
        {related
          .filter(relatedEntry => relatedEntry.id !== currentEntryId)
          .slice(0, 10)
          .map(relatedEntry => (
            <div className="app-history-row" key={relatedEntry.id}>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <FlexItem>{actionLabel(relatedEntry.action)}</FlexItem>
                {relatedEntry.old_value &&
                  relatedEntry.new_value &&
                  relatedEntry.old_value !== relatedEntry.new_value && (
                    <FlexItem>
                      <span className="app-diff-badge">
                        <Label isCompact color="red">
                          {relatedEntry.old_value}
                        </Label>
                        <ArrowRightIcon className="app-diff-arrow" />
                        <Label isCompact color="green">
                          {relatedEntry.new_value}
                        </Label>
                      </span>
                    </FlexItem>
                  )}
                <FlexItem>
                  <span className="app-text-muted">{relatedEntry.performed_by}</span>
                </FlexItem>
                <FlexItem>
                  <Tooltip content={new Date(relatedEntry.performed_at).toLocaleString()}>
                    <span className="app-text-muted">
                      {timeAgo(new Date(relatedEntry.performed_at).getTime())}
                    </span>
                  </Tooltip>
                </FlexItem>
              </Flex>
            </div>
          ))}
      </div>
    </>
  );
};
