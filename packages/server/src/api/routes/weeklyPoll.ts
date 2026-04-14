import { Router } from 'express';

import { runWeeklyPollCycle } from '../../weekly/poller';
import { getWeeklyPollStatus } from '../../weekly/pollState';

export const weeklyPollRouter = Router();

weeklyPollRouter.post('/', (_req, res) => {
  const component = _req.query.component as string | undefined;
  const status = getWeeklyPollStatus();

  if (status.status === 'running') {
    res.status(409).json({ error: 'Weekly poll already running', status });
    return;
  }

  res.status(202).json({ message: 'Weekly poll started' });

  void runWeeklyPollCycle(component);
});

weeklyPollRouter.get('/status', (_req, res) => {
  res.json(getWeeklyPollStatus());
});
