import { AppDataSource } from '../data-source';
import { EditActivity } from '../entities/EditActivity';

const editActivities = () => AppDataSource.getRepository(EditActivity);

export const logEditActivity = async (data: {
  actor: string;
  action: string;
  filePath: string;
  repoId?: string;
  details?: Record<string, unknown>;
}): Promise<void> => {
  const entry = editActivities().create({
    actor: data.actor,
    action: data.action,
    file_path: data.filePath,
    repo_id: data.repoId || null,
  });
  (entry as unknown as Record<string, unknown>).details = data.details || null;
  await editActivities().save(entry);
};

export const getEditActivities = async (filters: {
  actor?: string;
  action?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ items: EditActivity[]; total: number }> => {
  const where: Record<string, unknown> = {};
  if (filters.actor) where.actor = filters.actor;
  if (filters.action) where.action = filters.action;

  const [items, total] = await editActivities().findAndCount({
    where,
    order: { created_at: 'DESC' },
    take: filters.limit ?? 50,
    skip: filters.offset ?? 0,
  });
  return { items, total };
};
