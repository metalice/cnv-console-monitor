import { Router } from 'express';

import { validateDateRange } from '@cnv-monitor/shared';

import { runParallelPollCycles, runWeeklyPollCycle } from '../../weekly/poller';
import { getAllPollStatuses, getWeeklyPollStatus, isAnyPollRunning } from '../../weekly/pollState';

export const weeklyPollRouter = Router();

weeklyPollRouter.post('/', (req, res) => {
  const component = req.query.component as string | undefined;
  const components = req.query.components as string | undefined;
  const since = req.query.since as string | undefined;
  const until = req.query.until as string | undefined;

  if (since && until) {
    const rangeError = validateDateRange(since, until);
    if (rangeError) {
      res.status(400).json({ error: rangeError });
      return;
    }
  }

  if (components) {
    const componentList = components.split(',').filter(Boolean);
    if (componentList.length === 0) {
      res.status(400).json({ error: 'No components specified' });
      return;
    }

    const running = componentList.some(comp => {
      const status = getWeeklyPollStatus(comp);
      return status.status === 'running';
    });
    if (running) {
      res.status(409).json({ error: 'A poll is already running for one of the components' });
      return;
    }

    res.status(202).json({ components: componentList, message: 'Parallel polls started' });
    runParallelPollCycles(componentList, since, until).catch(Boolean);
    return;
  }

  if (isAnyPollRunning()) {
    res
      .status(409)
      .json({ error: 'A poll is already running', status: getWeeklyPollStatus(component) });
    return;
  }

  res.status(202).json({ message: 'Poll started' });
  runWeeklyPollCycle(component, since, until).catch(Boolean);
});

weeklyPollRouter.get('/status', (req, res) => {
  const component = req.query.component as string | undefined;
  const all = req.query.all === 'true';
  if (all) {
    res.json(getAllPollStatuses());
    return;
  }
  res.json(getWeeklyPollStatus(component));
});
