import { Router, Request, Response, NextFunction } from 'express';
import {
  getPassRateTrend,
  getPassRateTrendByVersion,
  getFailureHeatmap,
  getTopFailingTests,
  getAIPredictionAccuracy,
  getClusterReliability,
  getErrorPatterns,
  getDefectTypesTrend,
  getFailuresByHour,
} from '../../db/store';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const launchName = (req.query.name as string) || '';
    const days = parseInt(req.query.days as string) || 30;
    const component = (req.query.component as string) || undefined;
    const trend = await getPassRateTrend(launchName, days, component);
    res.json(trend);
  } catch (err) {
    next(err);
  }
});

router.get('/by-version', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const component = (req.query.component as string) || undefined;
    const data = await getPassRateTrendByVersion(days, component);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/heatmap', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 14;
    const limit = parseInt(req.query.limit as string) || 20;
    const component = (req.query.component as string) || undefined;
    const data = await getFailureHeatmap(days, limit, component);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/top-failures', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const limit = parseInt(req.query.limit as string) || 15;
    const component = (req.query.component as string) || undefined;
    const data = await getTopFailingTests(days, limit, component);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/ai-accuracy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const component = (req.query.component as string) || undefined;
    res.json(await getAIPredictionAccuracy(days, component));
  } catch (err) { next(err); }
});

router.get('/clusters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const component = (req.query.component as string) || undefined;
    res.json(await getClusterReliability(days, component));
  } catch (err) { next(err); }
});

router.get('/error-patterns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const limit = parseInt(req.query.limit as string) || 10;
    const component = (req.query.component as string) || undefined;
    res.json(await getErrorPatterns(days, limit, component));
  } catch (err) { next(err); }
});

router.get('/defect-types', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const component = (req.query.component as string) || undefined;
    res.json(await getDefectTypesTrend(days, component));
  } catch (err) { next(err); }
});

router.get('/by-hour', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const component = (req.query.component as string) || undefined;
    res.json(await getFailuresByHour(days, component));
  } catch (err) { next(err); }
});

export default router;
