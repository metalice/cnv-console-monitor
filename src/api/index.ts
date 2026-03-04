import express from 'express';
import path from 'path';
import launchesRouter from './routes/launches';
import testItemsRouter from './routes/testItems';
import triageRouter from './routes/triage';
import analysisRouter from './routes/analysis';
import jiraRouter from './routes/jira';
import acknowledgmentRouter from './routes/acknowledgment';
import flakyRouter from './routes/flaky';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): express.Application {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'dashboard', 'public')));

  app.use('/api/launches', launchesRouter);
  app.use('/api/test-items', testItemsRouter);
  app.use('/api/triage', triageRouter);
  app.use('/api/analysis', analysisRouter);
  app.use('/api/jira', jiraRouter);
  app.use('/api/acknowledgment', acknowledgmentRouter);
  app.use('/api/flaky-tests', flakyRouter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dashboard', 'public', 'index.html'));
  });

  app.use(errorHandler);

  return app;
}
