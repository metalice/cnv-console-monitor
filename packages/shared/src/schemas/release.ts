export type MilestoneType = 'ga' | 'batch' | 'feature_freeze' | 'code_freeze' | 'blockers_only' | 'custom';

export type ReleaseMilestone = {
  name: string;
  date: string;
  isPast: boolean;
  type: MilestoneType;
  source: 'pp' | 'manual';
};

export type ReleaseInfo = {
  shortname: string;
  name: string;
  phase: string;
  gaDate: string | null;
  currentZStream: string | null;
  currentZStreamDate: string | null;
  nextRelease: { name: string; date: string } | null;
  daysUntilNext: number | null;
  daysSinceLastRelease: number | null;
  milestones: ReleaseMilestone[];
  startDate: string | null;
  endDate: string | null;
};

export type ChecklistTask = {
  key: string;
  summary: string;
  status: string;
  assignee: string | null;
  components: string[];
  labels: string[];
  fixVersions: string[];
  priority: string;
  created: string;
  updated: string;
  resolved: string | null;
  subtaskCount: number;
  subtasksDone: number;
};

export type ChecklistTransition = {
  id: string;
  name: string;
};

export type ChecklistDetail = ChecklistTask & {
  description: string | null;
  subtasks: Array<{
    key: string;
    summary: string;
    status: string;
  }>;
  transitions: ChecklistTransition[];
};
