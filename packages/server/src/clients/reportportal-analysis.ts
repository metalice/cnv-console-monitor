import { config } from '../config';
import { createRPClient } from './reportportal-types';
import { withRetry } from '../utils/retry';

export const updateDefectType = async (
  testItemIds: number[],
  defectTypeLocator: string,
  comment?: string,
): Promise<void> => {
  const client = createRPClient();
  const issues = testItemIds.map(id => ({
    testItemId: id,
    issue: {
      issueType: defectTypeLocator,
      comment: comment || '',
      autoAnalyzed: false,
      ignoreAnalyzer: false,
    },
  }));

  await withRetry(() => client.put('/item', { issues }), 'rp.updateDefectType');
}

export const addTestItemComment = async (testItemId: number, comment: string): Promise<void> => {
  const client = createRPClient();
  const item = await withRetry(() => client.get(`/item/${testItemId}`), 'rp.getItem');
  const existingIssue = item.data?.issue || {};

  const existingComment = existingIssue.comment || '';
  const newComment = existingComment
    ? `${existingComment}\n---\n${comment}`
    : comment;

  await withRetry(() => client.put('/item', {
    issues: [{
      testItemId,
      issue: {
        ...existingIssue,
        comment: newComment,
      },
    }],
  }), 'rp.addComment');
}

export const triggerAutoAnalysis = async (launchId: number): Promise<void> => {
  const client = createRPClient();
  await withRetry(() => client.post('/launch/analyze', {
    launchId,
    analyzerMode: 'current_launch',
    analyzerTypeName: 'autoAnalyzer',
    analyzeItemsMode: ['to_investigate'],
  }), 'rp.autoAnalysis');
}

export const triggerPatternAnalysis = async (launchId: number): Promise<void> => {
  const client = createRPClient();
  await withRetry(() => client.post('/launch/analyze', {
    launchId,
    analyzerMode: 'current_launch',
    analyzerTypeName: 'patternAnalyzer',
    analyzeItemsMode: ['to_investigate'],
  }), 'rp.patternAnalysis');
}

export const triggerUniqueErrorAnalysis = async (launchId: number): Promise<void> => {
  const client = createRPClient();
  await withRetry(() => client.post('/launch/cluster', { launchId, removeNumbers: false }), 'rp.uniqueErrorAnalysis');
}

export const extractAttribute = (attrs: Array<{ key?: string; value: string }>, key: string): string | undefined => {
  return attrs.find(attr => attr.key === key)?.value;
}

export const getReportPortalLaunchUrl = (launchId: number): string => {
  return `${config.reportportal.url}/ui/#${config.reportportal.project.toLowerCase()}/launches/all/${launchId}`;
}

export const getReportPortalItemUrl = (launchId: number, itemId: number): string => {
  return `${config.reportportal.url}/ui/#${config.reportportal.project.toLowerCase()}/launches/all/${launchId}/${itemId}/log`;
}
