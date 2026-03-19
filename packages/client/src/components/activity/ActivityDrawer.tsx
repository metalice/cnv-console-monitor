import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  DrawerPanelContent, DrawerHead, DrawerActions, DrawerCloseButton, DrawerPanelBody,
  Button, Content, DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
  Divider, Flex, FlexItem, Label, Tooltip,
} from '@patternfly/react-core';
import { ThumbtackIcon, ExternalLinkAltIcon, ArrowRightIcon } from '@patternfly/react-icons';
import { timeAgo, type ActivityEntry } from '@cnv-monitor/shared';
import { fetchRelatedActivity, pinActivity, unpinActivity } from '../../api/activity';
import { useAuth } from '../../context/AuthContext';

const actionLabel = (action: string): React.ReactNode => {
  switch (action) {
    case 'classify_defect': return <Label color="purple" isCompact>Classified</Label>;
    case 'bulk_classify_defect': return <Label color="purple" isCompact>Bulk Classified</Label>;
    case 'add_comment': return <Label color="blue" isCompact>Comment</Label>;
    case 'create_jira': return <Label color="red" isCompact>Jira Created</Label>;
    case 'link_jira': return <Label color="orange" isCompact>Jira Linked</Label>;
    case 'acknowledge': return <Label color="green" isCompact>Acknowledged</Label>;
    default: return <Label isCompact>{action}</Label>;
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
  const isPinned = !!entry.pinned;

  const { data: related } = useQuery({
    queryKey: ['relatedActivity', entry.test_item_rp_id],
    queryFn: () => fetchRelatedActivity(entry.test_item_rp_id!),
    enabled: !!entry.test_item_rp_id,
  });

  const pinMutation = useMutation({
    mutationFn: () => isPinned ? unpinActivity(entry.id) : pinActivity(entry.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['pinnedActivity'] });
    },
  });

  return (
    <DrawerPanelContent widths={{ default: 'width_33' }}>
      <DrawerHead>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>{actionLabel(entry.action)}</FlexItem>
          <FlexItem>
            <Tooltip content={new Date(entry.performed_at).toLocaleString()}>
              <span className="app-text-xs app-text-muted">{timeAgo(new Date(entry.performed_at).getTime())}</span>
            </Tooltip>
          </FlexItem>
        </Flex>
        <DrawerActions>
          {isAdmin && !isAck && (
            <Button
              variant="plain"
              icon={<ThumbtackIcon />}
              onClick={() => pinMutation.mutate()}
              isLoading={pinMutation.isPending}
              className={isPinned ? 'app-text-brand' : ''}
              aria-label={isPinned ? 'Unpin' : 'Pin'}
            />
          )}
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <DescriptionList isHorizontal isCompact>
          {entry.component && (
            <DescriptionListGroup>
              <DescriptionListTerm>Component</DescriptionListTerm>
              <DescriptionListDescription><Label color="grey" isCompact>{entry.component}</Label></DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {!isAck && entry.test_name && (
            <DescriptionListGroup>
              <DescriptionListTerm>Test</DescriptionListTerm>
              <DescriptionListDescription><span className="app-text-xs">{entry.test_name}</span></DescriptionListDescription>
            </DescriptionListGroup>
          )}
          {entry.old_value && entry.new_value && entry.old_value !== entry.new_value && (
            <DescriptionListGroup>
              <DescriptionListTerm>Change</DescriptionListTerm>
              <DescriptionListDescription>
                <span className="app-diff-badge">
                  <Label color="red" isCompact>{entry.old_value}</Label>
                  <ArrowRightIcon className="app-diff-arrow" />
                  <Label color="green" isCompact>{entry.new_value}</Label>
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
              <Button variant="secondary" icon={<ExternalLinkAltIcon />} size="sm">View in Launch</Button>
            </Link>
          </>
        )}

        {related && related.length > 1 && (
          <>
            <Divider className="app-mt-md app-mb-md" />
            <Content component="h4" className="app-mb-sm">Related Activity ({related.length})</Content>
            <div className="app-text-xs">
              {related.filter(r => r.id !== entry.id).slice(0, 10).map(r => (
                <div key={r.id} className="app-history-row">
                  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>{actionLabel(r.action)}</FlexItem>
                    {r.old_value && r.new_value && r.old_value !== r.new_value && (
                      <FlexItem>
                        <span className="app-diff-badge">
                          <Label color="red" isCompact>{r.old_value}</Label>
                          <ArrowRightIcon className="app-diff-arrow" />
                          <Label color="green" isCompact>{r.new_value}</Label>
                        </span>
                      </FlexItem>
                    )}
                    <FlexItem><span className="app-text-muted">{r.performed_by}</span></FlexItem>
                    <FlexItem>
                      <Tooltip content={new Date(r.performed_at).toLocaleString()}>
                        <span className="app-text-muted">{timeAgo(new Date(r.performed_at).getTime())}</span>
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
