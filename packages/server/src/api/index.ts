import express from 'express';
import path from 'path';
import { httpLogger } from '../logger';
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
import { errorHandler } from './middleware/errorHandler';

export function createApp(): express.Application {
  const app = express();

  app.use(httpLogger);
  app.use(express.json());

  const clientDistPath = path.join(__dirname, '..', '..', '..', 'client', 'dist');
  app.use(express.static(clientDistPath));

  app.use('/api/launches', launchesRouter);
  app.use('/api/test-items', testItemsRouter);
  app.use('/api/triage', triageRouter);
  app.use('/api/analysis', analysisRouter);
  app.use('/api/jira', jiraRouter);
  app.use('/api/acknowledgment', acknowledgmentRouter);
  app.use('/api/flaky-tests', flakyRouter);
  app.use('/api/defect-types', defectTypesRouter);
  app.use('/api/activity', activityRouter);
  app.use('/api/config', configPublicRouter);
  app.use('/api/poll', pollRouter);
  app.use('/api/notifications', notificationsRouter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('{*path}', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  app.use(errorHandler);

  return app;
}
