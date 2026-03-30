import { Link } from 'react-router-dom';

import { type ActivityEntry, timeAgo } from '@cnv-monitor/shared';

import {
  Button,
  Divider,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Flex,
  FlexItem,
  Tooltip,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, ThumbtackIcon } from '@patternfly/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchRelatedActivity, pinActivity, unpinActivity } from '../../api/activity';
import { useAuth } from '../../context/AuthContext';

import { actionLabel } from './actionLabel';
import { ActivityDrawerDetails } from './ActivityDrawerDetails';
import { RelatedActivityList } from './RelatedActivityList';

type ActivityDrawerProps = {
  entry: ActivityEntry;
  onClose: () => void;
};

export const ActivityDrawerPanel = ({ entry, onClose }: ActivityDrawerProps) => {
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
        <ActivityDrawerDetails entry={entry} isAck={isAck} />
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
        {related && <RelatedActivityList currentEntryId={entry.id} related={related} />}
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};
