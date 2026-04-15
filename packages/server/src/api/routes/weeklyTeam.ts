import { Router } from 'express';

import {
  type TeamMemberCreate,
  TeamMemberCreateSchema,
  type TeamMemberUpdate,
  TeamMemberUpdateSchema,
} from '@cnv-monitor/shared';

import { entityToTeamMember } from '../../db/mappers/weeklyReport';
import {
  createTeamMember,
  getTeamMemberById,
  hardDeleteTeamMember,
  listActiveTeamMembers,
  listAllTeamMembers,
  mergeTeamMembers,
  softDeleteTeamMember,
  updateTeamMember,
} from '../../db/store';
import { logger } from '../../logger';
import { validateBody } from '../middleware/validate';

const log = logger.child({ module: 'WeeklyReport:Team' });

export const weeklyTeamRouter = Router();

weeklyTeamRouter.get('/', async (req, res, next) => {
  try {
    const component = req.query.component as string | undefined;
    const showAll = req.query.includeInactive === 'true';
    const members = showAll
      ? await listAllTeamMembers(component)
      : await listActiveTeamMembers(component);
    res.json(members.map(entityToTeamMember));
  } catch (err) {
    next(err);
  }
});

weeklyTeamRouter.post('/', validateBody(TeamMemberCreateSchema), async (req, res, next) => {
  try {
    const member = await createTeamMember(req.body as TeamMemberCreate);
    log.info({ id: member.id, name: member.display_name }, 'Team member created');
    res.status(201).json(entityToTeamMember(member));
  } catch (err) {
    next(err);
  }
});

weeklyTeamRouter.put('/:memberId', validateBody(TeamMemberUpdateSchema), async (req, res, next) => {
  try {
    const memberId = req.params.memberId as string;
    await updateTeamMember(memberId, req.body as TeamMemberUpdate);
    const updated = await getTeamMemberById(memberId);
    if (!updated) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    log.info({ id: memberId }, 'Team member updated');
    res.json(entityToTeamMember(updated));
  } catch (err) {
    next(err);
  }
});

weeklyTeamRouter.post('/merge', async (req, res, next) => {
  try {
    const { sourceId, targetId } = req.body as { sourceId: string; targetId: string };
    if (!sourceId || !targetId) {
      res.status(400).json({ error: 'sourceId and targetId are required' });
      return;
    }
    await mergeTeamMembers(targetId, sourceId);
    const merged = await getTeamMemberById(targetId);
    if (!merged) {
      res.status(404).json({ error: 'Target member not found' });
      return;
    }
    log.info({ sourceId, targetId }, 'Team members merged');
    res.json(entityToTeamMember(merged));
  } catch (err) {
    next(err);
  }
});

weeklyTeamRouter.get('/available-users', async (req, res, next) => {
  try {
    const { getAvailableUsers } = await import('../../weekly/availableUsers');
    const { fetchAvailableUsersFromRepos } = await import('../../weekly/fetchUsers');
    const component = req.query.component as string | undefined;
    const allMembers = await listAllTeamMembers(component);
    const mappedGithub = new Set(allMembers.map(member => member.github_username).filter(Boolean));
    const mappedGitlab = new Set(allMembers.map(member => member.gitlab_username).filter(Boolean));

    let available = getAvailableUsers();
    if (available.githubUsers.length === 0 && available.gitlabUsers.length === 0) {
      available = await fetchAvailableUsersFromRepos();
    }

    res.json({
      githubUsers: available.githubUsers.filter(user => !mappedGithub.has(user)),
      gitlabUsers: available.gitlabUsers.filter(user => !mappedGitlab.has(user)),
    });
  } catch (err) {
    next(err);
  }
});

weeklyTeamRouter.post('/restore-deleted', async (_req, res, next) => {
  try {
    const { AppDataSource } = await import('../../db/data-source');
    const { TeamMemberEntity } = await import('../../db/entities/TeamMemberEntity');
    const result = await AppDataSource.getRepository(TeamMemberEntity).update(
      { is_active: false },
      { is_active: true },
    );
    const restored = result.affected ?? 0;
    log.info({ restored }, 'Restored deleted team members');
    res.json({ restored });
  } catch (err) {
    next(err);
  }
});

weeklyTeamRouter.delete('/:memberId', async (req, res, next) => {
  try {
    const memberId = req.params.memberId;
    const hard = req.query.hard === 'true';

    if (hard) {
      const deleted = await hardDeleteTeamMember(memberId);
      if (!deleted) {
        res.status(404).json({ error: 'Team member not found' });
        return;
      }
      log.info({ id: memberId }, 'Team member permanently deleted');
    } else {
      await softDeleteTeamMember(memberId);
      log.info({ id: memberId }, 'Team member deactivated');
    }
    res.json({ hard, success: true });
  } catch (err) {
    next(err);
  }
});
