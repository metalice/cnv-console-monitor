import { AppDataSource } from '../data-source';
import { FileDraft } from '../entities/FileDraft';

const drafts = () => AppDataSource.getRepository(FileDraft);

export const getDraft = async (
  userEmail: string,
  repoId: string,
  branch: string,
  filePath: string,
): Promise<FileDraft | null> =>
  drafts().findOneBy({ branch, file_path: filePath, repo_id: repoId, user_email: userEmail });

export const saveDraft = async (data: {
  userEmail: string;
  repoId: string;
  branch: string;
  filePath: string;
  originalContent: string;
  draftContent: string;
  baseCommitSha: string;
}): Promise<FileDraft> => {
  const existing = await getDraft(data.userEmail, data.repoId, data.branch, data.filePath);
  if (existing) {
    existing.draft_content = data.draftContent;
    existing.updated_at = new Date();
    if (existing.status === 'conflict' || existing.status === 'submitted') {
      existing.status = 'pending';
    }
    return drafts().save(existing);
  }
  return drafts().save(
    drafts().create({
      base_commit_sha: data.baseCommitSha,
      branch: data.branch,
      draft_content: data.draftContent,
      file_path: data.filePath,
      original_content: data.originalContent,
      repo_id: data.repoId,
      status: 'pending',
      user_email: data.userEmail,
    }),
  );
};

export const deleteDraft = async (userEmail: string, draftId: string): Promise<boolean> => {
  const result = await drafts().delete({ id: draftId, user_email: userEmail });
  return (result.affected ?? 0) > 0;
};

export const deleteDraftByPath = async (
  userEmail: string,
  repoId: string,
  branch: string,
  filePath: string,
): Promise<boolean> => {
  const result = await drafts().delete({
    branch,
    file_path: filePath,
    repo_id: repoId,
    user_email: userEmail,
  });
  return (result.affected ?? 0) > 0;
};

export const getUserDrafts = async (userEmail: string, status = 'pending'): Promise<FileDraft[]> =>
  drafts().find({
    order: { updated_at: 'DESC' },
    where: { status, user_email: userEmail },
  });

export const getUserDraftPaths = async (userEmail: string): Promise<string[]> => {
  const rows = await drafts().find({
    select: ['file_path'],
    where: { status: 'pending' as string, user_email: userEmail },
  });
  return rows.map(r => r.file_path);
};

export const getUserDraftCount = async (userEmail: string): Promise<number> =>
  drafts().count({ where: { status: 'pending' as string, user_email: userEmail } });

export const markDraftsSubmitting = async (
  userEmail: string,
  draftIds: string[],
): Promise<void> => {
  await drafts()
    .createQueryBuilder()
    .update()
    .set({ status: 'submitting' })
    .where('user_email = :userEmail AND id IN (:...ids)', { ids: draftIds, userEmail })
    .execute();
};

export const markDraftsPending = async (userEmail: string, draftIds: string[]): Promise<void> => {
  await drafts()
    .createQueryBuilder()
    .update()
    .set({ status: 'pending' })
    .where('user_email = :userEmail AND id IN (:...ids)', { ids: draftIds, userEmail })
    .execute();
};

export const deleteDraftsById = async (userEmail: string, draftIds: string[]): Promise<void> => {
  await drafts()
    .createQueryBuilder()
    .delete()
    .where('user_email = :userEmail AND id IN (:...ids)', { ids: draftIds, userEmail })
    .execute();
};
