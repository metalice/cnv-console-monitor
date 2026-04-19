import { type ReportRepo } from '@cnv-monitor/shared';

import { AppDataSource } from '../data-source';
import { RepoConfigEntity } from '../entities/RepoConfigEntity';

const repo = () => AppDataSource.getRepository(RepoConfigEntity);

const entityToRepoConfig = (entity: RepoConfigEntity): ReportRepo => ({
  component: entity.component,
  createdAt: entity.created_at.toISOString(),
  enabled: entity.enabled,
  id: entity.id,
  name: entity.name,
  provider: entity.provider as 'github' | 'gitlab',
  updatedAt: entity.updated_at.toISOString(),
  url: entity.url,
});

export const getAllReportRepos = async (): Promise<ReportRepo[]> => {
  const entities = await repo().find({ order: { component: 'ASC', name: 'ASC' } });
  return entities.map(entityToRepoConfig);
};

export const getEnabledReportRepos = async (): Promise<ReportRepo[]> => {
  const entities = await repo().find({
    order: { component: 'ASC', name: 'ASC' },
    where: { enabled: true },
  });
  return entities.map(entityToRepoConfig);
};

export const getReportReposByComponent = async (component: string): Promise<ReportRepo[]> => {
  const entities = await repo().find({
    order: { name: 'ASC' },
    where: { component, enabled: true },
  });
  return entities.map(entityToRepoConfig);
};

export const createReportRepo = async (data: {
  component: string;
  enabled?: boolean;
  name: string;
  provider: string;
  url: string;
}): Promise<ReportRepo> => {
  const entity = repo().create({
    component: data.component,
    enabled: data.enabled ?? true,
    name: data.name,
    provider: data.provider,
    url: data.url,
  });
  const saved = await repo().save(entity);
  return entityToRepoConfig(saved);
};

export const updateReportRepo = async (
  id: string,
  data: Partial<{
    component: string;
    enabled: boolean;
    name: string;
    provider: string;
    url: string;
  }>,
): Promise<ReportRepo | null> => {
  const entity = await repo().findOneBy({ id });
  if (!entity) return null;

  if (data.name !== undefined) entity.name = data.name;
  if (data.component !== undefined) entity.component = data.component;
  if (data.provider !== undefined) entity.provider = data.provider;
  if (data.url !== undefined) entity.url = data.url;
  if (data.enabled !== undefined) entity.enabled = data.enabled;

  const saved = await repo().save(entity);
  return entityToRepoConfig(saved);
};

export const deleteReportRepo = async (id: string): Promise<void> => {
  await repo().delete({ id });
};
