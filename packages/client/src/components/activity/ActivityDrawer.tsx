import React from 'react';
import { Link } from 'react-router-dom';

import { type ActivityEntry, timeAgo } from '@cnv-monitor/shared';

import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Flex,
  FlexItem,
  Label,
  Tooltip,
} from '@patternfly/react-core';
import { ArrowRightIcon, ExternalLinkAltIcon, ThumbtackIcon } from '@patternfly/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchRelatedActivity, pinActivity, unpinActivity } from '../../api/activity';
import { useAuth } from '../../context/AuthContext';

const actionLabel = (action: string): React.ReactNode => {
  switch (action) {
    case 'classify_defect':
      return (
        <Label isCompact color="purple">
          Classified
        </Label>
      );
    case 'bulk_classify_defect':
      return (
        <Label isCompact color="purple">
          Bulk Classified
        </Label>
      );
    case 'add_comment':
      return (
        <Label isCompact color="blue">
          Comment
        </Label>
      );
    case 'create_jira':
      return (
        <Label isCompact color="red">
          Jira Created
        </Label>
      );
    case 'link_jira':
      return (
        <Label isCompact color="orange">
          Jira Linked
        </Label>
      );
    case 'acknowledge':
      return (
        <Label isCompact color="green">
          Acknowledged
        </Label>
      );
    default:
      return <Label isCompact>{action}</Label>;
  }
};

type ActivityDrawerProps = {
  entry: ActivityEntry;
  onClose: () => void;
};

export const ActivityDrawerPanel: React.FC<ActivityDrawerProps> = ({ entry, onClose }) => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const isAck = entry.action === 'acknowledge';
  const isPinned = Boolean(entry.pinned);

  const { data: related } = useQuery({
    enabled: Boolean(entry.test_item_rp_id),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    queryFn: () => fetchRelatedActivity(entry.test_item_rp_id!),
    queryKey: ['relatedActivity', entry.test_item_rp_id],
  });

  const pinMutation = useMutation({
    mutationFn: () => (isPinned ? unpinActivity(entry.id) : pinActivity(entry.id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
      void queryClient.invalidateQueries({ queryKey: ['pinnedActivity'] });
    },
  });

  return (
    <DrawerPanelContent widths={{ default: 'width_33' }}>
      <DrawerHead>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>{actionLabel(entry.action)}</FlexItem>
          <FlexItem>
            <Tooltip content={new Date(entry.performed_at).toLocaleString()}>
              <span className="app-text-xs app-text-muted">
                {timeAgo(new Date(entry.performed_at).getTime())}
              </span>
            </Tooltip>
          </FlexItem>
        </Flex>
        <DrawerActions>
          {isAdmin && !isAck && (
            <Button
              aria-label={isPinned ? 'Unpin' : 'Pin'}
              className={isPinned ? 'app-text-brand' : ''}
              icon={<ThumbtackIcon />}
              isLoading={pinMutation.isPending}
              variant="plain"
              onClick={() => pinMutation.mutate()}
            />
          )}
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <DescriptionList isCompact isHorizontal>
          {entry.component && (
            <DescriptionListGroup>
              <DescriptionListTerm>Component</DescriptionListTerm>
              <DescriptionListDescription>
                <Label isCompact color="grey">
                  {entry.component}
                </Label>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {!isAck && entry.test_name && (
            <DescriptionListGroup>
              <DescriptionListTerm>Test</DescriptionListTerm>
              <DescriptionListDescription>
                <span className="app-text-xs">{entry.test_name}</span>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {entry.old_value && entry.new_value && entry.old_value !== entry.new_value && (
            <DescriptionListGroup>
              <DescriptionListTerm>Change</DescriptionListTerm>
              <DescriptionListDescription>
                <span className="app-diff-badge">
                  <Label isCompact color="red">
                    {entry.old_value}
                  </Label>
                  <ArrowRightIcon className="app-diff-arrow" />
                  <Label isCompact color="green">
                    {entry.new_value}
                  </Label>
                </span>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {!entry.old_value && entry.new_value && (
            <DescriptionListGroup>
              <DescriptionListTerm>Value</DescriptionListTerm>
              <DescriptionListDescription>{entry.new_value}</DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {entry.performed_by && (
            <DescriptionListGroup>
              <DescriptionListTerm>By</DescriptionListTerm>
              <DescriptionListDescription>{entry.performed_by}</DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {entry.notes && (
            <DescriptionListGroup>
              <DescriptionListTerm>Notes</DescriptionListTerm>
              <DescriptionListDescription>
                <pre className="app-ack-notes">{entry.notes}</pre>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {entry.pin_note && (
            <DescriptionListGroup>
              <DescriptionListTerm>Pin Note</DescriptionListTerm>
              <DescriptionListDescription>{entry.pin_note}</DescriptionListDescription>
            </DescriptionListGroup>
          )}
        </DescriptionList>

        {entry.launch_rp_id && (
          <>
            <Divider className="app-mt-md app-mb-md" />
            <Link to={`/launch/${entry.launch_rp_id}`}>
              <Button icon={<ExternalLinkAltIcon />} size="sm" variant="secondary">
                View in Launch
              </Button>
            </Link>
          </>
        )}

        {related && related.length > 1 && (
          <>
            <Divider className="app-mt-md app-mb-md" />
            <Content className="app-mb-sm" component="h4">
              Related Activity ({related.length})
            </Content>
            <div className="app-text-xs">
              {related
                .filter(relatedEntry => relatedEntry.id !== entry.id)
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
        )}
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};
