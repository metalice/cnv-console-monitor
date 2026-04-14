import { type TeamMemberCreate, type TeamMemberUpdate } from '@cnv-monitor/shared';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createTeamMember,
  deleteTeamMember,
  fetchTeamMembers,
  updateTeamMember,
} from '../api/weeklyTeam';
import { useComponentFilter } from '../context/ComponentFilterContext';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export const useTeamMembers = () => {
  const { selectedComponent } = useComponentFilter();
  return useQuery({
    queryFn: () => fetchTeamMembers(selectedComponent),
    queryKey: ['weeklyTeam', selectedComponent],
    staleTime: FIVE_MINUTES_MS,
  });
};

export const useCreateTeamMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TeamMemberCreate) => createTeamMember(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['weeklyTeam'] });
    },
  });
};

export const useUpdateTeamMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, id }: { data: TeamMemberUpdate; id: string }) =>
      updateTeamMember(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['weeklyTeam'] });
    },
  });
};

export const useDeleteTeamMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => deleteTeamMember(memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['weeklyTeam'] });
    },
  });
};
