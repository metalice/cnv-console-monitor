import { type TeamMember, type TeamMemberCreate, type TeamMemberUpdate } from '@cnv-monitor/shared';

import { apiFetch, apiPost } from './client';

const buildQuery = (component?: string): string =>
  component ? `?component=${encodeURIComponent(component)}` : '';

export const fetchTeamMembers = (component?: string): Promise<TeamMember[]> =>
  apiFetch(`/weekly-team${buildQuery(component)}`);

export const createTeamMember = (data: TeamMemberCreate): Promise<TeamMember> =>
  apiPost('/weekly-team', data);

export const updateTeamMember = (memberId: string, data: TeamMemberUpdate): Promise<TeamMember> =>
  apiFetch(`/weekly-team/${memberId}`, {
    body: JSON.stringify(data),
    method: 'PUT',
  });

export const deleteTeamMember = (memberId: string): Promise<{ success: boolean }> =>
  apiFetch(`/weekly-team/${memberId}`, { method: 'DELETE' });

export const restoreDeletedMembers = (): Promise<{ restored: number }> =>
  apiPost('/weekly-team/restore-deleted', {});

export const fetchAvailableUsers = (
  component?: string,
): Promise<{ githubUsers: string[]; gitlabUsers: string[] }> => {
  const query = component ? `?component=${encodeURIComponent(component)}` : '';
  return apiFetch(`/weekly-team/available-users${query}`);
};
