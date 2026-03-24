import { config } from '../config';
import { withRetry } from '../utils/retry';

import { createRPClient } from './reportportal-types';

export const updateDefectType = async (
  testItemIds: number[],
  defectTypeLocator: string,
  comment?: string,
): Promise<void> => {
  const client = createRPClient();
  const issues = testItemIds.map(id => ({
    issue: {
      autoAnalyzed: false,
      comment: comment || '',
      ignoreAnalyzer: false,
      issueType: defectTypeLocator,
    },
    testItemId: id,
  }));

  await withRetry(() => client.put('/item', { issues }), 'rp.updateDefectType');
};

export const addTestItemComment = async (testItemId: number, comment: string): Promise<void> => {
  const client = createRPClient();
  const item = await withRetry(() => client.get(`/item/${testItemId}`), 'rp.getItem');
  const existingIssue = item.data?.issue || {};

  const existingComment = existingIssue.comment || '';
  const newComment = existingComment ? `${existingComment}\n---\n${comment}` : comment;

  await withRetry(
    () =>
      client.put('/item', {
        issues: [
          {
            issue: {
              ...existingIssue,
              comment: newComment,
            },
            testItemId,
          },
        ],
      }),
    'rp.addComment',
  );
};

export const triggerAutoAnalysis = async (launchId: number): Promise<void> => {
  const client = createRPClient();
  await withRetry(
    () =>
      client.post('/launch/analyze', {
        analyzeItemsMode: ['to_investigate'],
        analyzerMode: 'current_launch',
        analyzerTypeName: 'autoAnalyzer',
        launchId,
      }),
    'rp.autoAnalysis',
  );
};

export const triggerPatternAnalysis = async (launchId: number): Promise<void> => {
  const client = createRPClient();
  await withRetry(
    () =>
      client.post('/launch/analyze', {
        analyzeItemsMode: ['to_investigate'],
        analyzerMode: 'current_launch',
        analyzerTypeName: 'patternAnalyzer',
        launchId,
      }),
    'rp.patternAnalysis',
  );
};

export const triggerUniqueErrorAnalysis = async (launchId: number): Promise<void> => {
  const client = createRPClient();
  await withRetry(
    () => client.post('/launch/cluster', { launchId, removeNumbers: false }),
    'rp.uniqueErrorAnalysis',
  );
};

export const extractAttribute = (
  attrs: { key?: string; value: string }[],
  key: string,
): string | undefined => attrs.find(attr => attr.key === key)?.value;

export const getReportPortalLaunchUrl = (launchId: number): string =>
  `${config.reportportal.url}/ui/#${config.reportportal.project.toLowerCase()}/launches/all/${launchId}`;

export const getReportPortalItemUrl = (launchId: number, itemId: number): string =>
  `${config.reportportal.url}/ui/#${config.reportportal.project.toLowerCase()}/launches/all/${launchId}/${itemId}/log`;
