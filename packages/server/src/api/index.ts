import path from 'path';

import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { config } from '../config';
import { AppDataSource } from '../db/data-source';
import { httpLogger } from '../logger';

import { extractUser } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import acknowledgmentRouter from './routes/acknowledgment';
import activityRouter from './routes/activity';
import adminRouter from './routes/admin';
import aiRouter from './routes/ai';
import analysisRouter from './routes/analysis';
import artifactsRouter from './routes/artifacts';
import authRouter from './routes/auth';
import compareRouter from './routes/compare';
import componentMappingsRouter from './routes/component-mappings';
import componentHealthRouter from './routes/componentHealth';
import configPublicRouter from './routes/configPublic';
import defectTypesRouter from './routes/defectTypes';
import feedbackRouter from './routes/feedback';
import flakyRouter from './routes/flaky';
import jiraRouter from './routes/jira';
import launchesRouter from './routes/launches';
import myWorkRouter from './routes/myWork';
import notificationsRouter from './routes/notifications';
import pollRouter from './routes/poll';
import quarantineRouter from './routes/quarantine';
import readinessRouter from './routes/readiness';
import releasesRouter from './routes/releases';
import { reportPollRouter } from './routes/reportPoll';
import { reportRepoConfigRouter } from './routes/reportRepoConfig';
import { reportsRouter } from './routes/reports';
import { reportTeamRouter } from './routes/reportTeam';
import repositoriesRouter from './routes/repositories';
import settingsRouter from './routes/settings';
import subscriptionsRouter from './routes/subscriptions';
import testExplorerRouter from './routes/test-explorer';
import testItemsRouter from './routes/testItems';
import testProfileRouter from './routes/testProfile';
import triageRouter from './routes/triage';
import userRouter from './routes/user';
import userTokensRouter from './routes/user-tokens';
import webhooksRouter from './routes/webhooks';

export const createApp = (): express.Application => {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          connectSrc: ["'self'", 'wss:', 'ws:'],
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  const allowedOrigins = config.dashboard.url ? [config.dashboard.url] : [];
  app.use(
    cors({
      credentials: true,
      origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    }),
  );

  app.use(httpLogger);
  app.use(express.json({ limit: '1mb' }));

  const apiLimiter = rateLimit({
    legacyHeaders: false,
    max: 200,
    standardHeaders: true,
    windowMs: 60_000,
  });
  const strictLimiter = rateLimit({
    legacyHeaders: false,
    max: 10,
    standardHeaders: true,
    windowMs: 60_000,
  });
  app.use('/api', apiLimiter);

  app.get('/health', async (_req, res) => {
    try {
      await AppDataSource.query('SELECT 1');
      res.json({ db: 'connected', status: 'ok', timestamp: new Date().toISOString() });
    } catch {
      res
        .status(503)
        .json({ db: 'disconnected', status: 'degraded', timestamp: new Date().toISOString() });
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
  app.use('/api/feedback', extractUser, feedbackRouter);
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
  app.use('/api/repositories', extractUser, repositoriesRouter);
  app.use('/api/test-explorer', extractUser, testExplorerRouter);
  app.use('/api/quarantine', extractUser, quarantineRouter);
  app.use('/api/webhooks', webhooksRouter);
  app.use('/api/report', extractUser, reportsRouter);
  app.use('/api/report-repos', extractUser, reportRepoConfigRouter);
  app.use('/api/report-team', extractUser, reportTeamRouter);
  app.use('/api/report-poll', extractUser, reportPollRouter);
  app.use('/api/user/tokens', extractUser, userTokensRouter);

  app.get('{*path}', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  app.use(errorHandler);

  return app;
};
