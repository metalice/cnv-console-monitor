import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { httpLogger } from '../logger';
import { config } from '../config';
import { AppDataSource } from '../db/data-source';
import { extractUser } from './middleware/auth';
import authRouter from './routes/auth';
import artifactsRouter from './routes/artifacts';
import launchesRouter from './routes/launches';
import testItemsRouter from './routes/testItems';
import testProfileRouter from './routes/testProfile';
import triageRouter from './routes/triage';
import analysisRouter from './routes/analysis';
import jiraRouter from './routes/jira';
import acknowledgmentRouter from './routes/acknowledgment';
import flakyRouter from './routes/flaky';
import defectTypesRouter from './routes/defectTypes';
import activityRouter from './routes/activity';
import configPublicRouter from './routes/configPublic';
import pollRouter from './routes/poll';
import notificationsRouter from './routes/notifications';
import settingsRouter from './routes/settings';
import subscriptionsRouter from './routes/subscriptions';
import releasesRouter from './routes/releases';
import userRouter from './routes/user';
import adminRouter from './routes/admin';
import componentHealthRouter from './routes/componentHealth';
import compareRouter from './routes/compare';
import readinessRouter from './routes/readiness';
import myWorkRouter from './routes/myWork';
import componentMappingsRouter from './routes/component-mappings';
import aiRouter from './routes/ai';
import { errorHandler } from './middleware/errorHandler';

export const createApp = (): express.Application => {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'ws:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  const allowedOrigins = config.dashboard.url ? [config.dashboard.url] : [];
  app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  }));

  app.use(httpLogger);
  app.use(express.json({ limit: '1mb' }));

  const apiLimiter = rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false });
  const strictLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });
  app.use('/api', apiLimiter);

  app.get('/health', async (_req, res) => {
    try {
      await AppDataSource.query('SELECT 1');
      res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'disconnected', timestamp: new Date().toISOString() });
    }
  });

  const clientDistPath = path.join(__dirname, '..', '..', '..', 'client', 'dist');
  app.use(express.static(clientDistPath));

  app.use('/api/auth', extractUser, authRouter);
  app.use('/api/artifacts', extractUser, artifactsRouter);
  app.use('/api/launches', extractUser, launchesRouter);
  app.use('/api/test-items', extractUser, testItemsRouter);
  app.use('/api/test-profile', extractUser, testProfileRouter);
  app.use('/api/triage', extractUser, triageRouter);
  app.use('/api/analysis', extractUser, analysisRouter);
  app.use('/api/jira', extractUser, jiraRouter);
  app.use('/api/acknowledgment', extractUser, acknowledgmentRouter);
  app.use('/api/flaky-tests', extractUser, flakyRouter);
  app.use('/api/defect-types', extractUser, defectTypesRouter);
  app.use('/api/activity', extractUser, activityRouter);
  app.use('/api/config', extractUser, configPublicRouter);
  app.use('/api/poll', extractUser, pollRouter);
  app.use('/api/notifications', extractUser, notificationsRouter);
  app.use('/api/settings', extractUser, settingsRouter);
  app.use('/api/subscriptions', extractUser, subscriptionsRouter);
  app.use('/api/releases', extractUser, releasesRouter);
  app.use('/api/user', extractUser, userRouter);
  app.use('/api/admin', strictLimiter, extractUser, adminRouter);
  app.use('/api/component-health', extractUser, componentHealthRouter);
  app.use('/api/compare', extractUser, compareRouter);
  app.use('/api/readiness', extractUser, readinessRouter);
  app.use('/api/my-work', extractUser, myWorkRouter);
  app.use('/api/component-mappings', extractUser, componentMappingsRouter);
  app.use('/api/ai', extractUser, aiRouter);

  app.get('{*path}', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  app.use(errorHandler);

  return app;
}
