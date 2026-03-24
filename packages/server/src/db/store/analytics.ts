import { AppDataSource } from '../data-source';

export const getFailureHeatmap = async (
  days: number,
  limit: number,
  component?: string,
): Promise<
  { unique_id: string; name: string; fail_count: number; date: string; status: string }[]
> => {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const compFilter = component ? ` AND l.component = $3` : '';
  const params: unknown[] = [sinceMs, limit];
  if (component) {
    params.push(component);
  }
  const rows = await AppDataSource.query(
    `
    WITH top_failures AS (
      SELECT ti.unique_id, ti.name, COUNT(*)::int as fail_count
      FROM test_items ti
      JOIN launches l ON ti.launch_rp_id = l.rp_id
      WHERE ti.status = 'FAILED' AND l.start_time >= $1 AND ti.unique_id IS NOT NULL${compFilter}
      GROUP BY ti.unique_id, ti.name
      ORDER BY fail_count DESC
      LIMIT $2
    ),
    date_range AS (
      SELECT DISTINCT TO_CHAR(TO_TIMESTAMP(l.start_time / 1000), 'YYYY-MM-DD') as date
      FROM launches l
      WHERE l.start_time >= $1${compFilter}
    )
    SELECT
      tf.unique_id, tf.name, tf.fail_count, dr.date,
      CASE WHEN EXISTS (
        SELECT 1 FROM test_items ti2
        WHERE ti2.unique_id = tf.unique_id
          AND ti2.status = 'FAILED'
          AND TO_CHAR(TO_TIMESTAMP(ti2.start_time / 1000), 'YYYY-MM-DD') = dr.date
      ) THEN 'FAILED' ELSE 'OK' END as status
    FROM top_failures tf
    CROSS JOIN date_range dr
    ORDER BY tf.fail_count DESC, tf.name, dr.date
  `,
    params,
  );
  return rows;
};

export const getTopFailingTests = async (
  days: number,
  limit: number,
  component?: string,
): Promise<
  {
    name: string;
    unique_id: string;
    fail_count: number;
    total_runs: number;
    failure_rate: number;
    recent_trend: 'worsening' | 'improving' | 'stable';
  }[]
> => {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const midMs = Date.now() - (days / 2) * 24 * 60 * 60 * 1000;
  const compFilter = component ? ' AND l.component = $4' : '';
  const params: unknown[] = [sinceMs, limit, midMs];
  if (component) {
    params.push(component);
  }
  const rows = await AppDataSource.query(
    `
    WITH test_failures AS (
      SELECT
        ti.unique_id, ti.name,
        COUNT(*) FILTER (WHERE ti.status = 'FAILED')::int as fail_count,
        COUNT(*)::int as total_runs,
        COUNT(*) FILTER (WHERE ti.status = 'FAILED' AND l.start_time < $3)::int as first_half_fails,
        COUNT(*) FILTER (WHERE l.start_time < $3)::int as first_half_runs,
        COUNT(*) FILTER (WHERE ti.status = 'FAILED' AND l.start_time >= $3)::int as second_half_fails,
        COUNT(*) FILTER (WHERE l.start_time >= $3)::int as second_half_runs
      FROM test_items ti
      JOIN launches l ON ti.launch_rp_id = l.rp_id
      WHERE l.start_time >= $1 AND ti.unique_id IS NOT NULL${compFilter}
      GROUP BY ti.unique_id, ti.name
      HAVING COUNT(*) FILTER (WHERE ti.status = 'FAILED') > 0
      ORDER BY fail_count DESC
      LIMIT $2
    )
    SELECT
      name, unique_id, fail_count, total_runs,
      ROUND(CAST(fail_count AS NUMERIC) / NULLIF(total_runs, 0) * 100, 1) as failure_rate,
      first_half_fails, first_half_runs, second_half_fails, second_half_runs
    FROM test_failures
  `,
    params,
  );

  return rows.map((r: Record<string, unknown>) => {
    const firstRate =
      Number(r.first_half_runs) > 0 ? Number(r.first_half_fails) / Number(r.first_half_runs) : 0;
    const secondRate =
      Number(r.second_half_runs) > 0 ? Number(r.second_half_fails) / Number(r.second_half_runs) : 0;
    const diff = secondRate - firstRate;
    const trend =
      diff > 0.1
        ? ('worsening' as const)
        : diff < -0.1
          ? ('improving' as const)
          : ('stable' as const);

    return {
      fail_count: Number(r.fail_count),
      failure_rate: Number(r.failure_rate),
      name: r.name as string,
      recent_trend: trend,
      total_runs: Number(r.total_runs),
      unique_id: r.unique_id as string,
    };
  });
};

export const getAIPredictionAccuracy = async (
  days: number,
  component?: string,
): Promise<{ prediction: string; actual: string; count: number }[]> => {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const compFilter = component ? ' AND l.component = $2' : '';
  const params: unknown[] = [sinceMs];
  if (component) {
    params.push(component);
  }
  const rows = await AppDataSource.query(
    `
    SELECT
      ti.ai_prediction as prediction,
      CASE
        WHEN ti.defect_type LIKE 'pb%' THEN 'Product Bug'
        WHEN ti.defect_type LIKE 'ab%' THEN 'Automation Bug'
        WHEN ti.defect_type LIKE 'si%' THEN 'System Issue'
        WHEN ti.defect_type LIKE 'nd%' THEN 'No Defect'
        ELSE 'Other'
      END as actual,
      COUNT(*)::int as count
    FROM test_items ti
    JOIN launches l ON ti.launch_rp_id = l.rp_id
    WHERE ti.ai_prediction IS NOT NULL
      AND ti.defect_type IS NOT NULL
      AND ti.defect_type NOT LIKE 'ti_%' AND ti.defect_type != 'ti001'
      AND l.start_time >= $1${compFilter}
    GROUP BY prediction, actual
    ORDER BY count DESC
  `,
    params,
  );
  return rows;
};
