import { Router, Request, Response, NextFunction } from 'express';
import { getTestItemHistory, getTestFailureStreak } from '../../db/store';
import { AppDataSource } from '../../db/data-source';

const router = Router();

router.get('/:uniqueId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uniqueId = req.params.uniqueId as string;

    const [history, streak, identityRows, affectedLaunches, triageHistory] = await Promise.all([
      getTestItemHistory(uniqueId, 30),
      getTestFailureStreak(uniqueId, 15),
      AppDataSource.query(`
        SELECT ti.name, ti.unique_id, ti.polarion_id, l.component
        FROM test_items ti
        JOIN launches l ON ti.launch_rp_id = l.rp_id
        WHERE ti.unique_id = $1
        ORDER BY ti.start_time DESC
        LIMIT 1
      `, [uniqueId]),
      AppDataSource.query(`
        SELECT DISTINCT l.rp_id, l.name, l.cnv_version, l.ocp_version, l.tier,
               l.cluster_name, l.component, l.start_time, l.status
        FROM launches l
        JOIN test_items ti ON ti.launch_rp_id = l.rp_id
        WHERE ti.unique_id = $1 AND ti.status = 'FAILED'
        ORDER BY l.start_time DESC
        LIMIT 20
      `, [uniqueId]),
      AppDataSource.query(`
        SELECT tl.action, tl.old_value, tl.new_value, tl.performed_by, tl.performed_at
        FROM triage_log tl
        JOIN test_items ti ON tl.test_item_rp_id = ti.rp_id
        WHERE ti.unique_id = $1
        ORDER BY tl.performed_at DESC
        LIMIT 20
      `, [uniqueId]),
    ]);

    const jiraRows: Array<{ jira_key: string }> = await AppDataSource.query(`
      SELECT DISTINCT ti.jira_key
      FROM test_items ti
      WHERE ti.unique_id = $1 AND ti.jira_key IS NOT NULL
    `, [uniqueId]);

    const identityRow = identityRows[0] as Record<string, unknown> | undefined;
    const identity = identityRow
      ? {
          name: identityRow.name as string,
          uniqueId,
          polarionId: (identityRow.polarion_id as string) ?? null,
          component: (identityRow.component as string) ?? null,
          jiraKeys: jiraRows.map(r => r.jira_key),
        }
      : { name: '', uniqueId, polarionId: null, component: null, jiraKeys: [] as string[] };

    res.json({
      identity,
      streak,
      history,
      affectedLaunches: (affectedLaunches as Array<Record<string, unknown>>).map(r => ({
        rp_id: Number(r.rp_id),
        name: r.name as string,
        cnv_version: (r.cnv_version as string) ?? null,
        ocp_version: (r.ocp_version as string) ?? null,
        tier: (r.tier as string) ?? null,
        cluster_name: (r.cluster_name as string) ?? null,
        component: (r.component as string) ?? null,
        start_time: Number(r.start_time),
        status: r.status as string,
      })),
      triageHistory,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
