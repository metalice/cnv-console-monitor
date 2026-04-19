import { type TeamMemberCreate, type TeamMemberUpdate } from '@cnv-monitor/shared';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createTeamMember,
  deleteTeamMember,
  fetchTeamMembers,
  updateTeamMember,
} from '../api/reportTeam';
import { useComponentFilter } from '../context/ComponentFilterContext';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export const useTeamMembers = ({ includeInactive = true } = {}) => {
  const { selectedComponent } = useComponentFilter();
  return useQuery({
    queryFn: () => fetchTeamMembers(selectedComponent, includeInactive),
    queryKey: ['reportTeam', selectedComponent, includeInactive],
    staleTime: FIVE_MINUTES_MS,
  });
};

export const useCreateTeamMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TeamMemberCreate) => createTeamMember(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reportTeam'] });
    },
  });
};

export const useUpdateTeamMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, id }: { data: TeamMemberUpdate; id: string }) =>
      updateTeamMember(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reportTeam'] });
    },
  });
};

export const useDeleteTeamMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => deleteTeamMember(memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reportTeam'] });
    },
  });
};
