import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Institution } from '../types/database.types';

export type InstitutionInsert = Omit<Institution, 'id' | 'created_at'>;

export function useInstitutions() {
  return useQuery({
    queryKey: ['institutions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('fantasy_name');
      if (error) throw error;
      return data as Institution[];
    },
  });
}

export function useInstitution(id: string) {
  return useQuery({
    queryKey: ['institutions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Institution;
    },
    enabled: !!id,
  });
}

export function useCreateInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (institution: InstitutionInsert) => {
      const { data, error } = await supabase
        .from('institutions')
        .insert(institution)
        .select()
        .single();
      if (error) throw error;
      return data as Institution;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
  });
}

export function useUpdateInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Institution> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from('institutions')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return updated as Institution;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
  });
}

export function useDeleteInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('institutions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
    },
  });
}
