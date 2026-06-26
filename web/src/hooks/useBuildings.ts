import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface Building {
  id: string;
  institution_id: string;
  name: string;
  total_m2: number;
  floors: number;
  created_at: string;
  updated_at: string;
}

export type BuildingInsert = Omit<Building, 'id' | 'created_at' | 'updated_at'>;

export function useBuildings(institutionId?: string | null) {
  return useQuery({
    queryKey: ['buildings', institutionId],
    queryFn: async () => {
      let query = supabase
        .from('buildings')
        .select('*')
        .order('name', { ascending: true });

      if (institutionId) {
        query = query.eq('institution_id', institutionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Building[];
    },
    enabled: institutionId !== undefined,
  });
}

export function useCreateBuilding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (building: BuildingInsert) => {
      const { data, error } = await supabase
        .from('buildings')
        .insert(building)
        .select()
        .single();
      if (error) throw error;
      return data as Building;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buildings', variables.institution_id] });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
    },
  });
}

export function useUpdateBuilding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Building> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from('buildings')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return updated as Building;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['buildings', data.institution_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
    },
  });
}

export function useDeleteBuilding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, institutionId }: { id: string; institutionId: string }) => {
      const { error } = await supabase.from('buildings').delete().eq('id', id);
      if (error) throw error;
      return { id, institutionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['buildings', data.institutionId] });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
    },
  });
}
