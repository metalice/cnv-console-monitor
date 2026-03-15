import { config } from '../config';
import { createRPClient } from './reportportal-types';

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

  await client.put('/item', { issues });
}

export const addTestItemComment = async (testItemId: number, comment: string): Promise<void> => {
  const client = createRPClient();
  const item = await client.get(`/item/${testItemId}`);
  const existingIssue = item.data?.issue || {};

  const existingComment = existingIssue.comment || '';
  const newComment = existingComment
    ? `${existingComment}\n---\n${comment}`
    : comment;

  await client.put('/item', {
    issues: [{
      testItemId,
      issue: {
        ...existingIssue,
        comment: newComment,
      },
    }],
  });
}

export const triggerAutoAnalysis = async (launchId: number): Promise<void> => {
  const client = createRPClient();
  await client.post('/launch/analyze', {
    launchId,
    analyzerMode: 'current_launch',
    analyzerTypeName: 'autoAnalyzer',
    analyzeItemsMode: ['to_investigate'],
  });
}

export const triggerPatternAnalysis = async (launchId: number): Promise<void> => {
  const client = createRPClient();
  await client.post('/launch/analyze', {
    launchId,
    analyzerMode: 'current_launch',
    analyzerTypeName: 'patternAnalyzer',
    analyzeItemsMode: ['to_investigate'],
  });
}

export const triggerUniqueErrorAnalysis = async (launchId: number): Promise<void> => {
  const client = createRPClient();
  await client.post('/launch/cluster', { launchId, removeNumbers: false });
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
