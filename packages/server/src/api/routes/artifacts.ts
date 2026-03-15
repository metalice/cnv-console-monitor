import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import https from 'https';
import { getLaunchByRpId } from '../../db/store';
import { parseIntParam } from '../middleware/validate';
import { logger } from '../../logger';

const log = logger.child({ module: 'Artifacts' });

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const ALLOWED_HOST = 'jenkins-csb-cnvqe-main.dno.corp.redhat.com';

const router = Router();

router.get('/launch/:launchId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const launchId = parseIntParam(req.params.launchId, 'launchId', res);
    if (launchId === null) return;

    const launch = await getLaunchByRpId(launchId);
    if (!launch?.artifacts_url) {
      res.json({ videos: [], screenshots: [], reports: [], artifactsPageUrl: null });
      return;
    }

    const apiUrl = launch.artifacts_url.replace(/\/artifact\/?$/, '/api/json?tree=artifacts[relativePath,fileName]');

    const response = await axios.get(apiUrl, { httpsAgent, timeout: 15000 });
    const artifacts: Array<{ relativePath: string; fileName: string }> = response.data.artifacts || [];

    const baseUrl = launch.artifacts_url.replace(/\/?$/, '/');

    const videos = artifacts
      .filter(artifact => artifact.relativePath.includes('/videos/') && artifact.fileName.endsWith('.mp4'))
      .map(artifact => ({
        name: artifact.fileName,
        testFile: artifact.fileName.replace('.mp4', ''),
        url: `/api/artifacts/proxy?url=${encodeURIComponent(baseUrl + artifact.relativePath)}`,
      }));

    const screenshots = artifacts
      .filter(artifact => artifact.relativePath.includes('/screenshots/') && artifact.fileName.endsWith('.png'))
      .map(artifact => {
        const parts = artifact.relativePath.split('/screenshots/');
        const relative = parts[1] || artifact.fileName;
        const testFile = relative.split('/')[0];
        return {
          name: artifact.fileName,
          testFile,
          path: relative,
          url: `/api/artifacts/proxy?url=${encodeURIComponent(baseUrl + artifact.relativePath)}`,
        };
      });

    const reports = artifacts
      .filter(artifact => artifact.fileName.endsWith('.html') && artifact.fileName.includes('cypress'))
      .map(artifact => ({
        name: artifact.fileName,
        url: `/api/artifacts/proxy?url=${encodeURIComponent(baseUrl + artifact.relativePath)}`,
      }));

    res.json({
      videos,
      screenshots,
      reports,
      artifactsPageUrl: launch.artifacts_url,
    });
  } catch (err) {
    log.warn({ err }, 'Failed to fetch artifacts');
    res.json({ videos: [], screenshots: [], reports: [], artifactsPageUrl: null });
  }
});

router.get('/proxy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      res.status(400).json({ error: 'url parameter is required' });
      return;
    }

    const parsed = new URL(url);
    if (parsed.hostname !== ALLOWED_HOST) {
      res.status(403).json({ error: 'Proxy not allowed for this host' });
      return;
    }

    const response = await axios.get(url, {
      httpsAgent,
      timeout: 30000,
      responseType: 'stream',
    });

    const contentType = response.headers['content-type'];
    if (contentType) res.setHeader('Content-Type', contentType);

    const contentLength = response.headers['content-length'];
    if (contentLength) res.setHeader('Content-Length', contentLength);

    res.setHeader('Cache-Control', 'public, max-age=86400');

    response.data.pipe(res);
  } catch (err) {
    log.warn({ err, url: req.query.url }, 'Failed to proxy artifact');
    res.status(502).json({ error: 'Failed to fetch artifact' });
  }
});

export default router;
