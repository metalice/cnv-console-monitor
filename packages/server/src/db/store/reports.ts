import { type TaskSummary } from '@cnv-monitor/shared';

import { AppDataSource } from '../data-source';
import { PersonReportEntity } from '../entities/PersonReportEntity';
import { ReportEntity } from '../entities/ReportEntity';

const repo = () => AppDataSource.getRepository(ReportEntity);
const personRepo = () => AppDataSource.getRepository(PersonReportEntity);

export const listReports = async (component?: string): Promise<ReportEntity[]> => {
  const query = repo().createQueryBuilder('report').orderBy('report.week_start', 'DESC');

  if (component) {
    query.where('report.component = :component', { component });
  }

  return query.getMany();
};

export const getReport = async (
  weekId: string,
  component?: string,
): Promise<ReportEntity | null> => {
  const where: Record<string, string> = { week_id: weekId };
  if (component) {
    where.component = component;
  }
  return repo().findOne({
    relations: ['person_reports', 'person_reports.member'],
    where,
  });
};

export const getReportById = async (id: string): Promise<ReportEntity | null> =>
  repo().findOne({
    relations: ['person_reports', 'person_reports.member'],
    where: { id },
  });

export const getCurrentReport = async (
  weekId: string,
  component?: string,
): Promise<ReportEntity | null> => {
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

export const upsertReport = async (data: {
  aggregateStats?: Record<string, unknown> | null;
  component?: string;
  generatedBy?: string;
  managerHighlights?: string | null;
  taskSummary?: TaskSummary | null;
  warnings?: string[];
  weekEnd: string;
  weekId: string;
  weekStart: string;
}): Promise<ReportEntity> => {
  const componentVal = data.component ?? '';
  const existing = await repo().findOneBy({ component: componentVal, week_id: data.weekId });

  if (existing) {
    existing.state = 'DRAFT';
    existing.sent_at = null;
    if (data.managerHighlights !== undefined) {
      existing.manager_highlights = data.managerHighlights ?? null;
    }
    if (data.taskSummary !== undefined) {
      existing.task_summary = data.taskSummary as Record<string, unknown> | null;
    }
    if (data.aggregateStats !== undefined) {
      existing.aggregate_stats = data.aggregateStats ?? null;
    }
    if (data.warnings) {
      existing.warnings = data.warnings.join(',');
    }
    if (data.generatedBy) {
      existing.generated_by = data.generatedBy;
    }
    return repo().save(existing);
  }

  const report = repo().create({
    aggregate_stats: data.aggregateStats ?? null,
    component: componentVal,
    generated_by: data.generatedBy ?? null,
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

export const updateReportNotes = async (
  weekId: string,
  component: string,
  managerHighlights?: string | null,
  taskSummary?: TaskSummary | null,
): Promise<void> => {
  const report = await repo().findOneBy({ component, week_id: weekId });
  if (!report) return;

  if (managerHighlights !== undefined) {
    report.manager_highlights = managerHighlights ?? null;
  }
  if (taskSummary !== undefined) {
    report.task_summary = taskSummary as Record<string, unknown> | null;
  }
  await repo().save(report);
};

export const updateReportState = async (
  weekId: string,
  state: string,
  component?: string,
): Promise<void> => {
  const where: Record<string, string> = { week_id: weekId };
  if (component) {
    where.component = component;
  }
  const report = await repo().findOneBy(where);
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
  reportId: string;
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
    existing.report_id = data.reportId;
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
    report_id: data.reportId,
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

export const deleteReport = async (id: string): Promise<boolean> => {
  await personRepo().delete({ report: { id } });
  const result = await repo().delete({ id });
  return (result.affected ?? 0) > 0;
};
