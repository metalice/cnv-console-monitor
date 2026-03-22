import { Router, Request, Response, NextFunction } from 'express';
import { fetchCnvReleases } from '../../clients/productpages';
import { config } from '../../config';
import { logger, setResponseError } from '../../logger';
import type { ReleaseInfo, ReleaseMilestone, MilestoneType, ChecklistTask } from '@cnv-monitor/shared';
import { sanitizeJql, createJiraClient } from './releases-helpers';
import { jiraSearch } from '../../clients/jira';
import checklistActionsRouter from './releases-actions';

const log = logger.child({ module: 'Releases' });
const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const ppReleases = await fetchCnvReleases();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const releases: ReleaseInfo[] = ppReleases
      .filter(release => !release.canceled && release.phase_display !== 'Unsupported')
      .map(release => {
        const tasks = (release.all_ga_tasks || []).sort(
          (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
        );

        const pastTasks = tasks.filter(task => new Date(task.date_start) <= today);
        const futureTasks = tasks.filter(task => new Date(task.date_start) > today);
        const lastReleased = pastTasks.length ? pastTasks[pastTasks.length - 1] : null;
        const nextRelease = futureTasks.length ? futureTasks[0] : null;

        const zMatch = lastReleased?.name.match(/(\d+\.\d+\.?\d*)/);
        const currentZStream = zMatch ? zMatch[1] : null;

        const daysUntilNext = nextRelease
          ? Math.round((new Date(nextRelease.date_start).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const daysSinceLastRelease = lastReleased
          ? Math.round((today.getTime() - new Date(lastReleased.date_start).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const classifyMilestone = (name: string, slug: string): MilestoneType => {
          const lower = name.toLowerCase();
          const slugLower = slug.toLowerCase();
          if (lower.includes('feature freeze') || slugLower.includes('feature_freeze')) return 'feature_freeze';
          if (lower.includes('code freeze') || slugLower.includes('code_freeze')) return 'code_freeze';
          if (lower.includes('blockers only') || slugLower.includes('blockers_only')) return 'blockers_only';
          if (/\bga\b/i.test(lower) && !lower.includes('batch')) return 'ga';
          return 'batch';
        };

        const allMilestones: ReleaseMilestone[] = [
          ...tasks.map(task => ({
            name: task.name,
            date: task.date_start,
            isPast: new Date(task.date_start) <= today,
            type: classifyMilestone(task.name, task.slug),
            source: 'pp' as const,
          })),
          ...(release.major_milestones || [])
            .filter(m => !tasks.some(t => t.slug === m.slug))
            .map(m => ({
              name: m.name,
              date: m.date_start,
              isPast: new Date(m.date_start) <= today,
              type: classifyMilestone(m.name, m.slug),
              source: 'pp' as const,
            })),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const allDates = allMilestones.map(m => m.date).filter(Boolean);
        const startDate = release.ga_date || (allDates.length > 0 ? allDates[0] : null);
        const endDate = allDates.length > 0 ? allDates[allDates.length - 1] : null;

        return {
          shortname: release.shortname,
          name: release.name,
          phase: release.phase_display,
          gaDate: release.ga_date,
          currentZStream,
          currentZStreamDate: lastReleased?.date_start ?? null,
          nextRelease: nextRelease ? { name: nextRelease.name, date: nextRelease.date_start } : null,
          daysUntilNext,
          daysSinceLastRelease,
          milestones: allMilestones,
          startDate,
          endDate,
        };
      })
      .sort((a, b) => {
        const aDate = a.gaDate ? new Date(a.gaDate).getTime() : Infinity;
        const bDate = b.gaDate ? new Date(b.gaDate).getTime() : Infinity;
        return bDate - aDate;
      });

    res.json(releases);
  } catch (err) {
    next(err);
  }
});

router.get('/checklist', async (req: Request, res: Response, next: NextFunction) => {
  if (!config.jira.enabled) { res.json([]); return; }

  try {
    const component = req.query.component ? sanitizeJql(req.query.component as string) : undefined;
    const status = (req.query.status as string) || 'open';
    const version = req.query.version ? sanitizeJql(req.query.version as string) : undefined;

    const jqlParts = [
      `project = ${config.jira.projectKey}`,
      `labels = CNV-Release-Checklist`,
      `issuetype = Task`,
    ];
    if (component) jqlParts.push(`component = "${component}"`);
    if (status === 'open') jqlParts.push(`status != Closed`);
    const versionFilter = version ? version : undefined;

    const jql = jqlParts.join(' AND ') + ' ORDER BY updated DESC';
    const client = createJiraClient();
    const searchFields = ['summary', 'status', 'assignee', 'components', 'labels', 'fixVersions', 'priority', 'created', 'updated', 'resolutiondate', 'subtasks'];
    const response = await jiraSearch(client, jql, searchFields, 100, 0);

    const tasks: ChecklistTask[] = (response.data.issues || []).map((issue: Record<string, unknown>) => {
      const f = issue.fields as Record<string, unknown>;
      const subtasks = (f.subtasks || []) as Array<{ fields: { status: { name: string } } }>;
      return {
        key: issue.key as string,
        summary: (f.summary as string) || '',
        status: (f.status as { name: string })?.name || '',
        assignee: (f.assignee as { displayName: string })?.displayName || null,
        components: ((f.components || []) as Array<{ name: string }>).map((c: { name: string }) => c.name),
        labels: (f.labels || []) as string[],
        fixVersions: ((f.fixVersions || []) as Array<{ name: string }>).map((v: { name: string }) => v.name),
        priority: (f.priority as { name: string })?.name || '',
        created: (f.created as string) || '',
        updated: (f.updated as string) || '',
        resolved: (f.resolutiondate as string) || null,
        subtaskCount: subtasks.length,
        subtasksDone: subtasks.filter(subtask => subtask.fields?.status?.name === 'Closed').length,
      };
    });

    const filtered = versionFilter
      ? tasks.filter(t => t.fixVersions.some(fv => fv.toLowerCase().includes(versionFilter.toLowerCase())))
      : tasks;
    res.json(filtered);
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : 'Jira unavailable';
    const statusCode = (err as { response?: { status?: number } })?.response?.status;
    let friendlyMsg = rawMsg;
    if (statusCode === 503) friendlyMsg = 'Jira is currently unavailable';
    else if (statusCode === 410) friendlyMsg = 'Jira search API endpoint is no longer available (410 Gone)';
    else if (statusCode === 401 || statusCode === 403) friendlyMsg = 'Jira authentication failed — check token configuration';
    const errorMsg = `Failed to fetch release checklist: ${friendlyMsg}`;
    setResponseError(res, errorMsg);
    res.status(502).json({ error: errorMsg });
  }
});

router.use('/checklist', checklistActionsRouter);

// Version readiness (pass rates from launches)
router.get('/:version/readiness', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const version = (req.params.version as string).replace('cnv-', '');
    const { AppDataSource } = await import('../../db/data-source');
    const rows = await AppDataSource.query(`
      SELECT
        COUNT(*) as total_launches,
        SUM(total) as total_tests,
        SUM(passed) as passed_tests,
        SUM(failed) as failed_tests,
        SUM(skipped) as skipped_tests
      FROM launches
      WHERE cnv_version LIKE $1
        AND start_time > $2
    `, [`${version}%`, Date.now() - 14 * 24 * 60 * 60 * 1000]);

    const stats = rows[0] || {};
    const totalTests = parseInt(stats.total_tests || '0', 10);
    const passedTests = parseInt(stats.passed_tests || '0', 10);
    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 1000) / 10 : null;

    const trendRows = await AppDataSource.query(`
      SELECT
        DATE(to_timestamp(start_time / 1000)) as day,
        SUM(passed)::int as passed,
        SUM(total)::int as total
      FROM launches
      WHERE cnv_version LIKE $1
        AND start_time > $2
      GROUP BY day
      ORDER BY day DESC
      LIMIT 14
    `, [`${version}%`, Date.now() - 14 * 24 * 60 * 60 * 1000]);

    res.json({
      totalLaunches: parseInt(stats.total_launches || '0', 10),
      totalTests,
      passedTests,
      failedTests: parseInt(stats.failed_tests || '0', 10),
      skippedTests: parseInt(stats.skipped_tests || '0', 10),
      passRate,
      trend: trendRows.reverse().map((r: Record<string, unknown>) => ({
        day: r.day,
        passRate: (r.total as number) > 0 ? Math.round(((r.passed as number) / (r.total as number)) * 1000) / 10 : null,
      })),
    });
  } catch (err) { next(err); }
});

