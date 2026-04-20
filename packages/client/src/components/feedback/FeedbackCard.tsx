import type { Feedback } from '@cnv-monitor/shared';
import { timeAgo } from '@cnv-monitor/shared';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Label,
} from '@patternfly/react-core';
import {
  ArrowUpIcon,
  BugIcon,
  CubesIcon,
  LightbulbIcon,
  OutlinedCommentsIcon,
} from '@patternfly/react-icons';

import { useVoteFeedback } from '../../hooks/useFeedback';

type FeedbackCardProps = {
  item: Feedback;
  onSelect: (id: number) => void;
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  bug: <BugIcon />,
  feature: <LightbulbIcon />,
  general: <OutlinedCommentsIcon />,
  improvement: <CubesIcon />,
};

const CATEGORY_COLORS: Record<string, 'red' | 'blue' | 'green' | 'grey'> = {
  bug: 'red',
  feature: 'blue',
  general: 'grey',
  improvement: 'green',
};

const STATUS_COLORS: Record<string, 'blue' | 'green' | 'orange' | 'grey'> = {
  acknowledged: 'blue',
  closed: 'grey',
  new: 'orange',
  resolved: 'green',
};

export const FeedbackCard = ({ item, onSelect }: FeedbackCardProps) => {
  const voteMutation = useVoteFeedback();

  const handleVote = (e: React.MouseEvent) => {
    e.stopPropagation();
    voteMutation.mutate({ id: item.id, remove: item.userHasVoted });
  };

  return (
    <Card isClickable isSelectable className="app-feedback-card" onClick={() => onSelect(item.id)}>
      <CardHeader>
        <div className="app-feedback-card-header">
          <div className="app-feedback-card-labels">
            <Label
              color={CATEGORY_COLORS[item.category] ?? 'grey'}
              icon={CATEGORY_ICONS[item.category]}
            >
              {item.category}
            </Label>
            <Label color={STATUS_COLORS[item.status] ?? 'grey'}>{item.status}</Label>
            {item.priority && (
              <Label
                color={
                  item.priority === 'critical'
                    ? 'red'
                    : item.priority === 'high'
                      ? 'orange'
                      : 'grey'
                }
              >
                {item.priority}
              </Label>
            )}
          </div>
          <Content className="app-text-muted" component="small">
            #{item.id} &middot; {timeAgo(new Date(item.createdAt).getTime())}
          </Content>
        </div>
      </CardHeader>
      <CardTitle className="app-feedback-card-title">
        {item.description.substring(0, 120)}
        {item.description.length > 120 ? '...' : ''}
      </CardTitle>
      <CardBody>
        <div className="app-feedback-card-footer">
          <Content className="app-text-muted" component="small">
            by {item.submittedBy}
          </Content>
          <div className="app-feedback-card-actions">
            {item.responseCount > 0 && (
              <span className="app-feedback-response-count">
                <OutlinedCommentsIcon /> {item.responseCount}
              </span>
            )}
            <Button
              aria-label={`${item.voteCount} votes`}
              aria-pressed={item.userHasVoted}
              className={item.userHasVoted ? 'app-feedback-voted' : ''}
              icon={<ArrowUpIcon />}
              isDisabled={voteMutation.isPending}
              size="sm"
              variant="plain"
              onClick={handleVote}
            >
              {item.voteCount}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
