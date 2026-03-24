import { apiFetch } from './client';

export type MyWorkActivity = {
  action: string;
  test_name: string | null;
  new_value: string | null;
  performed_at: string;
};

export type MyWorkJiraBug = {
  jira_key: string;
  test_name: string | null;
  created_at: string;
};

type MyWorkSuggestion = {
  name: string;
  unique_id: string;
  occurrences: number;
  consecutiveFailures: number;
};

type MyWorkData = {
  myComponents: string[];
  untriagedInMyComponents: number;
  myRecentActivity: MyWorkActivity[];
  myJiraBugs: MyWorkJiraBug[];
  suggestedWork: MyWorkSuggestion[];
};

export const fetchMyWork = (): Promise<MyWorkData> => apiFetch('/my-work');
