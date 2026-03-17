export type LaunchRecord = {
  rp_id: number;
  uuid: string;
  name: string;
  number: number;
  status: string;
  cnv_version?: string;
  bundle?: string;
  ocp_version?: string;
  tier?: string;
  cluster_name?: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  start_time: number;
  end_time?: number;
  duration?: number;
  artifacts_url?: string;
  component?: string;
  jenkins_team?: string;
  jenkins_metadata?: Record<string, unknown>;
  jenkins_status?: string;
};

export type TestItemRecord = {
  rp_id: number;
  launch_rp_id: number;
  name: string;
  status: string;
  polarion_id?: string;
  defect_type?: string;
  defect_comment?: string;
  ai_prediction?: string;
  ai_confidence?: number;
  error_message?: string;
  jira_key?: string;
  jira_status?: string;
  unique_id?: string;
  start_time?: number;
  end_time?: number;
};

export type AcknowledgmentRecord = {
  date: string;
  reviewer: string;
  notes?: string;
  component?: string;
  acknowledged_at?: string;
};

export type TriageLogRecord = {
  test_item_rp_id: number;
  action: string;
  old_value?: string;
  new_value?: string;
  performed_by?: string;
  component?: string;
};

export type SubscriptionRecord = {
  id: number;
  name: string;
  components: string[];
  slackWebhook: string | null;
  jiraWebhook: string | null;
  emailRecipients: string[];
  schedule: string;
  timezone: string;
  enabled: boolean;
  createdBy: string | null;
};

export type UserRecord = {
  email: string;
  name: string;
  role: string;
  lastLogin: string | null;
  createdAt: string;
};

export type UserPreferencesData = Record<string, unknown>;

export type RunStatus = {
  status: string;
  date: string;
};

export type FailureStreakInfo = {
  consecutiveFailures: number;
  totalRuns: number;
  lastPassDate: string | null;
  lastPassTime: number | null;
  recentStatuses: string[];
  recentRuns: RunStatus[];
};

export type ActivityLogEntry = {
  id: number;
  test_item_rp_id: number | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  performed_by: string | null;
  performed_at: string;
  test_name: string | null;
  component: string | null;
  notes: string | null;
};
