import { type NextFunction, type Request, type Response, Router } from 'express';

import { AppDataSource } from '../../db/data-source';
import { getTestFailureStreak, getTestItemHistory } from '../../db/store';

const router = Router();

router.get('/:uniqueId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uniqueId = req.params.uniqueId as string;

    const [history, streak, identityRows, affectedLaunches, triageHistory] = await Promise.all([
      getTestItemHistory(uniqueId, 30),
      getTestFailureStreak(uniqueId, 15),
      AppDataSource.query(
        `
        SELECT ti.name, ti.unique_id, ti.polarion_id, l.component
        FROM test_items ti
        JOIN launches l ON ti.launch_rp_id = l.rp_id
        WHERE ti.unique_id = $1
        ORDER BY ti.start_time DESC
        LIMIT 1
      `,
        [uniqueId],
      ),
      AppDataSource.query(
        `
        SELECT DISTINCT l.rp_id, l.name, l.cnv_version, l.ocp_version, l.tier,
               l.cluster_name, l.component, l.start_time, l.status
        FROM launches l
        JOIN test_items ti ON ti.launch_rp_id = l.rp_id
        WHERE ti.unique_id = $1 AND ti.status = 'FAILED'
        ORDER BY l.start_time DESC
        LIMIT 20
      `,
        [uniqueId],
      ),
      AppDataSource.query(
        `
        SELECT tl.action, tl.old_value, tl.new_value, tl.performed_by, tl.performed_at
        FROM triage_log tl
        JOIN test_items ti ON tl.test_item_rp_id = ti.rp_id
        WHERE ti.unique_id = $1
        ORDER BY tl.performed_at DESC
        LIMIT 20
      `,
        [uniqueId],
      ),
    ]);

    const jiraRows: { jira_key: string }[] = await AppDataSource.query(
      `
      SELECT DISTINCT ti.jira_key
      FROM test_items ti
      WHERE ti.unique_id = $1 AND ti.jira_key IS NOT NULL
    `,
      [uniqueId],
    );

    const identityRow = identityRows[0] as Record<string, unknown> | undefined;
    const identity = identityRow
      ? {
          component: (identityRow.component as string) ?? null,
          jiraKeys: jiraRows.map(row => row.jira_key),
          name: identityRow.name as string,
          polarionId: (identityRow.polarion_id as string) ?? null,
          uniqueId,
        }
      : { component: null, jiraKeys: [] as string[], name: '', polarionId: null, uniqueId };

    res.json({
      affectedLaunches: (affectedLaunches as Record<string, unknown>[]).map(row => ({
        cluster_name: (row.cluster_name as string) ?? null,
        cnv_version: (row.cnv_version as string) ?? null,
        component: (row.component as string) ?? null,
        name: row.name as string,
        ocp_version: (row.ocp_version as string) ?? null,
        rp_id: Number(row.rp_id),
        start_time: Number(row.start_time),
        status: row.status as string,
        tier: (row.tier as string) ?? null,
      })),
      history,
      identity,
      streak,
      triageHistory,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
