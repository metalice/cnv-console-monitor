import { AppDataSource } from '../data-source';
import { RepoFile } from '../entities/RepoFile';

const repoFiles = () => AppDataSource.getRepository(RepoFile);

export const getFilesByRepo = async (repoId: string, branch = 'main'): Promise<RepoFile[]> =>
  repoFiles().find({ order: { file_path: 'ASC' }, where: { branch, repo_id: repoId } });

export const getFilesByType = async (
  repoId: string,
  fileType: string,
  branch = 'main',
): Promise<RepoFile[]> =>
  repoFiles().find({
    order: { file_path: 'ASC' },
    where: { branch, file_type: fileType, repo_id: repoId },
  });

export const getFileByPath = async (
  repoId: string,
  branch: string,
  filePath: string,
): Promise<RepoFile | null> =>
  repoFiles().findOneBy({ branch, file_path: filePath, repo_id: repoId });

export const upsertRepoFile = async (data: Partial<RepoFile>): Promise<RepoFile> => {
  const existing =
    data.repo_id && data.branch && data.file_path
      ? await repoFiles().findOneBy({
          branch: data.branch,
          file_path: data.file_path,
          repo_id: data.repo_id,
        })
      : null;

  if (existing) {
    Object.assign(existing, data);
    existing.last_synced_at = new Date();
    return repoFiles().save(existing);
  }

  const entity = repoFiles().create(data);
  return repoFiles().save(entity);
};

export const updateFileCounterpart = async (
  id: string,
  counterpartId: string | null,
): Promise<void> => {
  await repoFiles().update({ id }, { counterpart_id: counterpartId });
};

export const clearRepoFiles = async (repoId: string, branch?: string): Promise<number> => {
  const where: Record<string, unknown> = { repo_id: repoId };
  if (branch) {
    where.branch = branch;
  }
  const result = await repoFiles().delete(where);
  return result.affected ?? 0;
};

export const getOrphanedDocs = async (repoId: string, branch = 'main'): Promise<RepoFile[]> =>
  repoFiles()
    .createQueryBuilder('f')
    .where('f.repo_id = :repoId', { repoId })
    .andWhere('f.branch = :branch', { branch })
    .andWhere('f.file_type = :type', { type: 'doc' })
    .andWhere('f.counterpart_id IS NULL')
    .orderBy('f.file_path', 'ASC')
    .getMany();

export const getUndocumentedTests = async (repoId: string, branch = 'main'): Promise<RepoFile[]> =>
  repoFiles()
    .createQueryBuilder('f')
    .where('f.repo_id = :repoId', { repoId })
    .andWhere('f.branch = :branch', { branch })
    .andWhere('f.file_type = :type', { type: 'test' })
    .andWhere('f.counterpart_id IS NULL')
    .orderBy('f.file_path', 'ASC')
    .getMany();

export const getRepoFileStats = async (
  repoId: string,
  branch = 'main',
): Promise<{ docs: number; tests: number; matched: number }> => {
  const rows: Record<string, string>[] = await AppDataSource.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE file_type = 'doc') AS docs,
      COUNT(*) FILTER (WHERE file_type = 'test') AS tests,
      COUNT(*) FILTER (WHERE counterpart_id IS NOT NULL) AS matched
    FROM repo_files
    WHERE repo_id = $1 AND branch = $2
  `,
    [repoId, branch],
  );
  const row = rows[0] || {};
  /* eslint-disable @typescript-eslint/no-unnecessary-condition -- defensive: DB aggregate result shape */
  return {
    docs: parseInt(row.docs ?? '0', 10),
    matched: parseInt(row.matched ?? '0', 10),
    tests: parseInt(row.tests ?? '0', 10),
  };
  /* eslint-enable @typescript-eslint/no-unnecessary-condition */
};
