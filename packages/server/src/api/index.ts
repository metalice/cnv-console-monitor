import express from 'express';
import path from 'path';
import { httpLogger } from '../logger';
import { extractUser } from './middleware/auth';
import authRouter from './routes/auth';
import artifactsRouter from './routes/artifacts';
import launchesRouter from './routes/launches';
import testItemsRouter from './routes/testItems';
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
import { errorHandler } from './middleware/errorHandler';

export function createApp(): express.Application {
  const app = express();

  app.use(httpLogger);
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const clientDistPath = path.join(__dirname, '..', '..', '..', 'client', 'dist');
  app.use(express.static(clientDistPath));

  app.use('/api/auth', extractUser, authRouter);
  app.use('/api/artifacts', extractUser, artifactsRouter);
  app.use('/api/launches', extractUser, launchesRouter);
  app.use('/api/test-items', extractUser, testItemsRouter);
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

  app.get('{*path}', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  app.use(errorHandler);

  return app;
}
