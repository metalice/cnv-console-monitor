import { type NextFunction, type Request, type Response, Router } from 'express';

import { AppDataSource } from '../../db/data-source';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.user?.email;
    if (!email) {
      res.status(401).json({ error: 'User email required' });
      return;
    }

    const subscriptionRows: { components: string }[] = await AppDataSource.query(
      `SELECT components FROM notification_subscriptions WHERE created_by = $1 AND enabled = true`,
      [email],
    );

    const componentSet = new Set<string>();
    for (const row of subscriptionRows) {
      try {
        const parsed = JSON.parse(row.components || '[]') as string[];
        for (const comp of parsed) {
          componentSet.add(comp);
        }
      } catch {
        // Malformed components JSON – skip
      }
    }
    const myComponents = [...componentSet].toSorted((a, b) => a.localeCompare(b));
    const sinceMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

    let untriagedInMyComponents = 0;
    if (myComponents.length > 0) {
      const placeholders = myComponents.map((_, i) => `$${i + 1}`).join(', ');
      const timeParam = `$${myComponents.length + 1}`;
      const countRows: { count: number }[] = await AppDataSource.query(
        `SELECT COUNT(*)::int as count
         FROM test_items ti
         JOIN launches l ON ti.launch_rp_id = l.rp_id
         WHERE ti.status = 'FAILED'
           AND (ti.defect_type IS NULL OR ti.defect_type = 'ti001' OR ti.defect_type LIKE 'ti_%')
           AND l.component IN (${placeholders})
           AND l.start_time > ${timeParam}`,
        [...myComponents, sinceMs],
      );
      untriagedInMyComponents = countRows[0]?.count ?? 0;
    }

    type RecentActivityRow = {
      action: string;
      test_name: string | null;
      new_value: string | null;
      performed_at: string;
    };
    const myRecentActivity: RecentActivityRow[] = await AppDataSource.query(
      `(SELECT tl.action, ti.name as test_name, tl.new_value, tl.performed_at
        FROM triage_log tl
        LEFT JOIN test_items ti ON tl.test_item_rp_id = ti.rp_id
        WHERE tl.performed_by = $1)
       UNION ALL
       (SELECT 'acknowledge' as action, NULL as test_name, a.notes as new_value, a.acknowledged_at as performed_at
        FROM acknowledgments a
        WHERE a.reviewer = $1 OR a.reviewer = $2)
       ORDER BY performed_at DESC
       LIMIT 15`,
      [email, req.user?.name ?? email],
    );

    const myJiraBugs: { jira_key: string; test_name: string; created_at: string }[] =
      await AppDataSource.query(
        `SELECT DISTINCT ti.jira_key, ti.name as test_name, tl.performed_at as created_at
       FROM triage_log tl
       JOIN test_items ti ON tl.test_item_rp_id = ti.rp_id
       WHERE tl.performed_by = $1 AND tl.action = 'create_jira' AND ti.jira_key IS NOT NULL
       ORDER BY tl.performed_at DESC
       LIMIT 10`,
        [email],
      );

    let suggestedWork: {
      name: string;
      unique_id: string;
      occurrences: number;
      consecutiveFailures: number;
    }[] = [];
    if (myComponents.length > 0) {
      const placeholders = myComponents.map((_, i) => `$${i + 1}`).join(', ');
      const timeParam = `$${myComponents.length + 1}`;
      suggestedWork = await AppDataSource.query(
        `SELECT ti.name, ti.unique_id,
                COUNT(*)::int as occurrences,
                0 as "consecutiveFailures"
         FROM test_items ti
         JOIN launches l ON ti.launch_rp_id = l.rp_id
         WHERE ti.status = 'FAILED'
           AND (ti.defect_type IS NULL OR ti.defect_type = 'ti001' OR ti.defect_type LIKE 'ti_%')
           AND l.component IN (${placeholders})
           AND ti.unique_id IS NOT NULL
           AND l.start_time > ${timeParam}
         GROUP BY ti.unique_id, ti.name
         ORDER BY occurrences DESC
         LIMIT 10`,
        [...myComponents, sinceMs],
      );
      suggestedWork = suggestedWork.map(row => ({
        ...row,
        consecutiveFailures: row.consecutiveFailures,
        occurrences: row.occurrences,
      }));
    }

    res.json({
      myComponents,
      myJiraBugs,
      myRecentActivity,
      suggestedWork,
      untriagedInMyComponents,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
