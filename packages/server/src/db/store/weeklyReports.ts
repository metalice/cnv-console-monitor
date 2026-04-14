import { type TaskSummary } from '@cnv-monitor/shared';

import { AppDataSource } from '../data-source';
import { PersonReportEntity } from '../entities/PersonReportEntity';
import { WeeklyReportEntity } from '../entities/WeeklyReportEntity';

const repo = () => AppDataSource.getRepository(WeeklyReportEntity);
const personRepo = () => AppDataSource.getRepository(PersonReportEntity);

export const listWeeklyReports = async (component?: string): Promise<WeeklyReportEntity[]> => {
  const query = repo().createQueryBuilder('report').orderBy('report.week_start', 'DESC');

  if (component) {
    query.where('(report.component = :component OR report.component = :empty)', {
      component,
      empty: '',
    });
  }

  return query.getMany();
};

export const getWeeklyReport = async (weekId: string): Promise<WeeklyReportEntity | null> => {
  return repo().findOne({
    relations: ['person_reports', 'person_reports.member'],
    where: { week_id: weekId },
  });
};

export const getCurrentWeeklyReport = async (
  weekId: string,
  component?: string,
): Promise<WeeklyReportEntity | null> => {
  if (component) {
    const scoped = await repo().findOne({
      relations: ['person_reports', 'person_reports.member'],
      where: { component, week_id: weekId },
    });
    if (scoped) return scoped;
  }

  return repo().findOne({
    relations: ['person_reports', 'person_reports.member'],
    where: { week_id: weekId },
  });
};

export const upsertWeeklyReport = async (data: {
  component?: string;
  managerHighlights?: string | null;
  taskSummary?: TaskSummary | null;
  warnings?: string[];
  weekEnd: string;
  weekId: string;
  weekStart: string;
}): Promise<WeeklyReportEntity> => {
  const existing = await repo().findOneBy({ week_id: data.weekId });

  if (existing) {
    if (data.managerHighlights !== undefined) {
      existing.manager_highlights = data.managerHighlights ?? null;
    }
    if (data.taskSummary !== undefined) {
      existing.task_summary = data.taskSummary as Record<string, unknown> | null;
    }
    if (data.warnings) {
      existing.warnings = data.warnings.join(',');
    }
    return repo().save(existing);
  }

  const report = repo().create({
    component: data.component ?? '',
    manager_highlights: data.managerHighlights ?? null,
    state: 'DRAFT',
    task_summary: (data.taskSummary as Record<string, unknown> | null) ?? null,
    warnings: data.warnings?.join(',') ?? null,
    week_end: new Date(data.weekEnd),
    week_id: data.weekId,
    week_start: new Date(data.weekStart),
  });

  return repo().save(report);
};

export const updateWeeklyReportNotes = async (
  weekId: string,
  managerHighlights?: string | null,
  taskSummary?: TaskSummary | null,
): Promise<void> => {
  const report = await repo().findOneBy({ week_id: weekId });
  if (!report) return;

  if (managerHighlights !== undefined) {
    report.manager_highlights = managerHighlights ?? null;
  }
  if (taskSummary !== undefined) {
    report.task_summary = taskSummary as Record<string, unknown> | null;
  }
  await repo().save(report);
};

export const updateWeeklyReportState = async (weekId: string, state: string): Promise<void> => {
  const report = await repo().findOneBy({ week_id: weekId });
  if (!report) return;

  report.state = state;
  if (state === 'SENT') {
    report.sent_at = new Date();
  }
  await repo().save(report);
};

export const savePersonReport = async (data: {
  aiSummary?: string | null;
  commits: unknown[];
  excluded?: boolean;
  jiraTickets: unknown[];
  managerNotes?: string | null;
  memberId: string;
  prs: unknown[];
  sortOrder?: number;
  stats: Record<string, number>;
  weekId: string;
}): Promise<PersonReportEntity> => {
  const existing = await personRepo().findOne({
    where: { member_id: data.memberId, week_id: data.weekId },
  });

  if (existing) {
    existing.prs = data.prs;
    existing.jira_tickets = data.jiraTickets;
    existing.commits = data.commits;
    existing.stats = data.stats;
    if (data.aiSummary !== undefined) existing.ai_summary = data.aiSummary ?? null;
    if (data.managerNotes !== undefined) existing.manager_notes = data.managerNotes ?? null;
    if (data.excluded !== undefined) existing.excluded = data.excluded;
    if (data.sortOrder !== undefined) existing.sort_order = data.sortOrder;
    return personRepo().save(existing);
  }

  const entity = personRepo().create({
    ai_summary: data.aiSummary ?? null,
    commits: data.commits,
    excluded: data.excluded ?? false,
    jira_tickets: data.jiraTickets,
    manager_notes: data.managerNotes ?? null,
    member_id: data.memberId,
    prs: data.prs,
    sort_order: data.sortOrder ?? 0,
    stats: data.stats,
    week_id: data.weekId,
  });

  return personRepo().save(entity);
};

export const updatePersonReportNotes = async (
  weekId: string,
  memberId: string,
  updates: { excluded?: boolean; managerNotes?: string | null; sortOrder?: number },
): Promise<void> => {
  const entity = await personRepo().findOne({
    where: { member_id: memberId, week_id: weekId },
  });
  if (!entity) return;

  if (updates.managerNotes !== undefined) entity.manager_notes = updates.managerNotes ?? null;
  if (updates.excluded !== undefined) entity.excluded = updates.excluded;
  if (updates.sortOrder !== undefined) entity.sort_order = updates.sortOrder;

  await personRepo().save(entity);
};
