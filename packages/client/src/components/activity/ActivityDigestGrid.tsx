import { type ActivitySummary } from '../../api/activity';

import { DeltaStat } from './DeltaStat';

type ActivityDigestGridProps = {
  prevSummary?: ActivitySummary;
  showComparison: boolean;
  summary: ActivitySummary;
};

export const ActivityDigestGrid = ({
  prevSummary,
  showComparison,
  summary,
}: ActivityDigestGridProps) => {
  const actionTotal = (key: string) => summary.byAction[key] ?? 0;
  const prevActionTotal = (key: string) => prevSummary?.byAction[key] ?? 0;

  return (
    <div className="app-digest-grid">
      <DeltaStat
        label="Classifications"
        prev={
          showComparison
            ? prevActionTotal('classify_defect') + prevActionTotal('bulk_classify_defect')
            : undefined
        }
        value={actionTotal('classify_defect') + actionTotal('bulk_classify_defect')}
      />
      <DeltaStat
        label="Jira Actions"
        prev={
          showComparison ? prevActionTotal('create_jira') + prevActionTotal('link_jira') : undefined
        }
        value={actionTotal('create_jira') + actionTotal('link_jira')}
      />
      <DeltaStat
        label="Comments"
        prev={showComparison ? prevActionTotal('add_comment') : undefined}
        value={actionTotal('add_comment')}
      />
      <DeltaStat
        label="Acknowledgments"
        prev={showComparison ? prevActionTotal('acknowledge') : undefined}
        value={actionTotal('acknowledge')}
      />
      {summary.byUser[0] && (
        <DeltaStat
          label={`Top: ${summary.byUser[0][0].split('@')[0]}`}
          value={summary.byUser[0][1]}
        />
      )}
    </div>
  );
};
