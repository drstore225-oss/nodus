import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface Team {
  id: string;
  name: string;
  institution_id: string;
  created_at: string;
  institution?: { fantasy_name: string } | null;
  _count?: { members: number };
}

export function useTeams(institutionId?: string) {
  return useQuery({
    queryKey: ['teams', institutionId],
    queryFn: async () => {
      let query = supabase
        .from('teams')
        .select('*, institution:institutions(fantasy_name)')
        .order('name');
      if (institutionId) query = query.eq('institution_id', institutionId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Team[];
    },
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (team: { name: string; institution_id: string }) => {
      const { data, error } = await supabase.from('teams').insert(team).select().single();
      if (error) throw error;
      return data as Team;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('teams').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}
