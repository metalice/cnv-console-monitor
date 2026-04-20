import { Button, Toolbar, ToolbarContent, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';

import { exportFeedbackCsv } from '../../api/feedback';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

import { FeedbackSelect } from './FeedbackSelect';

type FeedbackFiltersProps = {
  category: string;
  onCategoryChange: (val: string) => void;
  onPriorityChange: (val: string) => void;
  onSortChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  priority: string;
  sort: string;
  status: string;
};

const CATEGORY_OPTIONS = [
  { label: 'All Categories', value: '' },
  { label: 'Bug Report', value: 'bug' },
  { label: 'Feature Request', value: 'feature' },
  { label: 'Improvement', value: 'improvement' },
  { label: 'General', value: 'general' },
];

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'New', value: 'new' },
  { label: 'Acknowledged', value: 'acknowledged' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
];

const PRIORITY_OPTIONS = [
  { label: 'All Priorities', value: '' },
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Most Voted', value: 'votes' },
];

export const FeedbackFilters = ({
  category,
  onCategoryChange,
  onPriorityChange,
  onSortChange,
  onStatusChange,
  priority,
  sort,
  status,
}: FeedbackFiltersProps) => {
  const { isAdmin } = useAuth();
  const { addToast } = useToast();

  return (
    <Toolbar>
      <ToolbarContent>
        <ToolbarItem>
          <FeedbackSelect
            label="Category"
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={onCategoryChange}
          />
        </ToolbarItem>
        <ToolbarItem>
          <FeedbackSelect
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={onStatusChange}
          />
        </ToolbarItem>
        <ToolbarItem>
          <FeedbackSelect
            label="Priority"
            options={PRIORITY_OPTIONS}
            value={priority}
            onChange={onPriorityChange}
          />
        </ToolbarItem>
        <ToolbarItem>
          <FeedbackSelect
            label="Sort"
            options={SORT_OPTIONS}
            value={sort}
            onChange={onSortChange}
          />
        </ToolbarItem>
        {isAdmin && (
          <ToolbarGroup align={{ default: 'alignEnd' }}>
            <ToolbarItem>
              <Button
                icon={<DownloadIcon />}
                variant="secondary"
                onClick={() => {
                  exportFeedbackCsv().catch(() => addToast('danger', 'CSV export failed'));
                }}
              >
                Export CSV
              </Button>
            </ToolbarItem>
          </ToolbarGroup>
        )}
      </ToolbarContent>
    </Toolbar>
  );
};
