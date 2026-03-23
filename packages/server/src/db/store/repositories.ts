import { AppDataSource } from '../data-source';
import { Repository } from '../entities/Repository';

const repos = () => AppDataSource.getRepository(Repository);

export const getAllRepositories = async (): Promise<Repository[]> => {
  return repos().find({ order: { name: 'ASC' } });
};

export const getEnabledRepositories = async (): Promise<Repository[]> => {
  return repos().find({ where: { enabled: true }, order: { name: 'ASC' } });
};

export const getRepositoryById = async (id: string): Promise<Repository | null> => {
  return repos().findOneBy({ id });
};

export const getRepositoriesByComponent = async (component: string): Promise<Repository[]> => {
  const all = await getEnabledRepositories();
  return all.filter(r => (r.components as unknown as string[]).includes(component));
};

export const createRepository = async (data: Partial<Repository>): Promise<Repository> => {
  const entity = repos().create(data);
  return repos().save(entity);
};

export const updateRepository = async (id: string, data: Partial<Repository>): Promise<Repository | null> => {
  const existing = await repos().findOneBy({ id });
  if (!existing) return null;
  Object.assign(existing, data);
  existing.updated_at = new Date();
  return repos().save(existing);
};

export const deleteRepository = async (id: string): Promise<boolean> => {
  const result = await repos().delete({ id });
  return (result.affected ?? 0) > 0;
};
