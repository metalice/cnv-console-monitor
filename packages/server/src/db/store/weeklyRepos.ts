import { type WeeklyRepo } from '@cnv-monitor/shared';

import { AppDataSource } from '../data-source';
import { WeeklyRepoEntity } from '../entities/WeeklyRepoEntity';

const repo = () => AppDataSource.getRepository(WeeklyRepoEntity);

const entityToWeeklyRepo = (entity: WeeklyRepoEntity): WeeklyRepo => ({
  component: entity.component,
  createdAt: entity.created_at?.toISOString() ?? null,
  enabled: entity.enabled,
  id: entity.id,
  name: entity.name,
  provider: entity.provider as 'github' | 'gitlab',
  updatedAt: entity.updated_at?.toISOString() ?? null,
  url: entity.url,
});

export const getAllWeeklyRepos = async (): Promise<WeeklyRepo[]> => {
  const entities = await repo().find({ order: { component: 'ASC', name: 'ASC' } });
  return entities.map(entityToWeeklyRepo);
};

export const getEnabledWeeklyRepos = async (): Promise<WeeklyRepo[]> => {
  const entities = await repo().find({
    order: { component: 'ASC', name: 'ASC' },
    where: { enabled: true },
  });
  return entities.map(entityToWeeklyRepo);
};

export const getWeeklyReposByComponent = async (component: string): Promise<WeeklyRepo[]> => {
  const entities = await repo().find({
    order: { name: 'ASC' },
    where: { component, enabled: true },
  });
  return entities.map(entityToWeeklyRepo);
};

export const createWeeklyRepo = async (data: {
  component: string;
  enabled?: boolean;
  name: string;
  provider: string;
  url: string;
}): Promise<WeeklyRepo> => {
  const entity = repo().create({
    component: data.component,
    enabled: data.enabled ?? true,
    name: data.name,
    provider: data.provider,
    url: data.url,
  });
  const saved = await repo().save(entity);
  return entityToWeeklyRepo(saved);
};

export const updateWeeklyRepo = async (
  id: string,
  data: Partial<{
    component: string;
    enabled: boolean;
    name: string;
    provider: string;
    url: string;
  }>,
): Promise<WeeklyRepo | null> => {
  const entity = await repo().findOneBy({ id });
  if (!entity) return null;

  if (data.name !== undefined) entity.name = data.name;
  if (data.component !== undefined) entity.component = data.component;
  if (data.provider !== undefined) entity.provider = data.provider;
  if (data.url !== undefined) entity.url = data.url;
  if (data.enabled !== undefined) entity.enabled = data.enabled;

  const saved = await repo().save(entity);
  return entityToWeeklyRepo(saved);
};

export const deleteWeeklyRepo = async (id: string): Promise<void> => {
  await repo().delete({ id });
};
