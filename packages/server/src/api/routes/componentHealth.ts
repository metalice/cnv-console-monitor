import { type NextFunction, type Request, type Response, Router } from 'express';

import { AppDataSource } from '../../db/data-source';
import { getDistinctComponents } from '../../db/store';

const router = Router();

type ComponentHealthSummary = {
  component: string;
  passRate: number;
  totalLaunches: number;
  failedLaunches: number;
  untriagedCount: number;
  flakyCount: number;
  worseningCount: number;
  trend: 'improving' | 'worsening' | 'stable';
};

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const since = req.query.since ? parseInt(req.query.since as string) : undefined;
    const until = req.query.until ? parseInt(req.query.until as string) : undefined;
    const days = parseInt(req.query.days as string) || 30;

    const sinceMs = since ?? Date.now() - days * 24 * 60 * 60 * 1000;
    const untilMs = until ?? Date.now();
    const previousSinceMs = sinceMs - (untilMs - sinceMs);

    const components = await getDistinctComponents();

    const summaries: ComponentHealthSummary[] = await Promise.all(
      components.map(async component => {
        const [launchStats, prevStats, untriagedRows, flakyRows, worseningRows] = await Promise.all(
          [
            AppDataSource.query(
              `SELECT
               COUNT(*)::int as launch_count,
               COUNT(*) FILTER (WHERE l.status = 'PASSED')::int as passed_launches,
               COUNT(*) FILTER (WHERE l.status = 'FAILED')::int as failed_launches,
               COALESCE(ROUND(
                 COUNT(*) FILTER (WHERE l.status = 'PASSED')::numeric /
                 NULLIF(COUNT(*), 0) * 100, 1
               ), 0) as pass_rate
             FROM launches l
             WHERE l.component = $1
               AND l.start_time >= $2
               AND l.start_time <= $3`,
              [component, sinceMs, untilMs],
            ),
            AppDataSource.query(
              `SELECT
               COUNT(*)::int as launch_count,
               COUNT(*) FILTER (WHERE l.status = 'PASSED')::int as passed_launches
             FROM launches l
             WHERE l.component = $1
               AND l.start_time >= $2
               AND l.start_time < $3`,
              [component, previousSinceMs, sinceMs],
            ),
            AppDataSource.query(
              `SELECT COUNT(DISTINCT ti.unique_id)::int as count
             FROM test_items ti
             JOIN launches l ON ti.launch_rp_id = l.rp_id
             WHERE ti.status = 'FAILED'
               AND (ti.defect_type IS NULL OR ti.defect_type LIKE 'ti%')
               AND l.component = $1
               AND l.start_time >= $2
               AND l.start_time <= $3
               AND ti.unique_id IS NOT NULL`,
              [component, sinceMs, untilMs],
            ),
            AppDataSource.query(
              `SELECT COUNT(DISTINCT ti.unique_id)::int as count
             FROM (
               SELECT ti.unique_id,
                      COUNT(DISTINCT ti.status) as status_count
               FROM test_items ti
               JOIN launches l ON ti.launch_rp_id = l.rp_id
               WHERE l.component = $1
                 AND l.start_time >= $2
                 AND l.start_time <= $3
                 AND ti.unique_id IS NOT NULL
               GROUP BY ti.unique_id
               HAVING COUNT(DISTINCT ti.status) > 1
             ) ti`,
              [component, sinceMs, untilMs],
            ),
            AppDataSource.query(
              `WITH test_stats AS (
               SELECT ti.unique_id,
                      COUNT(*) FILTER (WHERE ti.status = 'FAILED') as fail_count,
                      COUNT(*) as total_count
               FROM test_items ti
               JOIN launches l ON ti.launch_rp_id = l.rp_id
               WHERE l.component = $1
                 AND l.start_time >= $2
                 AND l.start_time <= $3
                 AND ti.unique_id IS NOT NULL
               GROUP BY ti.unique_id
               HAVING COUNT(*) FILTER (WHERE ti.status = 'FAILED') > 0
             )
             SELECT COUNT(*) FILTER (WHERE fail_count::float / NULLIF(total_count, 0) > 0.5)::int as count
             FROM test_stats`,
              [component, sinceMs, untilMs],
            ),
          ],
        );

        const row = launchStats[0] ?? {};
        const totalLaunches = Number(row.launch_count ?? 0);
        const failedLaunches = Number(row.failed_launches ?? 0);
        const passRate = Number(row.pass_rate ?? 100);
        const untriagedCount = Number(untriagedRows[0]?.count ?? 0);
        const flakyCount = Number(flakyRows[0]?.count ?? 0);
        const worseningCount = Number(worseningRows[0]?.count ?? 0);

        const prevRow = prevStats[0] ?? {};
        const prevTotal = Number(prevRow.launch_count ?? 0);
        const prevPassed = Number(prevRow.passed_launches ?? 0);
        const prevPassRate = prevTotal > 0 ? (prevPassed / prevTotal) * 100 : 0;

        let trend: 'improving' | 'worsening' | 'stable' = 'stable';
        if (prevTotal > 0 && totalLaunches > 0) {
          const diff = passRate - prevPassRate;
          if (diff > 3) {
            trend = 'improving';
          } else if (diff < -3) {
            trend = 'worsening';
          }
        }

        return {
          component,
          failedLaunches,
          flakyCount,
          passRate,
          totalLaunches,
          trend,
          untriagedCount,
          worseningCount,
        };
      }),
    );

    summaries.sort((a, b) => a.passRate - b.passRate);
    res.json(summaries);
  } catch (err) {
    next(err);
  }
});

export default router;
