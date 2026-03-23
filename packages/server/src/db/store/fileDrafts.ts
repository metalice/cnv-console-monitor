import { AppDataSource } from '../data-source';
import { FileDraft } from '../entities/FileDraft';

const drafts = () => AppDataSource.getRepository(FileDraft);

export const getDraft = async (userEmail: string, repoId: string, branch: string, filePath: string): Promise<FileDraft | null> => {
  return drafts().findOneBy({ user_email: userEmail, repo_id: repoId, branch, file_path: filePath });
};

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
  return drafts().save(drafts().create({
    user_email: data.userEmail,
    repo_id: data.repoId,
    branch: data.branch,
    file_path: data.filePath,
    original_content: data.originalContent,
    draft_content: data.draftContent,
    base_commit_sha: data.baseCommitSha,
    status: 'pending',
  }));
};

export const deleteDraft = async (userEmail: string, draftId: string): Promise<boolean> => {
  const result = await drafts().delete({ id: draftId, user_email: userEmail });
  return (result.affected ?? 0) > 0;
};

export const deleteDraftByPath = async (userEmail: string, repoId: string, branch: string, filePath: string): Promise<boolean> => {
  const result = await drafts().delete({ user_email: userEmail, repo_id: repoId, branch, file_path: filePath });
  return (result.affected ?? 0) > 0;
};

export const getUserDrafts = async (userEmail: string, status = 'pending'): Promise<FileDraft[]> => {
  return drafts().find({
    where: { user_email: userEmail, status },
    order: { updated_at: 'DESC' },
  });
};

export const getUserDraftPaths = async (userEmail: string): Promise<string[]> => {
  const rows = await drafts().find({
    where: { user_email: userEmail, status: 'pending' as string },
    select: ['file_path'],
  });
  return rows.map(r => r.file_path);
};

export const getUserDraftCount = async (userEmail: string): Promise<number> => {
  return drafts().count({ where: { user_email: userEmail, status: 'pending' as string } });
};

export const markDraftsSubmitting = async (userEmail: string, draftIds: string[]): Promise<void> => {
  await drafts().createQueryBuilder().update().set({ status: 'submitting' }).where('user_email = :userEmail AND id IN (:...ids)', { userEmail, ids: draftIds }).execute();
};

export const markDraftsPending = async (userEmail: string, draftIds: string[]): Promise<void> => {
  await drafts().createQueryBuilder().update().set({ status: 'pending' }).where('user_email = :userEmail AND id IN (:...ids)', { userEmail, ids: draftIds }).execute();
};

export const deleteDraftsById = async (userEmail: string, draftIds: string[]): Promise<void> => {
  await drafts().createQueryBuilder().delete().where('user_email = :userEmail AND id IN (:...ids)', { userEmail, ids: draftIds }).execute();
};
