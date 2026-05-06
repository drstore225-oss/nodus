import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types/database.types';

export interface ProfileWithTeam extends Profile {
  team?: { name: string } | null;
  institution?: { fantasy_name: string } | null;
}

export function useUsers(institutionId?: string) {
  return useQuery({
    queryKey: ['users', institutionId],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*, team:teams(name), institution:institutions(fantasy_name)')
        .order('email');
      if (institutionId) {
        query = query.eq('institution_id', institutionId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as ProfileWithTeam[];
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      role,
      teamId,
      institutionId,
    }: {
      userId: string;
      role: UserRole;
      teamId?: string | null;
      institutionId?: string | null;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          role,
          team_id: teamId,
          institution_id: institutionId,
        })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
