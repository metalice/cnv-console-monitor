import { Request, Response, NextFunction } from 'express';
import { config } from '../../config';
import { logger } from '../../logger';
import type { User } from '@cnv-monitor/shared';

const log = logger.child({ module: 'Auth' });

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const DEV_USER: User = {
  id: 'dev-user',
  email: 'developer@redhat.com',
  name: 'Dev User',
};

let loggedOnce = false;

export function extractUser(req: Request, res: Response, next: NextFunction): void {
  if (!config.auth.enabled) {
    if (!loggedOnce) {
      log.warn('Authentication is DISABLED (AUTH_ENABLED=false)');
      loggedOnce = true;
    }
    req.user = DEV_USER;
    next();
    return;
  }

  const email = req.headers['x-forwarded-email'] as string | undefined;
  const username = req.headers['x-forwarded-user'] as string | undefined;

  if (!email && !username) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  req.user = {
    id: username || email!,
    email: email || `${username}@redhat.com`,
    name: username || email!.split('@')[0],
  };

  next();
}