// Blocker wall
router.get('/:version/blockers', async (req: Request, res: Response, next: NextFunction) => {
  if (!config.jira.enabled) { res.json([]); return; }
  try {
    const version = sanitizeJql((req.params.version as string).replace('cnv-', ''));
    const client = createJiraClient();
    const jql = `project = ${config.jira.projectKey} AND type = Bug AND priority in (Blocker, Critical) AND fixVersion ~ "${version}" AND status != Closed ORDER BY priority ASC, created ASC`;
    const response = await jiraSearch(client, jql, ['summary', 'status', 'assignee', 'priority', 'created', 'updated'], 50, 0);
    const blockers = (response.data.issues || []).map((issue: Record<string, unknown>) => {
      const f = issue.fields as Record<string, unknown>;
      const created = new Date(f.created as string);
      const ageDays = Math.round((Date.now() - created.getTime()) / (24 * 60 * 60 * 1000));
      return {
        key: issue.key,
        summary: (f.summary as string) || '',
        status: (f.status as { name: string })?.name || '',
        assignee: (f.assignee as { displayName: string })?.displayName || null,
        priority: (f.priority as { name: string })?.name || '',
        created: f.created,
        ageDays,
      };
    });
    res.json(blockers);
  } catch (err) {
    log.warn({ err }, 'Failed to fetch blockers');
    res.json([]);
  }
});

