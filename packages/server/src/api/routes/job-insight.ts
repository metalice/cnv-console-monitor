import axios from 'axios';
import { Router } from 'express';

import { config } from '../../config';
import {
  deleteJobInsight,
  getJobInsightByLaunchRpId,
  getJobInsightsByLaunchRpId,
  saveJobInsight,
  updateJobInsightStatus,
} from '../../db/store/jobInsight';
import { getLaunchByRpId } from '../../db/store/launches';
import { logger } from '../../logger';

const log = logger.child({ module: 'JobInsight' });
const router = Router();

const TIMEOUT_MS = 30_000;

const parseJobFromArtifactsUrl = (
  artifactsUrl: string,
): { jobName: string; buildNumber: number } | null => {
  const match = /\/job\/([^/]+)\/(\d+)\/artifact/.exec(artifactsUrl);
  if (!match) {
    return null;
  }
  return { buildNumber: parseInt(match[2], 10), jobName: match[1] };
};

router.post('/analyze', async (req, res, next) => {
  try {
    const { launchRpId } = req.body as { launchRpId: number };

    if (!launchRpId) {
      res.status(400).json({ error: 'launchRpId is required' });
      return;
    }

    const launch = await getLaunchByRpId(launchRpId);
    if (!launch) {
      res.status(404).json({ error: 'Launch not found' });
      return;
    }

    if (!launch.artifacts_url) {
      res.status(400).json({ error: 'Launch has no Jenkins artifacts URL' });
      return;
    }

    const parsed = parseJobFromArtifactsUrl(launch.artifacts_url);
    if (!parsed) {
      res
        .status(400)
        .json({ error: 'Could not extract job name and build number from artifacts URL' });
      return;
    }

    const { buildNumber, jobName } = parsed;
    const aiProvider = config.jobInsight.defaultProvider;
    const aiModel = config.jobInsight.defaultModel;

    const response = await axios.post<{
      job_id: string;
      status: string;
      result_url: string;
    }>(
      `${config.jobInsight.url}/analyze`,
      {
        ai_model: aiModel,
        ai_provider: aiProvider,
        build_number: buildNumber,
        job_name: jobName,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: TIMEOUT_MS,
      },
    );

    const { job_id: jobId, result_url: resultUrl, status } = response.data;

    await saveJobInsight({
      ai_model: aiModel,
      ai_provider: aiProvider,
      build_number: buildNumber,
      job_id: jobId,
      job_name: jobName,
      launch_rp_id: launchRpId,
      status,
      triggered_by: req.user?.email ?? req.user?.name ?? 'unknown',
    });

    log.info({ buildNumber, jobId, jobName, launchRpId }, 'Job Insight analysis triggered');

    res.json({ jobId, resultUrl, status });
  } catch (err) {
    next(err);
  }
});

router.post('/regenerate', async (req, res, next) => {
  try {
    const { launchRpId } = req.body as { launchRpId: number };

    if (!launchRpId) {
      res.status(400).json({ error: 'launchRpId is required' });
      return;
    }

    const existing = await getJobInsightsByLaunchRpId(launchRpId);
    await Promise.all(existing.map(record => deleteJobInsight(record.job_id)));

    log.info({ launchRpId, removedCount: existing.length }, 'Cleared previous Job Insight results');

    const launch = await getLaunchByRpId(launchRpId);
    if (!launch) {
      res.status(404).json({ error: 'Launch not found' });
      return;
    }

    if (!launch.artifacts_url) {
      res.status(400).json({ error: 'Launch has no Jenkins artifacts URL' });
      return;
    }

    const parsed = parseJobFromArtifactsUrl(launch.artifacts_url);
    if (!parsed) {
      res
        .status(400)
        .json({ error: 'Could not extract job name and build number from artifacts URL' });
      return;
    }

    const { buildNumber, jobName } = parsed;
    const aiProvider = config.jobInsight.defaultProvider;
    const aiModel = config.jobInsight.defaultModel;

    const response = await axios.post<{
      job_id: string;
      status: string;
      result_url: string;
    }>(
      `${config.jobInsight.url}/analyze`,
      {
        ai_model: aiModel,
        ai_provider: aiProvider,
        build_number: buildNumber,
        job_name: jobName,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: TIMEOUT_MS,
      },
    );

    const { job_id: jobId, result_url: resultUrl, status } = response.data;

    await saveJobInsight({
      ai_model: aiModel,
      ai_provider: aiProvider,
      build_number: buildNumber,
      job_id: jobId,
      job_name: jobName,
      launch_rp_id: launchRpId,
      status,
      triggered_by: req.user?.email ?? req.user?.name ?? 'unknown',
    });

    log.info({ buildNumber, jobId, jobName, launchRpId }, 'Job Insight regeneration triggered');

    res.json({ jobId, resultUrl, status });
  } catch (err) {
    next(err);
  }
});

router.get('/results/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const response = await axios.get<Record<string, unknown>>(
      `${config.jobInsight.url}/results/${jobId}`,
      { timeout: TIMEOUT_MS },
    );

    const data = response.data;
    const status = data.status as string;

    if (status === 'completed' || status === 'failed') {
      const result = status === 'completed' ? (data.result as Record<string, unknown>) : null;
      await updateJobInsightStatus(jobId, status, result ?? undefined);
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/launch/:launchRpId', async (req, res, next) => {
  try {
    const launchRpId = parseInt(req.params.launchRpId, 10);
    if (isNaN(launchRpId)) {
      res.status(400).json({ error: 'Invalid launchRpId' });
      return;
    }

    const launch = await getLaunchByRpId(launchRpId);
    const hasArtifactsUrl = Boolean(launch?.artifacts_url);

    const record = await getJobInsightByLaunchRpId(launchRpId);
    if (!record) {
      res.json({ exists: false, hasArtifactsUrl });
      return;
    }

    if (record.status === 'completed' && record.result) {
      res.json({
        completedAt: record.completed_at?.toISOString() ?? null,
        createdAt: record.created_at.toISOString(),
        exists: true,
        hasArtifactsUrl,
        jobId: record.job_id,
        result: record.result,
        status: record.status,
        triggeredBy: record.triggered_by,
      });
      return;
    }

    const response = await axios.get<Record<string, unknown>>(
      `${config.jobInsight.url}/results/${record.job_id}`,
      { timeout: TIMEOUT_MS },
    );

    const externalStatus = response.data.status as string;
    if (externalStatus === 'completed' || externalStatus === 'failed') {
      const result =
        externalStatus === 'completed' ? (response.data.result as Record<string, unknown>) : null;
      await updateJobInsightStatus(record.job_id, externalStatus, result ?? undefined);
    }

    res.json({
      completedAt: record.completed_at?.toISOString() ?? null,
      createdAt: record.created_at.toISOString(),
      exists: true,
      hasArtifactsUrl,
      jobId: record.job_id,
      result: externalStatus === 'completed' ? response.data.result : null,
      status: externalStatus,
      triggeredBy: record.triggered_by,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/history/:launchRpId', async (req, res, next) => {
  try {
    const launchRpId = parseInt(req.params.launchRpId, 10);
    if (isNaN(launchRpId)) {
      res.status(400).json({ error: 'Invalid launchRpId' });
      return;
    }

    const records = await getJobInsightsByLaunchRpId(launchRpId);
    res.json(
      records.map(record => ({
        aiModel: record.ai_model,
        aiProvider: record.ai_provider,
        completedAt: record.completed_at?.toISOString() ?? null,
        createdAt: record.created_at.toISOString(),
        jobId: record.job_id,
        status: record.status,
        triggeredBy: record.triggered_by,
      })),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
