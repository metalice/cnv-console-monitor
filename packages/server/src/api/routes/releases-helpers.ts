export { createJiraClient } from '../../clients/jira-auth';

const JIRA_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/;

export const isValidJiraKey = (key: string): boolean =>
  JIRA_KEY_PATTERN.test(key) && key.length <= 30;

export const sanitizeJql = (input: string): string =>
  input.replace(/["\\\n\r{}()[\]]/g, '').substring(0, 100);
