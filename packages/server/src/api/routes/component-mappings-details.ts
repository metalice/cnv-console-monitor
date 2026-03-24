import { type NextFunction, type Request, type Response, Router } from 'express';

import { AppDataSource } from '../../db/data-source';

const router = Router();

router.get('/:name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const launchName = decodeURIComponent(req.params.name as string);
    const repo = AppDataSource.getRepository('Launch');

    const stats = (await repo
      .createQueryBuilder('l')
      .select('COUNT(*)', 'totalRuns')
      .addSelect("COUNT(CASE WHEN l.status = 'PASSED' THEN 1 END)", 'passed')
      .addSelect("COUNT(CASE WHEN l.status = 'FAILED' THEN 1 END)", 'failed')
      .addSelect("COUNT(CASE WHEN l.status = 'IN_PROGRESS' THEN 1 END)", 'inProgress')
      .addSelect('MIN(l.start_time)', 'firstRun')
      .addSelect('MAX(l.start_time)', 'lastRun')
      .where('l.name = :launchName', { launchName })
      .getRawOne())!;

    const latest = (await repo
      .createQueryBuilder('l')
      .where('l.name = :launchName', { launchName })
      .orderBy('l.start_time', 'DESC')
      .limit(1)
      .getMany()) as Record<string, unknown>[];

    if (latest.length === 0) {
      res.json({ found: false });
      return;
    }
    const launch = latest[0];
    res.json({
      artifactsUrl: launch.artifacts_url,
      cnvVersion: launch.cnv_version,
      component: launch.component,
      failed: parseInt(stats.failed, 10),
      firstRun: Number(stats.firstRun),
      found: true,
      inProgress: parseInt(stats.inProgress, 10),
      jenkinsMetadata: launch.jenkins_metadata,
      jenkinsStatus: launch.jenkins_status,
      jenkinsTeam: launch.jenkins_team,
      lastRun: Number(stats.lastRun),
      name: launch.name,
      passed: parseInt(stats.passed, 10),
      tier: launch.tier,
      totalRuns: parseInt(stats.totalRuns, 10),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
