/* eslint-disable max-lines */
import fs from 'fs';
import path from 'path';

import { type NextFunction, type Request, type Response, Router } from 'express';

import type {
  ChecklistTask,
  MilestoneType,
  ReleaseInfo,
  ReleaseMilestone,
} from '@cnv-monitor/shared';

import { jiraSearch } from '../../clients/jira';
import { fetchCnvReleases } from '../../clients/productpages';
import { config } from '../../config';
import { logger, setResponseError } from '../../logger';

import checklistActionsRouter from './releases-actions';
import { createJiraClient, sanitizeJql } from './releases-helpers';

const log = logger.child({ module: 'Releases' });
const router = Router();

const repairJson = (text: string): string => {
  let s = text;
  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, '$1');
  // Fix unescaped newlines inside JSON string values
  // eslint-disable-next-line security/detect-unsafe-regex -- bounded input from internal API
  s = s.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, match =>
    match
      .replace(/(?<!\\)\n/g, '\\n')
      .replace(/(?<!\\)\r/g, '\\r')
      .replace(/(?<!\\)\t/g, '\\t'),
  );
  return s;
};

// TODO: Refactor to reduce cognitive complexity
// eslint-disable-next-line sonarjs/cognitive-complexity
const extractJson = (text: string): Record<string, unknown> => {
  const cleaned = text.trim();

  // 1. Try direct parse
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    /* Continue */
  }

  // 2. Strip markdown fences — use greedy match for the LARGEST fenced block
  const fenceMatch = /```(?:json)?[^\S\n]*\n([\s\S]*)\n[^\S\n]*```/i.exec(cleaned);
  if (fenceMatch) {
    const inner = fenceMatch[1].trim();
    try {
      return JSON.parse(inner) as Record<string, unknown>;
    } catch {
      /* Try repair */
    }
    try {
      return JSON.parse(repairJson(inner)) as Record<string, unknown>;
    } catch {
      /* Continue */
    }
  }

  // 3. Strip leading/trailing fences only (avoid `\s*...\s*$` regex — ReDoS-prone per sonarjs/slow-regex)
  let stripped = cleaned.replace(/^```(?:json)?\s*/i, '').trimEnd();
  const fenceIdx = stripped.lastIndexOf('```');
  if (fenceIdx !== -1) {
    const afterFence = stripped.slice(fenceIdx + 3);
    if (afterFence.length === 0 || /^\s+$/.test(afterFence)) {
      stripped = stripped.slice(0, fenceIdx).trimEnd();
    }
  }
  stripped = stripped.trim();
  try {
    return JSON.parse(stripped) as Record<string, unknown>;
  } catch {
    /* Continue */
  }
  try {
    return JSON.parse(repairJson(stripped)) as Record<string, unknown>;
  } catch {
    /* Continue */
  }

  // 4. Find first { and last } — extract the JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch {
      /* Try repair */
    }
    try {
      return JSON.parse(repairJson(candidate)) as Record<string, unknown>;
    } catch {
      /* Continue */
    }
  }

  // 5. Try to salvage truncated JSON by finding the deepest valid parse point
  if (firstBrace !== -1) {
    const candidate = cleaned.substring(firstBrace);
    const repaired = repairJson(candidate);

    // Walk backwards from the end to find a point where closing braces/brackets makes valid JSON
    for (let end = repaired.length; end > firstBrace + 10; end--) {
      if (repaired[end - 1] === '}' || repaired[end - 1] === ']') {
        try {
          return JSON.parse(repaired.substring(0, end)) as Record<string, unknown>;
        } catch {
          /* Continue */
        }
      }
    }

    // Try force-closing truncated JSON: remove trailing partial values, close all open structures
    let truncated = repaired;
    // Remove trailing partial key-value (e.g., `"key": "CNV-74422", "`)
    // eslint-disable-next-line security/detect-unsafe-regex -- bounded input from internal API
    truncated = truncated.replace(/,\s*"[^"]*"\s*:(?:\s*")?[^"{}[\]]*$/, '');
    truncated = truncated.replace(/,\s*"[^"]*"\s*$/, '');
    truncated = truncated.replace(/,\s*\{[^}]*$/, '');
    truncated = truncated.replace(/,\s*$/, '');

    // Count open braces/brackets and close them
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    for (let i = 0; i < truncated.length; i++) {
      const ch = truncated[i];
      if (inString) {
        if (ch === '\\') {
          i++;
          continue;
        }
        if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
      } else if (ch === '{') {
        openBraces++;
      } else if (ch === '}') {
        openBraces--;
      } else if (ch === '[') {
        openBrackets++;
      } else if (ch === ']') {
        openBrackets--;
      }
    }
    // If we're inside an unclosed string, close it
    if (inString) {
      truncated += '"';
    }
    // Close arrays then objects
    for (let i = 0; i < openBrackets; i++) {
      truncated += ']';
    }
    for (let i = 0; i < openBraces; i++) {
      truncated += '}';
    }

    try {
      return JSON.parse(truncated) as Record<string, unknown>;
    } catch {
      /* Continue */
    }
    try {
      return JSON.parse(repairJson(truncated)) as Record<string, unknown>;
    } catch {
      /* Continue */
    }
  }

  // 6. Give up — return raw text for display
  return { raw: cleaned };
};

