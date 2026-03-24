import { type NextFunction, type Request, type Response, Router } from 'express';

import { AppDataSource } from '../../db/data-source';
import { getTestFailureStreak, getTestItemHistory } from '../../db/store';

const router = Router();

router.get('/:uniqueId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uniqueId = req.params.uniqueId as string;

    type IdentityRow = {
      name: string;
      unique_id: string;
      polarion_id: string | null;
      component: string | null;
    };

    type AffectedLaunchRow = {
      rp_id: number;
      name: string;
      cnv_version: string | null;
      ocp_version: string | null;
      tier: string | null;
      cluster_name: string | null;
      component: string | null;
      start_time: number;
      status: string;
    };

    type TriageHistoryRow = {
      action: string;
      old_value: string | null;
      new_value: string | null;
      performed_by: string;
      performed_at: string;
    };

    const identityQuery: Promise<IdentityRow[]> = AppDataSource.query(
      `
        SELECT ti.name, ti.unique_id, ti.polarion_id, l.component
        FROM test_items ti
        JOIN launches l ON ti.launch_rp_id = l.rp_id
        WHERE ti.unique_id = $1
        ORDER BY ti.start_time DESC
        LIMIT 1
      `,
      [uniqueId],
    );
    const affectedQuery: Promise<AffectedLaunchRow[]> = AppDataSource.query(
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
    );
    const triageQuery: Promise<TriageHistoryRow[]> = AppDataSource.query(
      `
        SELECT tl.action, tl.old_value, tl.new_value, tl.performed_by, tl.performed_at
        FROM triage_log tl
        JOIN test_items ti ON tl.test_item_rp_id = ti.rp_id
        WHERE ti.unique_id = $1
        ORDER BY tl.performed_at DESC
        LIMIT 20
      `,
      [uniqueId],
    );

    const [history, streak, identityRows, affectedLaunches, triageHistory] = await Promise.all([
      getTestItemHistory(uniqueId, 30),
      getTestFailureStreak(uniqueId, 15),
      identityQuery,
      affectedQuery,
      triageQuery,
    ]);

    const jiraRows: { jira_key: string }[] = await AppDataSource.query(
      `
      SELECT DISTINCT ti.jira_key
      FROM test_items ti
      WHERE ti.unique_id = $1 AND ti.jira_key IS NOT NULL
    `,
      [uniqueId],
    );

    const identityRow = identityRows.at(0);
    const identity = identityRow
      ? {
          component: identityRow.component,
          jiraKeys: jiraRows.map(row => row.jira_key),
          name: identityRow.name,
          polarionId: identityRow.polarion_id,
          uniqueId,
        }
      : { component: null, jiraKeys: [] as string[], name: '', polarionId: null, uniqueId };

    res.json({
      affectedLaunches: affectedLaunches.map(row => ({
        cluster_name: row.cluster_name,
        cnv_version: row.cnv_version,
        component: row.component,
        name: row.name,
        ocp_version: row.ocp_version,
        rp_id: row.rp_id,
        start_time: row.start_time,
        status: row.status,
        tier: row.tier,
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
