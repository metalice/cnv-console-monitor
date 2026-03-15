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

export type MyWorkSuggestion = {
  name: string;
  unique_id: string;
  occurrences: number;
  consecutiveFailures: number;
};

export type MyWorkData = {
  myComponents: string[];
  untriagedInMyComponents: number;
  myRecentActivity: MyWorkActivity[];
  myJiraBugs: MyWorkJiraBug[];
  suggestedWork: MyWorkSuggestion[];
};

export function fetchMyWork(): Promise<MyWorkData> {
  return apiFetch('/my-work');
}