const classifyMilestone = (name: string, slug: string): MilestoneType => {
  const lower = name.toLowerCase();
  const slugLower = slug.toLowerCase();
  if (lower.includes('feature freeze') || slugLower.includes('feature_freeze')) {
    return 'feature_freeze';
  }
  if (lower.includes('code freeze') || slugLower.includes('code_freeze')) {
    return 'code_freeze';
  }
  if (lower.includes('blockers only') || slugLower.includes('blockers_only')) {
    return 'blockers_only';
  }
  if (/\bga\b/i.test(lower) && !lower.includes('batch')) {
    return 'ga';
  }
  return 'batch';
};

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const ppReleases = await fetchCnvReleases();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const releases: ReleaseInfo[] = ppReleases
      .filter(release => !release.canceled && release.phase_display !== 'Unsupported')
      .map(release => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data from Product Pages API
        const tasks = (release.all_ga_tasks || []).sort(
          (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
        );

        const pastTasks = tasks.filter(task => new Date(task.date_start) <= today);
        const futureTasks = tasks.filter(task => new Date(task.date_start) > today);
        const lastReleased = pastTasks.length ? pastTasks[pastTasks.length - 1] : null;
        const nextRelease = futureTasks.length ? futureTasks[0] : null;

        // eslint-disable-next-line security/detect-unsafe-regex -- bounded input from internal API
        const zMatch = lastReleased?.name.match(/(\d{1,20}\.\d{1,20}(?:\.\d{1,20})?)/);
        const currentZStream = zMatch ? zMatch[1] : null;

        const daysUntilNext = nextRelease
          ? Math.round(
              (new Date(nextRelease.date_start).getTime() - today.getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null;

        const daysSinceLastRelease = lastReleased
          ? Math.round(
              (today.getTime() - new Date(lastReleased.date_start).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null;

        const allMilestones: ReleaseMilestone[] = [
          ...tasks.map(task => ({
            date: task.date_start,
            isPast: new Date(task.date_start) <= today,
            name: task.name,
            source: 'pp' as const,
            type: classifyMilestone(task.name, task.slug),
          })),
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data from Product Pages API
          ...(release.major_milestones || [])
            .filter(m => !tasks.some(t => t.slug === m.slug))
            .map(m => ({
              date: m.date_start,
              isPast: new Date(m.date_start) <= today,
              name: m.name,
              source: 'pp' as const,
              type: classifyMilestone(m.name, m.slug),
            })),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const allDates = allMilestones.map(m => m.date).filter(Boolean);
        const startDate = release.ga_date || (allDates.length > 0 ? allDates[0] : null);
        const endDate = allDates.length > 0 ? allDates[allDates.length - 1] : null;

        return {
          currentZStream,
          currentZStreamDate: lastReleased?.date_start ?? null,
          daysSinceLastRelease,
          daysUntilNext,
          endDate,
          gaDate: release.ga_date,
          milestones: allMilestones,
          name: release.name,
          nextRelease: nextRelease
            ? { date: nextRelease.date_start, name: nextRelease.name }
            : null,
          phase: release.phase_display,
          shortname: release.shortname,
          startDate,
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

router.get('/checklist', async (req: Request, res: Response, _next: NextFunction) => {
  if (!config.jira.enabled) {
    res.json([]);
    return;
  }

  try {
    const component = req.query.component ? sanitizeJql(req.query.component as string) : undefined;
    const status = (req.query.status as string) || 'open';
    const version = req.query.version ? sanitizeJql(req.query.version as string) : undefined;

    const jqlParts = [
      `project = ${config.jira.projectKey}`,
      `labels = CNV-Release-Checklist`,
      `issuetype = Task`,
    ];
    if (component) {
      jqlParts.push(`component = "${component}"`);
    }
    if (status === 'open') {
      jqlParts.push(`status != Closed`);
    }
    const versionFilter = version ? version : undefined;

    const jql = `${jqlParts.join(' AND ')} ORDER BY updated DESC`;
    const client = createJiraClient();
    const searchFields = [
      'summary',
      'status',
      'assignee',
      'components',
      'labels',
      'fixVersions',
      'priority',
      'created',
      'updated',
      'resolutiondate',
      'subtasks',
    ];
    const response = await jiraSearch(client, jql, searchFields, 100, 0);

    /* eslint-disable @typescript-eslint/no-unnecessary-condition -- defensive: runtime data from Jira API */
    const tasks: ChecklistTask[] = (response.data.issues || []).map((issue: unknown) => {
      const i = issue as Record<string, unknown>;
      const f = i.fields as Record<string, unknown>;
      const subtasks = (f.subtasks || []) as { fields: { status: { name: string } } }[];
      return {
        assignee: (f.assignee as { displayName: string })?.displayName || null,
        components: ((f.components || []) as { name: string }[]).map(
          (c: { name: string }) => c.name,
        ),
        created: (f.created as string) || '',
        fixVersions: ((f.fixVersions || []) as { name: string }[]).map(
          (v: { name: string }) => v.name,
        ),
        key: i.key as string,
        labels: (f.labels || []) as string[],
        priority: (f.priority as { name: string })?.name || '',
        resolved: (f.resolutiondate as string) || null,
        status: (f.status as { name: string })?.name || '',
        subtaskCount: subtasks.length,
        subtasksDone: subtasks.filter(subtask => subtask.fields?.status?.name === 'Closed').length,
        summary: (f.summary as string) || '',
        updated: (f.updated as string) || '',
      };
    });
    /* eslint-enable @typescript-eslint/no-unnecessary-condition */

    const filtered = versionFilter
      ? tasks.filter(t =>
          t.fixVersions.some(fv => fv.toLowerCase().includes(versionFilter.toLowerCase())),
        )
      : tasks;
    res.json(filtered);
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : 'Jira unavailable';
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime error shape
    const statusCode = (err as { response?: { status?: number } })?.response?.status;
    let friendlyMsg = rawMsg;
    if (statusCode === 503) {
      friendlyMsg = 'Jira is currently unavailable';
    } else if (statusCode === 410) {
      friendlyMsg = 'Jira search API endpoint is no longer available (410 Gone)';
    } else if (statusCode === 401 || statusCode === 403) {
      friendlyMsg = 'Jira authentication failed — check token configuration';
    }
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
    const rows: Record<string, string>[] = await AppDataSource.query(
      `
      SELECT
        COUNT(*) as total_launches,
        SUM(total) as total_tests,
        SUM(passed) as passed_tests,
        SUM(failed) as failed_tests,
        SUM(skipped) as skipped_tests
      FROM launches
      WHERE cnv_version LIKE $1
        AND start_time > $2
    `,
      [`${version}%`, Date.now() - 14 * 24 * 60 * 60 * 1000],
    );

    const stats = rows[0] || {};
    const totalTests = parseInt(stats.total_tests || '0', 10);
    const passedTests = parseInt(stats.passed_tests || '0', 10);
    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 1000) / 10 : null;

    const trendRows: { day: string; passed: number; total: number }[] = await AppDataSource.query(
      `
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
    `,
      [`${version}%`, Date.now() - 14 * 24 * 60 * 60 * 1000],
    );

    res.json({
      failedTests: parseInt(stats.failed_tests || '0', 10),
      passedTests,
      passRate,
      skippedTests: parseInt(stats.skipped_tests || '0', 10),
      totalLaunches: parseInt(stats.total_launches || '0', 10),
      totalTests,
      trend: [...trendRows].reverse().map(r => ({
        day: r.day,
        passRate: r.total > 0 ? Math.round((r.passed / r.total) * 1000) / 10 : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Blocker wall
router.get('/:version/blockers', async (req: Request, res: Response, _next: NextFunction) => {
  if (!config.jira.enabled) {
    res.json([]);
    return;
  }
  try {
    const version = sanitizeJql((req.params.version as string).replace('cnv-', ''));
    const client = createJiraClient();
    const jql = `project = ${config.jira.projectKey} AND type = Bug AND priority in (Blocker, Critical) AND fixVersion ~ "${version}" AND status != Closed ORDER BY priority ASC, created ASC`;
    const response = await jiraSearch(
      client,
      jql,
      ['summary', 'status', 'assignee', 'priority', 'created', 'updated'],
      50,
      0,
    );
    /* eslint-disable @typescript-eslint/no-unnecessary-condition -- defensive: runtime data from Jira API */
    const blockers = (response.data.issues || []).map((issue: unknown) => {
      const i = issue as Record<string, unknown>;
      const f = i.fields as Record<string, unknown>;
      const created = new Date(f.created as string);
      const ageDays = Math.round((Date.now() - created.getTime()) / (24 * 60 * 60 * 1000));
      return {
        ageDays,
        assignee: (f.assignee as { displayName: string })?.displayName || null,
        created: f.created,
        key: i.key,
        priority: (f.priority as { name: string })?.name || '',
        status: (f.status as { name: string })?.name || '',
        summary: (f.summary as string) || '',
      };
    });
    /* eslint-enable @typescript-eslint/no-unnecessary-condition */
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
        const sorted = [...r.all_ga_tasks].sort(
          (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
        );
        const intervals: number[] = [];
        for (let i = 1; i < sorted.length; i++) {
          const days = Math.round(
            (new Date(sorted[i].date_start).getTime() -
              new Date(sorted[i - 1].date_start).getTime()) /
              (24 * 60 * 60 * 1000),
          );
          if (days > 0) {
            intervals.push(days);
          }
        }
        const avgInterval =
          intervals.length > 0
            ? Math.round(intervals.reduce((s, d) => s + d, 0) / intervals.length)
            : null;
        return {
          avgDaysBetweenReleases: avgInterval,
          totalReleases: sorted.length,
          version: r.shortname,
        };
      })
      .filter(m => m.totalReleases > 1)
      .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

// Sub-versions for changelog dropdowns
router.get('/:version/sub-versions', async (req: Request, res: Response, next: NextFunction) => {
  if (!config.jira.enabled) {
    res.json([]);
    return;
  }
  try {
    const version = (req.params.version as string).replace('cnv-', '');
    const client = createJiraClient();
    const versionsRes = await client.get<{ name: string; released: boolean }[]>(
      `/project/${config.jira.projectKey}/versions`,
    );
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data from Jira API
    const allVersions = versionsRes.data || [];
    const matching = allVersions
      .filter(v => {
        const { name } = v;
        // eslint-disable-next-line security/detect-non-literal-regexp -- pattern from validated config, not user input
        const pattern = new RegExp(`^CNV\\s+v?${version.replace('.', '\\.')}`, 'i');
        return pattern.test(name);
      })
      .map(v => ({ name: v.name, released: v.released }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    res.json(matching);
  } catch (err) {
    next(err);
  }
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
  job.log.push({ message, time: Date.now(), type });
  job.progress = message;
};
const changelogJobs = new Map<string, ChangelogJob>();

const changelogCacheKey = (target: string, from?: string) => `changelog:${target}:${from || 'all'}`;

const saveChangelogToDb = async (
  target: string,
  from: string | undefined,
  result: Record<string, unknown>,
) => {
  try {
    const { AppDataSource } = await import('../../db/data-source');
    const { AICache } = await import('../../db/entities/AICache');
    const key = changelogCacheKey(target, from);
    await AppDataSource.getRepository(AICache).upsert(
      {
        expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
        model: 'changelog',
        prompt_hash: key,
        provider: 'changelog',
        response: JSON.stringify(result),
        tokens_used: 0,
      },
      { conflictPaths: ['prompt_hash'] },
    );
  } catch {
    /* Non-critical */
  }
};

const loadChangelogFromDb = async (
  target: string,
  from?: string,
): Promise<Record<string, unknown> | null> => {
  try {
    const { AppDataSource } = await import('../../db/data-source');
    const { AICache } = await import('../../db/entities/AICache');
    const key = changelogCacheKey(target, from);
    const row = await AppDataSource.getRepository(AICache).findOneBy({ prompt_hash: key });
    if (!row || row.expires_at < Date.now()) {
      return null;
    }
    return JSON.parse(row.response) as Record<string, unknown>;
  } catch {
    return null;
  }
};

router.get('/changelog-status', async (req: Request, res: Response) => {
  const target = req.query.targetVersion as string;
  const from = (req.query.compareFrom as string) || undefined;
  if (!target) {
    res.json({ status: 'none' });
    return;
  }

  const jobKey = changelogCacheKey(target, from);
  const activeJob = changelogJobs.get(jobKey);
  if (activeJob?.status === 'running') {
    const elapsed = Math.round((Date.now() - activeJob.startedAt) / 1000);
    res.json({
      currentBatch: activeJob.currentBatch,
      elapsedSeconds: elapsed,
      log: activeJob.log,
      progress: activeJob.progress,
      status: 'running',
      step: activeJob.step,
      totalBatches: activeJob.totalBatches,
      totalIssues: activeJob.totalIssues,
    });
    return;
  }
  if (activeJob?.status === 'done' && activeJob.result) {
    res.json({ status: 'done', ...activeJob.result });
    return;
  }
  if (activeJob?.status === 'error') {
    res.json({ error: activeJob.error, status: 'error' });
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
const loadComponentGlossary = (): string => {
  try {
    const glossaryPath = path.join(__dirname, '../../ai/prompts/data/component-glossary.json');
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- path constructed from __dirname, not user input
    const data = JSON.parse(fs.readFileSync(glossaryPath, 'utf-8')) as Record<string, string>;
    return Object.entries(data)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');
  } catch {
    return '';
  }
};

const loadCorrections = async (): Promise<string> => {
  try {
    const { AppDataSource } = await import('../../db/data-source');
    const { AICorrection } = await import('../../db/entities/AICorrection');
    const corrections = await AppDataSource.getRepository(AICorrection).find({
      order: { created_at: 'DESC' },
      take: 15,
    });
    if (corrections.length === 0) {
      return '';
    }
    return corrections
      .map(
        c =>
          `- ${c.issue_key}: AI classified as "${c.ai_value}" but correct is "${c.human_value}" (field: ${c.field}) — context: ${c.context || 'N/A'}`,
      )
      .join('\n');
  } catch {
    return '';
  }
};

const applyReviewCorrections = (
  categories: Record<string, Record<string, unknown>[]>,
  review: Record<string, unknown>,
) => {
  /* eslint-disable @typescript-eslint/no-unnecessary-condition -- defensive: runtime data from AI-parsed JSON */
  const corrections = (review.corrections || []) as {
    key: string;
    fromCategory: string;
    toCategory: string;
  }[];
  for (const c of corrections) {
    const fromArr = categories[c.fromCategory];
    if (!fromArr) {
      continue;
    }
    const idx = fromArr.findIndex(item => item.key === c.key);
    if (idx === -1) {
      continue;
    }
    const [item] = fromArr.splice(idx, 1);
    if (!categories[c.toCategory]) {
      categories[c.toCategory] = [];
    }
    categories[c.toCategory].push(item);
  }

  const duplicates = (review.duplicates || []) as { key: string; removeFrom: string }[];
  for (const d of duplicates) {
    const arr = categories[d.removeFrom];
    if (!arr) {
      continue;
    }
    const idx = arr.findIndex(item => item.key === d.key);
    if (idx !== -1) {
      arr.splice(idx, 1);
    }
  }

  const impactAdj = (review.impactAdjustments || []) as { key: string; to: number }[];
  for (const adj of impactAdj) {
    for (const items of Object.values(categories)) {
      const item = items.find(i => i.key === adj.key);
      if (item) {
        item.impactScore = adj.to;
        break;
      }
    }
  }
  /* eslint-enable @typescript-eslint/no-unnecessary-condition */
};

// eslint-disable-next-line max-lines-per-function
const runChangelogJob = async (
  jobKey: string,
  targetVersion: string,
  compareFrom: string | undefined,
  // TODO: Refactor to reduce cognitive complexity
  // eslint-disable-next-line sonarjs/cognitive-complexity
) => {
  const job = changelogJobs.get(jobKey);
  if (!job) return;
  try {
    const { clearTemplateCache } = await import('../../ai/PromptManager');
    clearTemplateCache();

    const { getAIService } = await import('../../ai');
    const ai = getAIService();

    const FULL_FIELDS = [
      'summary',
      'issuetype',
      'priority',
      'components',
      'status',
      'resolution',
      'fixVersions',
      'assignee',
      'description',
      'comment',
      'issuelinks',
      'parent',
      'subtasks',
      'labels',
      'created',
      'updated',
      'resolutiondate',
      'customfield_12316142',
      'customfield_12317313',
    ];

    let issues: Record<string, unknown>[] = [];
    const contributors = new Map<string, number>();
    const epicKeys = new Set<string>();
    const issuesWithSubtasks = new Set<string>();
    const criticalLinkedKeys = new Set<string>();

    if (config.jira.enabled) {
      try {
        const client = createJiraClient();
        jobLog(
          job,
          `Querying Jira for issues with fixVersion = "${targetVersion}" (full depth: comments, links, subtasks)`,
        );
        const jql = `project = ${config.jira.projectKey} AND fixVersion = "${sanitizeJql(targetVersion)}" ORDER BY priority ASC, updated DESC`;
        let startAt = 0;
        const pageSize = 50;
        /* eslint-disable @typescript-eslint/no-unnecessary-condition -- defensive: runtime data from Jira API */
        while (true) {
          // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
          const response = await jiraSearch(client, jql, FULL_FIELDS, pageSize, startAt);
          jobLog(
            job,
            `Fetched page ${Math.floor(startAt / pageSize) + 1}: ${response.data.issues?.length ?? 0} issues (${issues.length + (response.data.issues?.length ?? 0)} total)`,
          );
          const batch = (response.data.issues || []).map((issue: unknown) => {
            const i = issue as Record<string, unknown>;
            const f = i.fields as Record<string, unknown>;
            const assignee = (f.assignee as { displayName: string })?.displayName || null;
            if (assignee) {
              contributors.set(assignee, (contributors.get(assignee) ?? 0) + 1);
            }

            const desc = (f.description as string) || '';
            const prLinks =
              desc.match(/https?:\/\/github\.com\/[^\s/]+\/[^\s/]+\/pull\/\d+/g) ?? [];

            const allComments =
              (
                f.comment as {
                  comments?: {
                    body: string;
                    author: { displayName: string };
                    created: string;
                  }[];
                }
              )?.comments ?? [];
            const comments = allComments.slice(-10).map(c => ({
              author: c.author?.displayName,
              date: c.created,
              text: c.body?.substring(0, 1500),
            }));

            const allCommentText = allComments.map(c => c.body || '').join(' ');
            const buildMentions = allCommentText.match(/build[:\s#-]*[\w.-]+/gi) ?? [];
            const prMentionsInComments =
              allCommentText.match(/https?:\/\/github\.com\/[^\s/]+\/[^\s/]+\/pull\/\d+/g) ?? [];
            const allPrLinks = [...new Set([...prLinks, ...prMentionsInComments])];

            const CRITICAL_LINK_TYPES = [
              'blocks',
              'is blocked by',
              'cloners',
              'is cloned by',
              'duplicate',
              'is duplicated by',
            ];
            const links = ((f.issuelinks || []) as Record<string, unknown>[])
              .map(link => {
                const inward = link.inwardIssue as Record<string, unknown> | undefined;
                const outward = link.outwardIssue as Record<string, unknown> | undefined;
                const linkTypeName = ((link.type as Record<string, unknown>)?.name as string) || '';
                const inwardDesc = ((link.type as Record<string, unknown>)?.inward as string) || '';
                const outwardDesc =
                  ((link.type as Record<string, unknown>)?.outward as string) || '';
                const linked = inward ?? outward;
                if (!linked) {
                  return null;
                }

                const linkedKey = linked.key as string;
                const relationLabel = inward ? inwardDesc : outwardDesc;

                if (
                  CRITICAL_LINK_TYPES.some(t =>
                    relationLabel.toLowerCase().includes(t.toLowerCase()),
                  )
                ) {
                  criticalLinkedKeys.add(linkedKey);
                }

                return {
                  direction: inward ? 'inward' : 'outward',
                  key: linkedKey,
                  relation: relationLabel,
                  status: (
                    (linked.fields as Record<string, unknown>)?.status as Record<string, unknown>
                  )?.name,
                  summary: (linked.fields as Record<string, unknown>)?.summary,
                  type: linkTypeName,
                };
              })
              .filter(Boolean);

            const parent = f.parent as Record<string, unknown> | undefined;
            const parentInfo = parent
              ? {
                  key: parent.key,
                  summary: (parent.fields as Record<string, unknown>)?.summary,
                  type: (
                    (parent.fields as Record<string, unknown>)?.issuetype as Record<string, unknown>
                  )?.name,
                }
              : null;

            if (parentInfo && (parentInfo.type as string)?.toLowerCase() === 'epic') {
              epicKeys.add(parentInfo.key as string);
            }

            const subtasks = ((f.subtasks || []) as Record<string, unknown>[]).map(st => ({
              key: st.key,
              status: ((st.fields as Record<string, unknown>)?.status as Record<string, unknown>)
                ?.name,
              summary: (st.fields as Record<string, unknown>)?.summary,
            }));

            const issueType = (f.issuetype as { name: string })?.name || '';
            if (issueType.toLowerCase() === 'epic') {
              epicKeys.add(i.key as string);
            }
            if (subtasks.length > 0 && issueType.toLowerCase() !== 'epic') {
              issuesWithSubtasks.add(i.key as string);
            }

            const storyPoints = f.customfield_12316142 as number | null;
            const releaseNote = (f.customfield_12317313 as string) || null;

            const linksText =
              links.length > 0
                ? `Links:\n${(links as Record<string, unknown>[])
                    .map(
                      l =>
                        `  ${String(l.relation || l.type)} → ${String(l.key)} "${String(l.summary)}" [${String(l.status)}]`,
                    )
                    .join('\n')}`
                : '';
            const commentsText =
              comments.length > 0
                ? `Comments (last ${comments.length}):\n${comments
                    .map(c => `  [${c.date}] ${c.author}: ${c.text}`)
                    .join('\n')}`
                : '';
            const parentText = parentInfo
              ? `Parent: ${String(parentInfo.key)} [${String(parentInfo.type)}] "${String(parentInfo.summary)}"`
              : '';
            const subtasksText =
              subtasks.length > 0
                ? `Subtasks (${subtasks.length}):\n${subtasks
                    .map(s => `  ${String(s.key)}: "${String(s.summary)}" [${String(s.status)}]`)
                    .join('\n')}`
                : '';

            return {
              _rawLinks: links,
              assignee,
              buildMentions: buildMentions.join(', '),
              comments: commentsText,
              components: ((f.components || []) as { name: string }[]).map(c => c.name).join(', '),
              created: f.created,
              description: desc,
              key: i.key,
              labels: ((f.labels || []) as string[]).join(', '),
              links: linksText,
              parent: parentText,
              priority: (f.priority as { name: string })?.name || '',
              prLinks: allPrLinks.join(', '),
              releaseNote: releaseNote ? `Release Note: ${releaseNote}` : '',
              resolution: (f.resolution as { name: string })?.name || null,
              resolved: f.resolutiondate || null,
              status: (f.status as { name: string })?.name || '',
              storyPoints: storyPoints ? `Story Points: ${storyPoints}` : '',
              subtasks: subtasksText,
              summary: (f.summary as string) || '',
              type: issueType,
              updated: f.updated,
            };
          });
          issues.push(...batch);
          if (batch.length < pageSize || issues.length >= response.data.total) {
            break;
          }
          startAt += pageSize;
        }
        /* eslint-enable @typescript-eslint/no-unnecessary-condition */

        const issueKeysInSet = new Set(issues.map(i => i.key as string));

        if (epicKeys.size > 0) {
          const EPIC_CHILD_FIELDS = [
            'summary',
            'issuetype',
            'status',
            'resolution',
            'subtasks',
            'description',
            'comment',
            'labels',
            'resolutiondate',
            'fixVersions',
          ];
          jobLog(
            job,
            `Found ${epicKeys.size} epics — fetching child issues with full context (comments, PRs, build info)...`,
          );
          for (const epicKey of epicKeys) {
            // eslint-disable-next-line max-depth
            try {
              const epicJql = `"Epic Link" = ${epicKey} ORDER BY issuetype ASC`;
              // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
              const epicResponse = await jiraSearch(client, epicJql, EPIC_CHILD_FIELDS, 200, 0);
              /* eslint-disable @typescript-eslint/no-unnecessary-condition -- defensive: runtime data from Jira API */
              const children = (epicResponse.data.issues || []).map((ch: unknown) => {
                const chRec = ch as Record<string, unknown>;
                const cf = chRec.fields as Record<string, unknown>;

                const childDesc = (cf.description as string) || '';
                const childPrLinks =
                  childDesc.match(/https?:\/\/github\.com\/[^\s/]+\/[^\s/]+\/pull\/\d+/g) ?? [];

                const childAllComments =
                  (
                    cf.comment as {
                      comments?: {
                        body: string;
                        author: { displayName: string };
                        created: string;
                      }[];
                    }
                  )?.comments ?? [];
                const childComments = childAllComments.slice(-5).map(c => ({
                  author: c.author?.displayName,
                  date: c.created,
                  text: c.body?.substring(0, 1000),
                }));
                const childCommentText = childAllComments.map(c => c.body || '').join(' ');
                const childBuildMentions = childCommentText.match(/build[:\s#-]*[\w.-]+/gi) ?? [];
                const childPrFromComments =
                  childCommentText.match(/https?:\/\/github\.com\/[^\s/]+\/[^\s/]+\/pull\/\d+/g) ??
                  [];

                const childSubtasks = ((cf.subtasks || []) as Record<string, unknown>[]).map(
                  st => ({
                    key: st.key,
                    status: (
                      (st.fields as Record<string, unknown>)?.status as Record<string, unknown>
                    )?.name,
                    summary: (st.fields as Record<string, unknown>)?.summary,
                  }),
                );

                const allChildPrs = [...new Set([...childPrLinks, ...childPrFromComments])];
                const childFixVersions = ((cf.fixVersions || []) as { name: string }[]).map(
                  v => v.name,
                );

                const childInfo: Record<string, unknown> = {
                  fixVersions:
                    childFixVersions.length > 0 ? childFixVersions.join(', ') : undefined,
                  key: chRec.key,
                  resolution: (cf.resolution as { name: string })?.name,
                  resolved: cf.resolutiondate || null,
                  status: (cf.status as { name: string })?.name,
                  summary: (cf.summary as string) || '',
                  type: (cf.issuetype as { name: string })?.name,
                };
                if (allChildPrs.length > 0) {
                  childInfo.prLinks = allChildPrs.join(', ');
                }
                if (childBuildMentions.length > 0) {
                  childInfo.buildMentions = childBuildMentions.join(', ');
                }
                if (childComments.length > 0) {
                  childInfo.comments = childComments
                    .map(c => `[${c.date}] ${c.author}: ${c.text}`)
                    .join(' | ');
                }
                if (childSubtasks.length > 0) {
                  childInfo.subtasks = childSubtasks
                    .map(s => `${String(s.key)} [${String(s.status)}]`)
                    .join(', ');
                }
                return childInfo;
              });
              /* eslint-enable @typescript-eslint/no-unnecessary-condition */
              const epicIssue = issues.find(i => i.key === epicKey);
              // eslint-disable-next-line max-depth
              if (epicIssue) {
                const DOC_KEYWORDS = [
                  'doc',
                  'documentation',
                  'release note',
                  'user guide',
                  'tech writer',
                ];
                const QE_KEYWORDS = ['qe', 'test', 'verification', 'automation', 'e2e'];

                const classifyChild = (
                  c: Record<string, unknown>,
                ): 'code' | 'docs' | 'qe' | 'other' => {
                  const summary = ((c.summary as string) || '').toLowerCase();
                  const type = ((c.type as string) || '').toLowerCase();
                  const labels = ((c.labels as string) || '').toLowerCase();
                  const combined = `${summary} ${type} ${labels}`;
                  if (DOC_KEYWORDS.some(k => combined.includes(k))) {
                    return 'docs';
                  }
                  if (QE_KEYWORDS.some(k => combined.includes(k))) {
                    return 'qe';
                  }
                  if (c.prLinks || c.buildMentions) {
                    return 'code';
                  }
                  if (type === 'story' || type === 'task' || type === 'bug') {
                    return 'code';
                  }
                  return 'other';
                };

                const formatChild = (c: Record<string, unknown>) => {
                  // eslint-disable-next-line @typescript-eslint/no-base-to-string
                  let line = `  ${String(c.key)} [${String(c.type)}] "${String(c.summary)}" — ${String(c.status)}${c.resolution ? ` (${String(c.resolution)})` : ''}`;
                  if (c.resolved) {
                    // eslint-disable-next-line @typescript-eslint/no-base-to-string
                    line += ` resolved: ${String(c.resolved)}`;
                  }
                  if (c.fixVersions) {
                    // eslint-disable-next-line @typescript-eslint/no-base-to-string
                    line += ` fixVersions: ${String(c.fixVersions)}`;
                  }
                  if (c.prLinks) {
                    // eslint-disable-next-line @typescript-eslint/no-base-to-string
                    line += `\n    PRs: ${String(c.prLinks)}`;
                  }
                  if (c.buildMentions) {
                    // eslint-disable-next-line @typescript-eslint/no-base-to-string
                    line += `\n    Builds: ${String(c.buildMentions)}`;
                  }
                  if (c.comments) {
                    // eslint-disable-next-line @typescript-eslint/no-base-to-string
                    line += `\n    Comments: ${String(c.comments)}`;
                  }
                  if (c.subtasks) {
                    // eslint-disable-next-line @typescript-eslint/no-base-to-string
                    line += `\n    Subtasks: ${String(c.subtasks)}`;
                  }
                  return line;
                };

                const codeChildren = children.filter(c => classifyChild(c) === 'code');
                const docsChildren = children.filter(c => classifyChild(c) === 'docs');
                const qeChildren = children.filter(c => classifyChild(c) === 'qe');
                const otherChildren = children.filter(c => {
                  const cls = classifyChild(c);
                  return cls === 'other';
                });

                const allBuildMentions = children.flatMap(c =>
                  ((c.buildMentions as string) || '').split(', ').filter(Boolean),
                );
                const allPrLinks = children.flatMap(c =>
                  ((c.prLinks as string) || '').split(', ').filter(Boolean),
                );
                const codeResolvedDates = codeChildren
                  .map(c => c.resolved as string)
                  .filter(Boolean)
                  .toSorted((a, b) => a.localeCompare(b));
                const earliestCodeResolved =
                  codeResolvedDates.length > 0 ? codeResolvedDates[0] : null;
                const codeFixVersions = [
                  ...new Set(
                    codeChildren.flatMap(c =>
                      ((c.fixVersions as string) || '').split(', ').filter(Boolean),
                    ),
                  ),
                ];

                const done = children.filter(
                  c => c.status === 'Closed' || c.status === 'Done',
                ).length;
                const lines: string[] = [];
                lines.push(
                  `Epic Children Summary: ${done}/${children.length} done (${codeChildren.length} code, ${docsChildren.length} docs, ${qeChildren.length} QE)`,
                );

                // eslint-disable-next-line max-depth
                if (allBuildMentions.length > 0 || allPrLinks.length > 0 || earliestCodeResolved) {
                  lines.push(
                    `>>> EARLIEST CODE EVIDENCE (use this for availableIn, NOT docs/QE dates):`,
                  );
                  // eslint-disable-next-line max-depth
                  if (allBuildMentions.length > 0) {
                    lines.push(
                      `  First build mentions: ${allBuildMentions.slice(0, 5).join(', ')}`,
                    );
                  }
                  // eslint-disable-next-line max-depth
                  if (allPrLinks.length > 0) {
                    lines.push(`  Code PRs: ${allPrLinks.slice(0, 5).join(', ')}`);
                  }
                  // eslint-disable-next-line max-depth
                  if (earliestCodeResolved) {
                    lines.push(`  Earliest code child resolved: ${earliestCodeResolved}`);
                  }
                  // eslint-disable-next-line max-depth
                  if (codeFixVersions.length > 0) {
                    lines.push(`  Code fixVersions: ${codeFixVersions.join(', ')}`);
                  }
                }

                // eslint-disable-next-line max-depth
                if (codeChildren.length > 0) {
                  lines.push(
                    `\nCODE/IMPLEMENTATION children (${codeChildren.length}) — USE THESE for version determination:`,
                  );
                  codeChildren.forEach(c => lines.push(formatChild(c)));
                }
                // eslint-disable-next-line max-depth
                if (docsChildren.length > 0) {
                  lines.push(
                    `\nDOCS children (${docsChildren.length}) — DO NOT use for version determination:`,
                  );
                  docsChildren.forEach(c => lines.push(formatChild(c)));
                }
                // eslint-disable-next-line max-depth
                if (qeChildren.length > 0) {
                  lines.push(
                    `\nQE/TEST children (${qeChildren.length}) — DO NOT use for version determination:`,
                  );
                  qeChildren.forEach(c => lines.push(formatChild(c)));
                }
                // eslint-disable-next-line max-depth
                if (otherChildren.length > 0) {
                  lines.push(`\nOther children (${otherChildren.length}):`);
                  otherChildren.forEach(c => lines.push(formatChild(c)));
                }

                epicIssue.epicChildren = lines.join('\n');
                jobLog(
                  job,
                  `Epic ${epicKey}: ${done}/${children.length} (${codeChildren.length} code, ${docsChildren.length} docs, ${qeChildren.length} QE)`,
                  'success',
                );
              }
            } catch {
              /* Skip epic on error */
            }
          }
        }

        if (issuesWithSubtasks.size > 0) {
          const nonEpicSubtaskIssues = [...issuesWithSubtasks].filter(k => !epicKeys.has(k));
          if (nonEpicSubtaskIssues.length > 0) {
            jobLog(
              job,
              `Fetching detailed subtask status for ${nonEpicSubtaskIssues.length} non-epic parent issues...`,
            );
            // eslint-disable-next-line max-depth
            for (const parentKey of nonEpicSubtaskIssues) {
              // eslint-disable-next-line max-depth
              try {
                const stJql = `parent = ${parentKey} ORDER BY issuetype ASC`;
                // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
                const stResponse = await jiraSearch(
                  client,
                  stJql,
                  ['summary', 'issuetype', 'status', 'resolution'],
                  100,
                  0,
                );
                /* eslint-disable @typescript-eslint/no-unnecessary-condition -- defensive: runtime data from Jira API */
                const detailedSubtasks = (stResponse.data.issues || []).map((st: unknown) => {
                  const stRec = st as Record<string, unknown>;
                  const sf = stRec.fields as Record<string, unknown>;
                  return {
                    key: stRec.key,
                    resolution: (sf.resolution as { name: string })?.name,
                    status: (sf.status as { name: string })?.name,
                    summary: (sf.summary as string) || '',
                    type: (sf.issuetype as { name: string })?.name,
                  };
                });
                /* eslint-enable @typescript-eslint/no-unnecessary-condition */
                const parentIssue = issues.find(i => i.key === parentKey);
                // eslint-disable-next-line max-depth
                if (parentIssue && detailedSubtasks.length > 0) {
                  parentIssue.subtasks = detailedSubtasks;
                  const done = detailedSubtasks.filter(
                    (s: Record<string, unknown>) => s.status === 'Closed' || s.status === 'Done',
                  ).length;
                  jobLog(
                    job,
                    `${parentKey}: ${done}/${detailedSubtasks.length} subtasks completed`,
                  );
                }
              } catch {
                /* Skip on error */
              }
            }
          }
        }

        const linkedKeysToFetch = [...criticalLinkedKeys].filter(k => !issueKeysInSet.has(k));
        if (linkedKeysToFetch.length > 0) {
          const fetchCount = Math.min(linkedKeysToFetch.length, 50);
          jobLog(
            job,
            `Fetching ${fetchCount} critical linked issues (blockers, clones, dependencies)...`,
          );
          const linkedBatchSize = 25;
          for (let li = 0; li < fetchCount; li += linkedBatchSize) {
            const batch = linkedKeysToFetch.slice(li, li + linkedBatchSize);
            // eslint-disable-next-line max-depth
            try {
              const linkedJql = `key in (${batch.join(',')})`;
              // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
              const linkedResponse = await jiraSearch(
                client,
                linkedJql,
                ['summary', 'issuetype', 'status', 'resolution', 'fixVersions', 'assignee'],
                batch.length,
                0,
              );
              /* eslint-disable @typescript-eslint/no-unnecessary-condition -- defensive: runtime data from Jira API */
              // eslint-disable-next-line max-depth
              for (const linkedIssue of linkedResponse.data.issues || []) {
                const lf = (linkedIssue as Record<string, unknown>).fields as Record<
                  string,
                  unknown
                >;
                const linkedKey = (linkedIssue as Record<string, unknown>).key as string;
                const linkedInfo = {
                  assignee: (lf.assignee as { displayName: string })?.displayName || null,
                  fixVersions: ((lf.fixVersions || []) as { name: string }[]).map(v => v.name),
                  key: linkedKey,
                  resolution: (lf.resolution as { name: string })?.name || null,
                  status: (lf.status as { name: string })?.name || '',
                  summary: (lf.summary as string) || '',
                  type: (lf.issuetype as { name: string })?.name || '',
                };
                /* eslint-enable @typescript-eslint/no-unnecessary-condition */

                // eslint-disable-next-line max-depth
                for (const issue of issues) {
                  const rawLinks = issue._rawLinks as Record<string, unknown>[] | undefined;
                  // eslint-disable-next-line max-depth
                  if (!rawLinks) {
                    continue;
                  }
                  const match = rawLinks.find(l => l.key === linkedKey);
                  // eslint-disable-next-line max-depth
                  if (match) {
                    match.resolvedStatus = linkedInfo.status;
                    match.resolvedResolution = linkedInfo.resolution;
                    match.resolvedFixVersions = linkedInfo.fixVersions;
                    match.resolvedAssignee = linkedInfo.assignee;
                  }
                }
              }
            } catch {
              /* Skip linked batch on error */
            }
          }
          for (const issue of issues) {
            const rawLinks = issue._rawLinks as Record<string, unknown>[] | undefined;
            // eslint-disable-next-line max-depth
            if (!rawLinks || rawLinks.length === 0) {
              continue;
            }
            issue.links = `Links:\n${rawLinks
              .map(l => {
                let line = `  ${String(l.relation || l.type)} → ${String(l.key)} "${String(l.summary)}" [${String(l.status)}]`;
                if (l.resolvedStatus) {
                  // eslint-disable-next-line @typescript-eslint/no-base-to-string
                  line += ` (resolved: ${String(l.resolvedStatus)}${l.resolvedResolution ? ` / ${String(l.resolvedResolution)}` : ''})`;
                }
                if (l.resolvedFixVersions && (l.resolvedFixVersions as string[]).length > 0) {
                  line += ` versions: ${(l.resolvedFixVersions as string[]).join(', ')}`;
                }
                return line;
              })
              .join('\n')}`;
          }
          jobLog(job, `Enriched ${fetchCount} linked issue statuses`, 'success');
        }

        for (const issue of issues) {
          delete issue._rawLinks;
        }
      } catch (err) {
        log.warn({ err }, 'Failed to fetch Jira issues for changelog');
        jobLog(job, `Jira fetch error: ${err instanceof Error ? err.message : 'Unknown'}`, 'error');
      }
    }

    const beforeDedup = issues.length;
    if (epicKeys.size > 0) {
      const epicChildKeys = new Set<string>();
      for (const issue of issues) {
        if (epicKeys.has(issue.key as string) && issue.epicChildren) {
          const childrenText = issue.epicChildren as string;
          const childKeyMatches = childrenText.match(/\bCNV-\d+\b/g) ?? [];
          childKeyMatches.forEach(k => epicChildKeys.add(k));
        }
      }
      if (epicChildKeys.size > 0) {
        const parentKeys = new Set<string>();
        for (const issue of issues) {
          const parent = issue.parent as string;
          if (parent) {
            const parentKeyMatch = /\b(CNV-\d+)\b/.exec(parent);
            // eslint-disable-next-line max-depth
            if (parentKeyMatch && epicKeys.has(parentKeyMatch[1])) {
              parentKeys.add(issue.key as string);
            }
          }
        }
        issues = issues.filter(i => {
          const key = i.key as string;
          return !(parentKeys.has(key) && epicChildKeys.has(key));
        });
        if (issues.length < beforeDedup) {
          jobLog(
            job,
            `Deduplicated: removed ${beforeDedup - issues.length} child issues already represented in their parent Epics`,
          );
        }
      }
    }

    job.totalIssues = issues.length;
    job.step = 'preparing';
    const typeCounts = new Map<string, number>();
    issues.forEach(i =>
      typeCounts.set(i.type as string, (typeCounts.get(i.type as string) ?? 0) + 1),
    );
    const typeBreakdown = [...typeCounts.entries()].map(([t, c]) => `${c} ${t}`).join(', ');
    jobLog(
      job,
      `Fetched ${issues.length} issues with full context (${typeBreakdown})${beforeDedup > issues.length ? ` (${beforeDedup} before dedup)` : ''}`,
      'success',
    );
    jobLog(
      job,
      `${contributors.size} contributors, ${epicKeys.size} epics, ${issuesWithSubtasks.size} parents with subtasks, ${criticalLinkedKeys.size} critical links traversed`,
    );

    const estimatedTokens = JSON.stringify(issues).length / 4;
    jobLog(job, `Estimated ~${Math.round(estimatedTokens / 1000)}K tokens for all issues`);

    let batches: Record<string, unknown>[][] = [];
    const MAX_ISSUES_PER_BATCH = 10;
    const MAX_TOKENS_PER_BATCH = 50000;

    if (issues.length <= MAX_ISSUES_PER_BATCH && estimatedTokens <= MAX_TOKENS_PER_BATCH) {
      batches = [issues];
      jobLog(job, `All ${issues.length} issues fit in a single AI call`);
    } else {
      const tokensPerIssue = estimatedTokens / issues.length;
      const issuesByTokens = Math.floor(MAX_TOKENS_PER_BATCH / tokensPerIssue);
      const issuesPerBatch = Math.min(Math.max(issuesByTokens, 3), MAX_ISSUES_PER_BATCH);
      for (let i = 0; i < issues.length; i += issuesPerBatch) {
        batches.push(issues.slice(i, i + issuesPerBatch));
      }
      jobLog(
        job,
        `Split into ${batches.length} batches (~${issuesPerBatch} issues each, ~${Math.round((tokensPerIssue * issuesPerBatch) / 1000)}K input tokens per batch)`,
      );
    }

    const label = compareFrom ? `${compareFrom} -> ${targetVersion}` : targetVersion;
    const mergedCategories: Record<string, Record<string, unknown>[]> = {};
    let totalTokens = 0;
    let modelUsed = '';
    let rawFallbackText = '';

    const componentGlossary = loadComponentGlossary();
    const versionNum = targetVersion.replace(/^CNV\s+v?/i, '');
    const isGA = versionNum.endsWith('.0') && !versionNum.toLowerCase().includes('next');
    const isNext = versionNum.toLowerCase().includes('next');
    const isZStream = /\.\d+$/.test(versionNum) && !isGA && !isNext;

    let previousVersionSummary = '';
    let previousVersionHighlights = '';
    let previousVersion = '';
    if (compareFrom) {
      const prevChangelog = await loadChangelogFromDb(compareFrom);
      if (prevChangelog) {
        const prevCl = prevChangelog.changelog as Record<string, unknown> | undefined;
        if (prevCl) {
          previousVersionSummary = (prevCl.summary as string) || '';
          previousVersionHighlights = (prevCl.highlights as string) || '';
          previousVersion = compareFrom;
        }
      }
    }

    const corrections = await loadCorrections();
    if (corrections) {
      jobLog(
        job,
        `Loaded ${corrections.split('\n').length} historical corrections for few-shot learning`,
      );
    }

    job.totalBatches = batches.length;
    const MAX_PARALLEL = 15;
    jobLog(
      job,
      `Split into ${batches.length} batch${batches.length > 1 ? 'es' : ''} for AI analysis${batches.length > 1 ? ` (up to ${Math.min(batches.length, MAX_PARALLEL)} in parallel)` : ''}`,
    );

    const promptVars = {
      componentGlossary: componentGlossary || undefined,
      corrections: corrections || undefined,
      fromVersion: compareFrom || 'initial release',
      isGA: isGA || undefined,
      isNext: isNext || undefined,
      isZStream: isZStream || undefined,
      newlyFailing: 0,
      newlyPassing: 0,
      previousVersion: previousVersion || undefined,
      previousVersionHighlights: previousVersionHighlights || undefined,
      previousVersionSummary: previousVersionSummary || undefined,
      prs: [],
      toVersion: label,
    };

    const normalizeItems = (cats: Record<string, Record<string, unknown>[]>) => {
      for (const items of Object.values(cats)) {
        if (!Array.isArray(items)) {
          continue;
        }
        for (const item of items) {
          if (typeof item.availableIn === 'string') {
            item.availableIn = {
              build: (item.buildInfo as string) || null,
              buildDate: null,
              evidence: (item.availableInReason as string) || `fixVersion is ${item.availableIn}`,
              prMergedDate: null,
              prMergedTo: null,
              version: item.availableIn,
            };
            delete item.availableInReason;
            delete item.buildInfo;
          }
        }
      }
    };

    const processBatch = async (bi: number) => {
      const batch = batches[bi];
      const response = await ai.runPrompt(
        'changelog',
        {
          ...promptVars,
          issues: batch,
        },
        { json: true, maxTokens: 8192, timeout: 300000, useCache: false },
      );

      const rawContent = response.content.trim();
      const parsed = extractJson(rawContent);
      if (parsed.raw) {
        const first300 = rawContent.substring(0, 300).replace(/\n/g, ' ');
        const last200 =
          rawContent.length > 500
            ? rawContent.substring(rawContent.length - 200).replace(/\n/g, ' ')
            : '';
        jobLog(
          job,
          `Warning: Batch ${bi + 1} — could not parse AI JSON (${rawContent.length} chars). Start: "${first300}"${last200 ? ` ... End: "${last200}"` : ''}`,
          'error',
        );
      }

      const cats = (parsed.categories || {}) as Record<string, Record<string, unknown>[]>;
      normalizeItems(cats);
      const batchCounts = Object.entries(cats)
        .filter(([, v]) => Array.isArray(v) && v.length > 0)
        .map(([k, v]) => `${(v as unknown[]).length} ${k}`)
        .join(', ');
      jobLog(
        job,
        `Batch ${bi + 1}/${batches.length} complete: ${batchCounts || 'no categories'} (${response.tokensUsed} tokens, ${Math.round(response.durationMs / 1000)}s)`,
        'success',
      );

      return {
        cached: response.cached,
        cats,
        durationMs: response.durationMs,
        model: response.model,
        parsed,
        raw: parsed.raw ? rawContent : null,
        tokensUsed: response.tokensUsed,
      };
    };

    job.step = 'analyzing';
    if (batches.length === 1) {
      jobLog(job, `Sending single batch to AI (${batches[0].length} issues)...`);
      const result = await processBatch(0);
      totalTokens += result.tokensUsed;
      modelUsed = result.model;
      if (result.raw) {
        rawFallbackText += `${result.raw}\n`;
      }
      /* eslint-disable @typescript-eslint/no-unnecessary-condition -- defensive: runtime data from AI-parsed JSON */
      for (const [cat, items] of Object.entries(result.cats)) {
        if (!mergedCategories[cat]) {
          mergedCategories[cat] = [];
        }
        if (Array.isArray(items)) {
          mergedCategories[cat].push(...items);
        }
      }
      /* eslint-enable @typescript-eslint/no-unnecessary-condition */

      job.currentBatch = 1;
      const { parsed } = result;
      if (parsed.summary && parsed.categories) {
        const singleBatchParsed = parsed;
        // Preserve all top-level fields from AI response (summary, highlights, breakingChanges, epicStatus, concerns, testImpact)

        const reviewTotal1 = Object.values(mergedCategories).reduce(
          (s, items) => s + items.length,
          0,
        );
        if (reviewTotal1 > 5) {
          job.step = 'reviewing';
          jobLog(job, 'Running AI review pass to verify classifications...');
          try {
            const categoryEntries = Object.entries(mergedCategories)
              .filter(([, items]) => items.length > 0)
              .map(([category, items]) => ({
                category,
                count: items.length,
                items: items.slice(0, 50).map(i => ({
                  confidence: i.confidence ?? 'N/A',
                  impactScore: i.impactScore ?? 'N/A',
                  key: i.key || '',
                  risk: i.risk || 'unknown',
                  title: i.title || '',
                })),
              }));
            const reviewResponse = await ai.runPrompt(
              'changelog-review',
              { categoryEntries, version: label },
              { json: true, useCache: false },
            );
            totalTokens += reviewResponse.tokensUsed;
            const rp = extractJson(reviewResponse.content);
            const cc = ((rp.corrections || []) as unknown[]).length;
            const dc = ((rp.duplicates || []) as unknown[]).length;
            const ic = ((rp.impactAdjustments || []) as unknown[]).length;
            // eslint-disable-next-line max-depth
            if (cc > 0 || dc > 0 || ic > 0) {
              applyReviewCorrections(mergedCategories, rp);
              singleBatchParsed.categories = mergedCategories;
              jobLog(
                job,
                `Review pass: ${cc} reclassifications, ${dc} duplicates removed, ${ic} impact adjustments`,
                'success',
              );
            } else {
              jobLog(job, 'Review pass: no corrections needed', 'success');
            }
          } catch (reviewErr) {
            jobLog(
              job,
              `Review pass skipped: ${reviewErr instanceof Error ? reviewErr.message : 'unknown error'}`,
            );
          }
        }

        const contribs = [...contributors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
        job.status = 'done';
        job.result = {
          changelog: singleBatchParsed,
          meta: {
            analyzedCount: batches[0].length,
            batches: 1,
            cached: result.cached,
            compareFrom: compareFrom || null,
            contributors: contribs.map(([name, count]) => ({ count, name })),
            durationMs: result.durationMs,
            issueCount: issues.length,
            label,
            model: modelUsed,
            targetVersion,
            tokensUsed: totalTokens,
          },
        };
        const elapsed = Math.round((Date.now() - job.startedAt) / 1000);
        jobLog(
          job,
          `Changelog complete! ${issues.length} issues analyzed, ${totalTokens} tokens used, ${elapsed}s total`,
          'success',
        );
        saveChangelogToDb(targetVersion, compareFrom, job.result).catch(() => {
          // no-op
        });
        return;
      }
    } else {
      // Multi-batch: run in parallel with concurrency limit
      jobLog(
        job,
        `Launching ${batches.length} batches in parallel (max ${MAX_PARALLEL} concurrent)...`,
      );
      const batchIndices = batches.map((_, i) => i);
      let completedCount = 0;

      const runWithConcurrency = async (indices: number[], limit: number) => {
        const results = new Array<Awaited<ReturnType<typeof processBatch>>>(indices.length);
        let nextIdx = 0;

        const runNext = async (): Promise<void> => {
          while (nextIdx < indices.length) {
            const idx = nextIdx++;
            const bi = indices[idx];
            try {
              // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
              results[idx] = await processBatch(bi);
              completedCount++;
              job.currentBatch = completedCount;
            } catch (batchErr) {
              jobLog(
                job,
                `Batch ${bi + 1} failed: ${batchErr instanceof Error ? batchErr.message : 'unknown'}`,
                'error',
              );
              completedCount++;
              job.currentBatch = completedCount;
            }
          }
        };

        await Promise.all(Array.from({ length: Math.min(limit, indices.length) }, () => runNext()));
        return results;
      };

      const batchResults = await runWithConcurrency(batchIndices, MAX_PARALLEL);

      for (const result of batchResults) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: batch may fail at runtime
        if (!result) {
          continue;
        }
        totalTokens += result.tokensUsed;
        modelUsed = result.model;
        if (result.raw) {
          rawFallbackText += `${result.raw}\n`;
        }
        /* eslint-disable @typescript-eslint/no-unnecessary-condition -- defensive: runtime data from AI-parsed JSON */
        for (const [cat, items] of Object.entries(result.cats)) {
          if (!mergedCategories[cat]) {
            mergedCategories[cat] = [];
          }
          if (Array.isArray(items)) {
            mergedCategories[cat].push(...items);
          }
        }
        /* eslint-enable @typescript-eslint/no-unnecessary-condition */
      }
    }

    job.step = 'summarizing';
    job.currentBatch = batches.length;
    const mergedTotal = Object.values(mergedCategories).reduce((s, items) => s + items.length, 0);
    jobLog(
      job,
      `All ${batches.length} batches complete. Merged ${mergedTotal} categorized items.`,
      'success',
    );
    jobLog(job, 'Generating executive summary...');
    let finalSummary: Record<string, unknown> = { categories: mergedCategories };
    if (mergedTotal === 0 && rawFallbackText) {
      finalSummary.raw = rawFallbackText.trim();
      jobLog(job, 'No structured categories parsed — raw AI output preserved for display', 'error');
    }

    const needsSummary = !finalSummary.summary;
    if (needsSummary && mergedTotal > 0) {
      const summaryData: Record<string, number> = {};
      for (const [cat, items] of Object.entries(mergedCategories)) {
        summaryData[cat] = items.length;
      }
      try {
        const summaryResponse = await ai.chat(
          [
            {
              content:
                'You are a release notes writer. Given categorized changes, write a brief executive summary and highlights. Output JSON: { "summary": "...", "highlights": "...", "breakingChanges": [] }',
              role: 'system',
            },
            {
              content: `Release ${label} has these changes: ${JSON.stringify(summaryData)}. Total: ${issues.length} issues across ${batches.length} batches. Write a concise summary.`,
              role: 'user',
            },
          ],
          { json: true },
        );
        totalTokens += summaryResponse.tokensUsed;
        const summaryParsed = extractJson(summaryResponse.content);
        if (!summaryParsed.raw) {
          finalSummary = { ...summaryParsed, categories: mergedCategories };
        }
      } catch {
        /* Summary generation failed */
      }
    }

    const reviewTotal = Object.values(mergedCategories).reduce((s, items) => s + items.length, 0);
    if (reviewTotal > 5) {
      job.step = 'reviewing';
      jobLog(job, 'Running AI review pass to verify classifications...');
      try {
        const categoryEntries = Object.entries(mergedCategories)
          .filter(([, items]) => items.length > 0)
          .map(([category, items]) => ({
            category,
            count: items.length,
            items: items.slice(0, 50).map(i => ({
              confidence: i.confidence ?? 'N/A',
              impactScore: i.impactScore ?? 'N/A',
              key: i.key || '',
              risk: i.risk || 'unknown',
              title: i.title || '',
            })),
          }));
        const reviewResponse = await ai.runPrompt(
          'changelog-review',
          {
            categoryEntries,
            version: label,
          },
          { json: true, useCache: false },
        );
        totalTokens += reviewResponse.tokensUsed;

        const reviewParsed = extractJson(reviewResponse.content);

        const correctionCount = ((reviewParsed.corrections || []) as unknown[]).length;
        const dupeCount = ((reviewParsed.duplicates || []) as unknown[]).length;
        const impactCount = ((reviewParsed.impactAdjustments || []) as unknown[]).length;

        if (correctionCount > 0 || dupeCount > 0 || impactCount > 0) {
          applyReviewCorrections(mergedCategories, reviewParsed);
          jobLog(
            job,
            `Review pass: ${correctionCount} reclassifications, ${dupeCount} duplicates removed, ${impactCount} impact adjustments`,
            'success',
          );
        } else {
          jobLog(job, 'Review pass: no corrections needed', 'success');
        }
      } catch (reviewErr) {
        jobLog(
          job,
          `Review pass skipped: ${reviewErr instanceof Error ? reviewErr.message : 'unknown error'}`,
        );
      }
    }

    const contribs = [...contributors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    job.status = 'done';
    job.result = {
      changelog: finalSummary,
      meta: {
        analyzedCount: issues.length,
        batches: batches.length,
        cached: false,
        compareFrom: compareFrom || null,
        contributors: contribs.map(([name, count]) => ({ count, name })),
        durationMs: Date.now() - job.startedAt,
        issueCount: issues.length,
        label,
        model: modelUsed,
        targetVersion,
        tokensUsed: totalTokens,
      },
    };
    const elapsed = Math.round((Date.now() - job.startedAt) / 1000);
    jobLog(
      job,
      `Changelog complete! ${issues.length} issues across ${batches.length} batches, ${totalTokens} tokens, ${elapsed}s total`,
      'success',
    );
    saveChangelogToDb(targetVersion, compareFrom, job.result).catch(() => {
      // no-op
    });
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
  if (!ai.isEnabled()) {
    res.status(400).json({ error: 'AI is not enabled' });
    return;
  }

  const { compareFrom, targetVersion } = req.body as {
    targetVersion: string;
    compareFrom?: string;
  };
  if (!targetVersion) {
    res.status(400).json({ error: 'targetVersion required' });
    return;
  }

  const jobKey = changelogCacheKey(targetVersion, compareFrom);
  const existing = changelogJobs.get(jobKey);
  if (existing?.status === 'running') {
    res.json({ status: 'already_running' });
    return;
  }

  try {
    const { AppDataSource } = await import('../../db/data-source');
    const { AICache } = await import('../../db/entities/AICache');
    const cacheKey = changelogCacheKey(targetVersion, compareFrom);
    await AppDataSource.getRepository(AICache).delete({ prompt_hash: cacheKey });
  } catch {
    /* Non-critical */
  }

  const job: ChangelogJob = {
    currentBatch: 0,
    log: [],
    progress: 'Starting...',
    startedAt: Date.now(),
    status: 'running',
    step: 'fetching',
    totalBatches: 0,
    totalIssues: 0,
  };
  jobLog(
    job,
    `Starting changelog generation for ${targetVersion}${compareFrom ? ` (comparing from ${compareFrom})` : ''}`,
  );
  changelogJobs.set(jobKey, job);

  runChangelogJob(jobKey, targetVersion, compareFrom).catch(() => {
    // no-op
  });

  res.json({ status: 'started' });
});

// Manual milestones CRUD
router.get('/milestones', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { AppDataSource } = await import('../../db/data-source');
    const { ReleaseMilestoneEntity } = await import('../../db/entities/ReleaseMilestone');
    const rows = await AppDataSource.getRepository(ReleaseMilestoneEntity).find({
      order: { date: 'ASC' },
    });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/milestones', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, milestone_type, name, notes, version } = req.body as {
      version: string;
      milestone_type: string;
      name: string;
      date: string;
      notes?: string;
    };
    if (!version || !milestone_type || !name || !date) {
      res.status(400).json({ error: 'version, milestone_type, name, and date are required' });
      return;
    }
    const { AppDataSource } = await import('../../db/data-source');
    const { ReleaseMilestoneEntity } = await import('../../db/entities/ReleaseMilestone');
    const entity = AppDataSource.getRepository(ReleaseMilestoneEntity).create({
      created_by: req.user?.name || req.user?.email || null,
      date,
      milestone_type,
      name,
      notes: notes || null,
      version,
    });
    await AppDataSource.getRepository(ReleaseMilestoneEntity).save(entity);
    res.json(entity);
  } catch (err) {
    next(err);
  }
});

router.delete('/milestones/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { AppDataSource } = await import('../../db/data-source');
    const { ReleaseMilestoneEntity } = await import('../../db/entities/ReleaseMilestone');
    await AppDataSource.getRepository(ReleaseMilestoneEntity).delete({ id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// TODO: Refactor to reduce cognitive complexity
// eslint-disable-next-line sonarjs/cognitive-complexity
router.post('/:version/changelog-edit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { corrections } = req.body as {
      corrections: {
        key: string;
        field: string;
        oldValue: string;
        newValue: string;
        context?: string;
      }[];
    };
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data from HTTP request body
    if (!corrections || !Array.isArray(corrections) || corrections.length === 0) {
      res.status(400).json({ error: 'corrections array required' });
      return;
    }

    const version = req.params.version as string;
    const performedBy = req.user?.name || req.user?.email || 'unknown';

    const { AppDataSource } = await import('../../db/data-source');
    const { AICorrection } = await import('../../db/entities/AICorrection');
    const corrRepo = AppDataSource.getRepository(AICorrection);

    for (const c of corrections) {
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      await corrRepo.save(
        corrRepo.create({
          ai_value: c.oldValue,
          context: c.context || null,
          field: c.field,
          human_value: c.newValue,
          issue_key: c.key,
          performed_by: performedBy,
        }),
      );
    }

    const target = (req.query.targetVersion as string) || version;
    const from = (req.query.compareFrom as string) || undefined;
    const cached = await loadChangelogFromDb(target, from);
    if (cached) {
      const result = cached;
      const cl = result.changelog as Record<string, unknown>;
      /* eslint-disable @typescript-eslint/no-unnecessary-condition -- defensive: runtime data from DB cache */
      if (cl?.categories) {
        const cats = cl.categories as Record<string, Record<string, unknown>[]>;
        for (const c of corrections) {
          if (c.field === 'category') {
            // eslint-disable-next-line max-depth
            for (const [catName, items] of Object.entries(cats)) {
              const idx = items.findIndex(item => item.key === c.key);
              // eslint-disable-next-line max-depth
              if (idx !== -1 && catName === c.oldValue) {
                const [item] = items.splice(idx, 1);
                // eslint-disable-next-line max-depth
                if (!cats[c.newValue]) {
                  cats[c.newValue] = [];
                }
                cats[c.newValue].push(item);
                break;
              }
            }
          } else {
            // eslint-disable-next-line max-depth
            for (const items of Object.values(cats)) {
              const item = items.find(i => i.key === c.key);
              // eslint-disable-next-line max-depth
              if (item) {
                // eslint-disable-next-line max-depth
                if (c.field === 'impactScore') {
                  item.impactScore = parseInt(c.newValue, 10);
                } else if (c.field === 'risk') {
                  item.risk = c.newValue;
                }
                break;
              }
            }
          }
        }
        await saveChangelogToDb(target, from, result);
      }
      /* eslint-enable @typescript-eslint/no-unnecessary-condition */
    }

    res.json({ saved: corrections.length, success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/jira-fields', async (_req: Request, res: Response, next: NextFunction) => {
  if (!config.jira.enabled) {
    res.json([]);
    return;
  }
  try {
    const client = createJiraClient();
    type JiraField = { id: string; name: string; custom: boolean; schema?: { type: string } };
    const response = await client.get<JiraField[]>('/field');
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime Jira API data
    const customs = (response.data || [])
      .filter(f => f.custom)
      .map(f => ({
        id: f.id,
        name: f.name,
        type: f.schema?.type,
      }));
    res.json(customs);
  } catch (err) {
    next(err);
  }
});

export default router;