// Historical velocity
router.get('/velocity', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const ppReleases = await fetchCnvReleases();
    const metrics = ppReleases
      .filter(r => !r.canceled && r.all_ga_tasks.length >= 2)
      .map(r => {
        const sorted = [...r.all_ga_tasks].sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
        const intervals: number[] = [];
        for (let i = 1; i < sorted.length; i++) {
          const days = Math.round((new Date(sorted[i].date_start).getTime() - new Date(sorted[i - 1].date_start).getTime()) / (24 * 60 * 60 * 1000));
          if (days > 0) intervals.push(days);
        }
        const avgInterval = intervals.length > 0 ? Math.round(intervals.reduce((s, d) => s + d, 0) / intervals.length) : null;
        return { version: r.shortname, totalReleases: sorted.length, avgDaysBetweenReleases: avgInterval };
      })
      .filter(m => m.totalReleases > 1)
      .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
    res.json(metrics);
  } catch (err) { next(err); }
});

// Sub-versions for changelog dropdowns
router.get('/:version/sub-versions', async (req: Request, res: Response, next: NextFunction) => {
  if (!config.jira.enabled) { res.json([]); return; }
  try {
    const version = (req.params.version as string).replace('cnv-', '');
    const client = createJiraClient();
    const versionsRes = await client.get(`/project/${config.jira.projectKey}/versions`);
    const allVersions: Array<{ name: string; released: boolean }> = versionsRes.data || [];
    const matching = allVersions
      .filter(v => {
        const name = v.name;
        const pattern = new RegExp(`^CNV\\s+v?${version.replace('.', '\\.')}`, 'i');
        return pattern.test(name);
      })
      .map(v => ({ name: v.name, released: v.released }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    res.json(matching);
  } catch (err) { next(err); }
});

// Changelog job store + DB persistence
type ChangelogLogEntry = { time: number; message: string; type: 'info' | 'success' | 'error' };

type ChangelogJob = {
  status: 'running' | 'done' | 'error';
  progress: string;
  step: string;
  currentBatch: number;
  totalBatches: number;
  totalIssues: number;
  log: ChangelogLogEntry[];
  result?: Record<string, unknown>;
  error?: string;
  startedAt: number;
};

const jobLog = (job: ChangelogJob, message: string, type: ChangelogLogEntry['type'] = 'info') => {
  job.log.push({ time: Date.now(), message, type });
  job.progress = message;
};
const changelogJobs = new Map<string, ChangelogJob>();

const changelogCacheKey = (target: string, from?: string) => `changelog:${target}:${from || 'all'}`;

const saveChangelogToDb = async (target: string, from: string | undefined, result: Record<string, unknown>) => {
  try {
    const { AppDataSource } = await import('../../db/data-source');
    const { AICache } = await import('../../db/entities/AICache');
    const key = changelogCacheKey(target, from);
    await AppDataSource.getRepository(AICache).upsert({
      prompt_hash: key,
      model: 'changelog',
      provider: 'changelog',
      response: JSON.stringify(result),
      tokens_used: 0,
      expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
    }, { conflictPaths: ['prompt_hash'] });
  } catch { /* non-critical */ }
};

const loadChangelogFromDb = async (target: string, from?: string): Promise<Record<string, unknown> | null> => {
  try {
    const { AppDataSource } = await import('../../db/data-source');
    const { AICache } = await import('../../db/entities/AICache');
    const key = changelogCacheKey(target, from);
    const row = await AppDataSource.getRepository(AICache).findOneBy({ prompt_hash: key });
    if (!row || Number(row.expires_at) < Date.now()) return null;
    return JSON.parse(row.response);
  } catch { return null; }
};

router.get('/changelog-status', async (req: Request, res: Response) => {
  const target = req.query.targetVersion as string;
  const from = (req.query.compareFrom as string) || undefined;
  if (!target) { res.json({ status: 'none' }); return; }

  const jobKey = changelogCacheKey(target, from);
  const activeJob = changelogJobs.get(jobKey);
  if (activeJob && activeJob.status === 'running') {
    const elapsed = Math.round((Date.now() - activeJob.startedAt) / 1000);
    res.json({
      status: 'running',
      progress: activeJob.progress,
      step: activeJob.step,
      currentBatch: activeJob.currentBatch,
      totalBatches: activeJob.totalBatches,
      totalIssues: activeJob.totalIssues,
      elapsedSeconds: elapsed,
      log: activeJob.log,
    });
    return;
  }
  if (activeJob && activeJob.status === 'done' && activeJob.result) {
    res.json({ status: 'done', ...activeJob.result });
    return;
  }
  if (activeJob && activeJob.status === 'error') {
    res.json({ status: 'error', error: activeJob.error });
    return;
  }

  const dbResult = await loadChangelogFromDb(target, from);
  if (dbResult) {
    res.json({ status: 'done', ...dbResult });
    return;
  }

  res.json({ status: 'none' });
});

// Changelog generation (version-to-version, background job)
const runChangelogJob = async (jobKey: string, targetVersion: string, compareFrom: string | undefined) => {
  const job = changelogJobs.get(jobKey)!;
  try {
    const { getAIService } = await import('../../ai');
    const ai = getAIService();

    const FULL_FIELDS = [
      'summary', 'issuetype', 'priority', 'components', 'status', 'resolution',
      'fixVersions', 'assignee', 'description', 'comment', 'issuelinks',
      'parent', 'subtasks', 'labels', 'created', 'updated', 'resolutiondate',
    ];

    let issues: Array<Record<string, unknown>> = [];
    const contributors = new Map<string, number>();
    const epicKeys = new Set<string>();

    if (config.jira.enabled) {
      try {
        const client = createJiraClient();
        jobLog(job, `Querying Jira for issues with fixVersion = "${targetVersion}" (full depth: comments, links, subtasks)`);
        const jql = `project = ${config.jira.projectKey} AND fixVersion = "${sanitizeJql(targetVersion)}" ORDER BY priority ASC, updated DESC`;
        let startAt = 0;
        const pageSize = 50;
        while (true) {
          const response = await jiraSearch(client, jql, FULL_FIELDS, pageSize, startAt);
          jobLog(job, `Fetched page ${Math.floor(startAt / pageSize) + 1}: ${response.data.issues?.length ?? 0} issues (${issues.length + (response.data.issues?.length ?? 0)} total)`);
          const batch = (response.data.issues || []).map((issue: Record<string, unknown>) => {
            const f = issue.fields as Record<string, unknown>;
            const assignee = (f.assignee as { displayName: string })?.displayName || null;
            if (assignee) contributors.set(assignee, (contributors.get(assignee) ?? 0) + 1);

            const desc = (f.description as string) || '';
            const prLinks = desc.match(/https?:\/\/github\.com\/[^\s/]+\/[^\s/]+\/pull\/\d+/g) || [];

            const comments = ((f.comment as { comments?: Array<{ body: string; author: { displayName: string }; created: string }> })?.comments ?? [])
              .slice(-5)
              .map(c => ({ author: c.author?.displayName, text: c.body?.substring(0, 500), date: c.created }));

            const buildMentions = comments.map(c => c.text).join(' ').match(/build[:\s#-]*[\w.-]+/gi) || [];

            const links = ((f.issuelinks || []) as Array<Record<string, unknown>>).map(link => {
              const inward = link.inwardIssue as Record<string, unknown> | undefined;
              const outward = link.outwardIssue as Record<string, unknown> | undefined;
              const linkType = (link.type as Record<string, unknown>)?.name as string || '';
              const linked = inward || outward;
              return linked ? {
                type: linkType,
                direction: inward ? 'inward' : 'outward',
                key: (linked as Record<string, unknown>).key,
                summary: ((linked as Record<string, unknown>).fields as Record<string, unknown>)?.summary,
                status: (((linked as Record<string, unknown>).fields as Record<string, unknown>)?.status as Record<string, unknown>)?.name,
              } : null;
            }).filter(Boolean);

            const parent = f.parent as Record<string, unknown> | undefined;
            const parentInfo = parent ? {
              key: parent.key,
              summary: (parent.fields as Record<string, unknown>)?.summary,
              type: ((parent.fields as Record<string, unknown>)?.issuetype as Record<string, unknown>)?.name,
            } : null;

            if (parentInfo && (parentInfo.type as string)?.toLowerCase() === 'epic') epicKeys.add(parentInfo.key as string);

            const subtasks = ((f.subtasks || []) as Array<Record<string, unknown>>).map(st => ({
              key: st.key,
              summary: (st.fields as Record<string, unknown>)?.summary,
              status: ((st.fields as Record<string, unknown>)?.status as Record<string, unknown>)?.name,
            }));

            const issueType = (f.issuetype as { name: string })?.name || '';
            if (issueType.toLowerCase() === 'epic') epicKeys.add(issue.key as string);

            return {
              key: issue.key,
              summary: (f.summary as string) || '',
              description: desc.substring(0, 2000),
              type: issueType,
              priority: (f.priority as { name: string })?.name || '',
              components: ((f.components || []) as Array<{ name: string }>).map(c => c.name).join(', '),
              status: (f.status as { name: string })?.name || '',
              resolution: (f.resolution as { name: string })?.name || null,
              assignee,
              labels: (f.labels || []) as string[],
              prLinks,
              buildMentions,
              comments: comments.length > 0 ? comments : undefined,
              links: links.length > 0 ? links : undefined,
              parent: parentInfo,
              subtasks: subtasks.length > 0 ? subtasks : undefined,
              created: f.created,
              updated: f.updated,
              resolved: f.resolutiondate || null,
            };
          });
          issues.push(...batch);
          if (batch.length < pageSize || issues.length >= response.data.total) break;
          startAt += pageSize;
        }

        if (epicKeys.size > 0) {
          jobLog(job, `Found ${epicKeys.size} epics — fetching child issues to verify completeness...`);
          for (const epicKey of epicKeys) {
            try {
              const epicJql = `"Epic Link" = ${epicKey} ORDER BY issuetype ASC`;
              const epicResponse = await jiraSearch(client, epicJql, ['summary', 'issuetype', 'status', 'resolution'], 200, 0);
              const children = (epicResponse.data.issues || []).map((ch: Record<string, unknown>) => {
                const cf = ch.fields as Record<string, unknown>;
                return { key: ch.key, summary: (cf.summary as string) || '', type: (cf.issuetype as { name: string })?.name, status: (cf.status as { name: string })?.name, resolution: (cf.resolution as { name: string })?.name };
              });
              const epicIssue = issues.find(i => i.key === epicKey);
              if (epicIssue) {
                (epicIssue as Record<string, unknown>).epicChildren = children;
                const done = children.filter((c: Record<string, unknown>) => c.status === 'Closed' || c.status === 'Done').length;
                jobLog(job, `Epic ${epicKey}: ${done}/${children.length} children completed`);
              }
            } catch { /* skip epic on error */ }
          }
        }
      } catch (err) {
        log.warn({ err }, 'Failed to fetch Jira issues for changelog');
        jobLog(job, `Jira fetch error: ${err instanceof Error ? err.message : 'Unknown'}`, 'error');
      }
    }

    job.totalIssues = issues.length;
    job.step = 'preparing';
    const typeCounts = new Map<string, number>();
    issues.forEach(i => typeCounts.set(i.type as string, (typeCounts.get(i.type as string) ?? 0) + 1));
    const typeBreakdown = [...typeCounts.entries()].map(([t, c]) => `${c} ${t}`).join(', ');
    jobLog(job, `Fetched ${issues.length} issues with full context (${typeBreakdown})`, 'success');
    jobLog(job, `${contributors.size} contributors, ${epicKeys.size} epics traversed`);

    const estimatedTokens = JSON.stringify(issues).length / 4;
    jobLog(job, `Estimated ~${Math.round(estimatedTokens / 1000)}K tokens for all issues`);

    let batches: Array<Array<Record<string, unknown>>> = [];
    const MAX_TOKENS_PER_BATCH = 150000;
    if (estimatedTokens <= MAX_TOKENS_PER_BATCH) {
      batches = [issues];
      jobLog(job, 'All issues fit in a single AI call');
    } else {
      const tokensPerIssue = estimatedTokens / issues.length;
      const issuesPerBatch = Math.floor(MAX_TOKENS_PER_BATCH / tokensPerIssue);
      for (let i = 0; i < issues.length; i += issuesPerBatch) {
        batches.push(issues.slice(i, i + issuesPerBatch));
      }
      jobLog(job, `Split into ${batches.length} batches (~${issuesPerBatch} issues each, ~${Math.round(tokensPerIssue * issuesPerBatch / 1000)}K tokens per batch)`);
    }

    const label = compareFrom ? `${compareFrom} -> ${targetVersion}` : targetVersion;
    let mergedCategories: Record<string, Array<Record<string, unknown>>> = {};
    let totalTokens = 0;
    let modelUsed = '';

    job.totalBatches = batches.length;
    jobLog(job, `Split into ${batches.length} batch${batches.length > 1 ? 'es' : ''} for AI analysis`);

    for (let bi = 0; bi < batches.length; bi++) {
      job.currentBatch = bi + 1;
      job.step = 'analyzing';
      jobLog(job, `Sending batch ${bi + 1}/${batches.length} to AI (${batches[bi].length} issues)...`);
      const batch = batches[bi];
      const response = await ai.runPrompt('changelog', {
        fromVersion: compareFrom || 'initial release',
        toVersion: label,
        issues: batch,
        prs: [],
        newlyPassing: 0,
        newlyFailing: 0,
      }, { json: true, cacheTtlMs: 24 * 60 * 60 * 1000, useCache: batches.length === 1 });

      totalTokens += response.tokensUsed;
      modelUsed = response.model;

      let parsed: Record<string, unknown>;
      let content = response.content.trim();
      content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      try { parsed = JSON.parse(content); } catch { parsed = {}; }

      const cats = (parsed.categories || {}) as Record<string, Array<Record<string, unknown>>>;
      const batchCounts = Object.entries(cats).filter(([, v]) => Array.isArray(v) && v.length > 0).map(([k, v]) => `${(v as unknown[]).length} ${k}`).join(', ');
      jobLog(job, `Batch ${bi + 1} complete: ${batchCounts || 'no categories'} (${response.tokensUsed} tokens, ${Math.round(response.durationMs / 1000)}s)`, 'success');
      for (const [cat, items] of Object.entries(cats)) {
        if (!mergedCategories[cat]) mergedCategories[cat] = [];
        if (Array.isArray(items)) mergedCategories[cat].push(...items);
      }

      if (batches.length === 1 && parsed.summary) {
        const contribs = [...contributors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
        job.status = 'done';
        job.result = {
          changelog: parsed,
          meta: { targetVersion, compareFrom: compareFrom || null, label, issueCount: issues.length, analyzedCount: batch.length, batches: 1, model: modelUsed, tokensUsed: totalTokens, durationMs: response.durationMs, cached: response.cached, contributors: contribs.map(([name, count]) => ({ name, count })) },
        };
        const elapsed = Math.round((Date.now() - job.startedAt) / 1000);
        jobLog(job, `Changelog complete! ${issues.length} issues analyzed, ${totalTokens} tokens used, ${elapsed}s total`, 'success');
        saveChangelogToDb(targetVersion, compareFrom, job.result).catch(() => {});
        return;
      }
    }

    job.step = 'summarizing';
    job.currentBatch = batches.length;
    const mergedTotal = Object.values(mergedCategories).reduce((s, items) => s + items.length, 0);
    jobLog(job, `All ${batches.length} batches complete. Merged ${mergedTotal} categorized items.`, 'success');
    jobLog(job, 'Generating executive summary...');
    let finalSummary: Record<string, unknown> = { categories: mergedCategories };
    if (batches.length > 1) {
      const summaryData: Record<string, number> = {};
      for (const [cat, items] of Object.entries(mergedCategories)) summaryData[cat] = items.length;
      try {
        const summaryResponse = await ai.chat([
          { role: 'system', content: 'You are a release notes writer. Given categorized changes, write a brief summary and highlights. Output JSON: { "summary": "...", "highlights": "...", "breakingChanges": [] }' },
          { role: 'user', content: `Release ${label} has these changes: ${JSON.stringify(summaryData)}. Total: ${issues.length} issues. Write a summary.` },
        ], { json: true });
        totalTokens += summaryResponse.tokensUsed;
        let content = summaryResponse.content.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        try {
          const summaryParsed = JSON.parse(content);
          finalSummary = { ...summaryParsed, categories: mergedCategories };
        } catch { /* keep mergedCategories only */ }
      } catch { /* summary generation failed */ }
    }

    const contribs = [...contributors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    job.status = 'done';
    job.result = {
      changelog: finalSummary,
      meta: { targetVersion, compareFrom: compareFrom || null, label, issueCount: issues.length, analyzedCount: issues.length, batches: batches.length, model: modelUsed, tokensUsed: totalTokens, durationMs: Date.now() - job.startedAt, cached: false, contributors: contribs.map(([name, count]) => ({ name, count })) },
    };
    const elapsed = Math.round((Date.now() - job.startedAt) / 1000);
    jobLog(job, `Changelog complete! ${issues.length} issues across ${batches.length} batches, ${totalTokens} tokens, ${elapsed}s total`, 'success');
    saveChangelogToDb(targetVersion, compareFrom, job.result).catch(() => {});
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Changelog generation failed';
    log.error({ err }, msg);
    jobLog(job, `Error: ${msg}`, 'error');
    job.status = 'error';
    job.error = msg;
  }
};

router.post('/:version/changelog', async (req: Request, res: Response) => {
  const { getAIService } = await import('../../ai');
  const ai = getAIService();
  if (!ai.isEnabled()) { res.status(400).json({ error: 'AI is not enabled' }); return; }

  const { targetVersion, compareFrom } = req.body;
  if (!targetVersion) { res.status(400).json({ error: 'targetVersion required' }); return; }

  const jobKey = changelogCacheKey(targetVersion, compareFrom);
  const existing = changelogJobs.get(jobKey);
  if (existing && existing.status === 'running') {
    res.json({ status: 'already_running' });
    return;
  }

  const job: ChangelogJob = { status: 'running', progress: 'Starting...', step: 'fetching', currentBatch: 0, totalBatches: 0, totalIssues: 0, log: [], startedAt: Date.now() };
  jobLog(job, `Starting changelog generation for ${targetVersion}${compareFrom ? ` (comparing from ${compareFrom})` : ''}`);
  changelogJobs.set(jobKey, job);

  runChangelogJob(jobKey, targetVersion, compareFrom).catch(() => {});

  res.json({ status: 'started' });
});

// Manual milestones CRUD
router.get('/milestones', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { AppDataSource } = await import('../../db/data-source');
    const { ReleaseMilestoneEntity } = await import('../../db/entities/ReleaseMilestone');
    const rows = await AppDataSource.getRepository(ReleaseMilestoneEntity).find({ order: { date: 'ASC' } });
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/milestones', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { version, milestone_type, name, date, notes } = req.body;
    if (!version || !milestone_type || !name || !date) {
      res.status(400).json({ error: 'version, milestone_type, name, and date are required' });
      return;
    }
    const { AppDataSource } = await import('../../db/data-source');
    const { ReleaseMilestoneEntity } = await import('../../db/entities/ReleaseMilestone');
    const entity = AppDataSource.getRepository(ReleaseMilestoneEntity).create({
      version, milestone_type, name, date, notes: notes || null,
      created_by: req.user?.name || req.user?.email || null,
    });
    await AppDataSource.getRepository(ReleaseMilestoneEntity).save(entity);
    res.json(entity);
  } catch (err) { next(err); }
});

router.delete('/milestones/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { AppDataSource } = await import('../../db/data-source');
    const { ReleaseMilestoneEntity } = await import('../../db/entities/ReleaseMilestone');
    await AppDataSource.getRepository(ReleaseMilestoneEntity).delete({ id });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
