import { AppDataSource } from '../data-source';

export const getFlakyTests = async (
  days: number,
  limit: number,
  component?: string,
): Promise<{ name: string; unique_id: string; flip_count: number; total_runs: number }[]> => {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const compFilter = component ? ' AND l.component = $3' : '';
  const params: unknown[] = [sinceMs, limit];
  if (component) {
    params.push(component);
  }
  const rows = await AppDataSource.query(
    `
    WITH failed_tests AS (
      SELECT DISTINCT ti.unique_id, ti.name
      FROM test_items ti
      JOIN launches l ON ti.launch_rp_id = l.rp_id
      WHERE l.start_time >= $1 AND ti.unique_id IS NOT NULL AND ti.status = 'FAILED'${compFilter}
    ),
    test_launches AS (
      SELECT
        ft.unique_id, ft.name, l.rp_id as launch_rp_id, l.name as launch_name, l.start_time,
        CASE WHEN ti.rp_id IS NOT NULL THEN 'FAILED' ELSE 'PASSED' END as status,
        LAG(CASE WHEN ti.rp_id IS NOT NULL THEN 'FAILED' ELSE 'PASSED' END)
          OVER (PARTITION BY ft.unique_id, l.name ORDER BY l.start_time) as prev_status
      FROM failed_tests ft
      CROSS JOIN LATERAL (
        SELECT l2.* FROM launches l2
        WHERE l2.name IN (
          SELECT DISTINCT l3.name FROM launches l3
          JOIN test_items ti3 ON ti3.launch_rp_id = l3.rp_id
          WHERE ti3.unique_id = ft.unique_id AND l3.start_time >= $1
        )
        AND l2.start_time >= $1
      ) l
      LEFT JOIN test_items ti ON ti.launch_rp_id = l.rp_id AND ti.unique_id = ft.unique_id AND ti.status = 'FAILED'
    )
    SELECT
      name, unique_id,
      COUNT(CASE WHEN status != prev_status AND prev_status IS NOT NULL THEN 1 END)::int as flip_count,
      COUNT(*)::int as total_runs
    FROM test_launches
    GROUP BY unique_id, name
    HAVING COUNT(CASE WHEN status != prev_status AND prev_status IS NOT NULL THEN 1 END) > 0
    ORDER BY flip_count DESC
    LIMIT $2
  `,
    params,
  );
  return rows;
};
