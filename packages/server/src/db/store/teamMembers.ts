import { AppDataSource } from '../data-source';
import { PersonReportEntity } from '../entities/PersonReportEntity';
import { TeamMemberEntity } from '../entities/TeamMemberEntity';

const repo = () => AppDataSource.getRepository(TeamMemberEntity);

export const listActiveTeamMembers = async (component?: string): Promise<TeamMemberEntity[]> => {
  const query = repo()
    .createQueryBuilder('tm')
    .where('tm.is_active = :active', { active: true })
    .andWhere('tm.jira_account_id IS NOT NULL')
    .orderBy('tm.display_name', 'ASC');

  if (component) {
    query.andWhere('tm.component = :component', { component });
  }

  return query.getMany();
};

export const listAllTeamMembers = async (component?: string): Promise<TeamMemberEntity[]> => {
  const query = repo().createQueryBuilder('tm').orderBy('tm.display_name', 'ASC');

  if (component) {
    query.where('tm.component = :component', { component });
  }

  return query.getMany();
};

export const findTeamMemberByGithub = async (
  username: string,
): Promise<TeamMemberEntity | null> => {
  return repo().findOneBy({ github_username: username });
};

export const findTeamMemberByGitlab = async (
  username: string,
): Promise<TeamMemberEntity | null> => {
  return repo().findOneBy({ gitlab_username: username });
};

export const findTeamMemberByJira = async (accountId: string): Promise<TeamMemberEntity | null> => {
  return repo().findOneBy({ jira_account_id: accountId });
};

const normalizeName = (name: string): string => name.toLowerCase().replace(/[\s\-._]/g, '');

export const findTeamMemberByNormalizedName = async (
  displayName: string,
): Promise<TeamMemberEntity | null> => {
  const all = await repo().find({ where: { is_active: true } });
  const normalized = normalizeName(displayName);
  return all.find(member => normalizeName(member.display_name) === normalized) ?? null;
};

export const createTeamMember = async (data: {
  aiMapped?: boolean;
  component?: string | null;
  displayName: string;
  email?: string | null;
  githubUsername?: string | null;
  gitlabUsername?: string | null;
  jiraAccountId?: string | null;
  mappingConfidence?: number | null;
}): Promise<TeamMemberEntity> => {
  const entity = repo().create({
    ai_mapped: data.aiMapped ?? false,
    component: data.component ?? null,
    display_name: data.displayName,
    email: data.email ?? null,
    github_username: data.githubUsername ?? null,
    gitlab_username: data.gitlabUsername ?? null,
    is_active: true,
    jira_account_id: data.jiraAccountId ?? null,
    mapping_confidence: data.mappingConfidence ?? null,
  });
  return repo().save(entity);
};

export const updateTeamMember = async (
  id: string,
  data: Partial<{
    aiMapped: boolean;
    component: string | null;
    displayName: string;
    email: string | null;
    githubUsername: string | null;
    gitlabUsername: string | null;
    isActive: boolean;
    jiraAccountId: string | null;
    mappingConfidence: number | null;
  }>,
): Promise<void> => {
  const updates: Partial<TeamMemberEntity> = {};
  if (data.displayName !== undefined) updates.display_name = data.displayName;
  if (data.email !== undefined) updates.email = data.email;
  if (data.githubUsername !== undefined) updates.github_username = data.githubUsername;
  if (data.gitlabUsername !== undefined) updates.gitlab_username = data.gitlabUsername;
  if (data.jiraAccountId !== undefined) updates.jira_account_id = data.jiraAccountId;
  if (data.component !== undefined) updates.component = data.component;
  if (data.isActive !== undefined) updates.is_active = data.isActive;
  if (data.aiMapped !== undefined) updates.ai_mapped = data.aiMapped;
  if (data.mappingConfidence !== undefined) updates.mapping_confidence = data.mappingConfidence;
  await repo().update({ id }, updates);
};

export const softDeleteTeamMember = async (id: string): Promise<void> => {
  await repo().update({ id }, { is_active: false });
};

export const mergeTeamMembers = async (targetId: string, sourceId: string): Promise<void> => {
  const target = await repo().findOneBy({ id: targetId });
  const source = await repo().findOneBy({ id: sourceId });
  if (!target || !source) {
    throw new Error('Team member not found');
  }

  if (source.github_username && !target.github_username) {
    target.github_username = source.github_username;
  }
  if (source.gitlab_username && !target.gitlab_username) {
    target.gitlab_username = source.gitlab_username;
  }
  if (source.jira_account_id && !target.jira_account_id) {
    target.jira_account_id = source.jira_account_id;
  }
  if (source.email && !target.email) {
    target.email = source.email;
  }

  await repo().save(target);

  const personReportRepo = AppDataSource.getRepository(PersonReportEntity);
  await personReportRepo.update({ member_id: sourceId }, { member_id: targetId });

  source.is_active = false;
  source.github_username = null;
  source.gitlab_username = null;
  source.jira_account_id = null;
  await repo().save(source);
};

export const getTeamMemberById = async (id: string): Promise<TeamMemberEntity | null> => {
  return repo().findOneBy({ id });
};

export const upsertTeamMemberByGithub = async (
  githubUsername: string,
  displayName: string,
  data?: {
    aiMapped?: boolean;
    component?: string | null;
    mappingConfidence?: number | null;
  },
): Promise<TeamMemberEntity> => {
  const existing = await findTeamMemberByGithub(githubUsername);
  if (existing) return existing;

  return createTeamMember({
    aiMapped: data?.aiMapped,
    component: data?.component,
    displayName,
    githubUsername,
    mappingConfidence: data?.mappingConfidence,
  });
};
