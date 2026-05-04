import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface CostCenter {
  id: string;
  institution_id: string;
  code: string;
  name: string;
  created_at: string;
  institution?: { fantasy_name: string } | null;
}

export function useCostCenters(institutionId?: string) {
  return useQuery({
    queryKey: ['cost_centers', institutionId],
    queryFn: async () => {
      let query = supabase
        .from('cost_centers')
        .select('*, institution:institutions(fantasy_name)')
        .order('code');
      if (institutionId) query = query.eq('institution_id', institutionId);
      const { data, error } = await query;
      if (error) throw error;
      return data as CostCenter[];
    },
  });
}

export function useCreateCostCenter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cc: { name: string; code: string; institution_id: string }) => {
      const { data, error } = await supabase.from('cost_centers').insert(cc).select().single();
      if (error) throw error;
      return data as CostCenter;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cost_centers'] }),
  });
}

export function useUpdateCostCenter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, code }: { id: string; name: string; code: string }) => {
      const { error } = await supabase.from('cost_centers').update({ name, code }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cost_centers'] }),
  });
}

export function useDeleteCostCenter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cost_centers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cost_centers'] }),
  });
}
