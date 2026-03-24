import { type NextFunction, type Request, type Response } from 'express';

import type { User } from '@cnv-monitor/shared';

import { config } from '../../config';
import { getSubscription, upsertUser } from '../../db/store';
import { logger } from '../../logger';

const log = logger.child({ module: 'Auth' });

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express module augmentation requires namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Express augmentation requires interface
    interface Request {
      user?: User;
    }
  }
}

const DEV_USER: User = {
  email: 'developer@redhat.com',
  id: 'dev-user',
  name: 'Dev User',
  role: 'admin',
};

let loggedOnce = false;

export const extractUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!config.auth.enabled) {
    if (!loggedOnce) {
      log.warn('Authentication is DISABLED (AUTH_ENABLED=false)');
      loggedOnce = true;
    }
    try {
      const dbUser = await upsertUser(DEV_USER.email, DEV_USER.name);
      if (dbUser.role !== 'admin') {
        const { setUserRole } = await import('../../db/store');
        await setUserRole(DEV_USER.email, 'admin');
      }
    } catch {
      // DB may not be ready yet during startup
    }

    const impersonate = req.query.impersonate as string;
    if (impersonate && process.env.NODE_ENV === 'development') {
      try {
        const impUser = await upsertUser(impersonate, impersonate.split('@')[0]);
        log.warn({ impersonate }, 'Dev mode impersonation active');
        req.user = {
          email: impUser.email,
          id: impUser.email,
          name: impUser.name,
          role: impUser.role === 'admin' ? 'user' : impUser.role,
        };
        next();
        return;
      } catch {
        // Fall through to dev user
      }
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

  const userEmail = email || `${username}@redhat.com`;
  const userName = username || email!.split('@')[0];

  try {
    const dbUser = await upsertUser(userEmail, userName);
    req.user = {
      email: userEmail,
      id: username || email!,
      name: userName,
      role: dbUser.role,
    };
  } catch {
    req.user = {
      email: userEmail,
      id: username || email!,
      name: userName,
      role: 'user',
    };
  }

  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};

export const requireOwnerOrAdmin =
  (getOwnerId: (req: Request) => Promise<string | null>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.user?.role === 'admin') {
      next();
      return;
    }

    const ownerId = await getOwnerId(req);
    if (ownerId && req.user?.email === ownerId) {
      next();
      return;
    }

    res.status(403).json({ error: 'You can only modify your own resources, or ask an admin' });
  };

export const getSubscriptionOwner = async (req: Request): Promise<string | null> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    return null;
  }
  const sub = await getSubscription(id);
  return sub?.createdBy ?? null;
};
