import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type ObraStatus = 'PLANNED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELED';

export interface Obra {
  id: string;
  institution_id: string;
  title: string;
  description: string | null;
  location: string | null;
  status: ObraStatus;
  starts_at: string;
  ends_at: string;
  responsible_name: string | null;
  responsible_contact: string | null;
  executor_type: 'INTERNAL' | 'EXTERNAL';
  materials_budget: string | null;
  public_notes: string | null;
  created_by: string | null;
  building_id?: string | null;
  project_description?: string | null;
  created_at: string;
  updated_at: string;
}

export type ObraInsert = Omit<Obra, 'id' | 'created_at' | 'updated_at'>;

export interface ObraFile {
  id: string;
  obra_id: string;
  file_name: string;
  file_url: string;
  file_type: 'BLUEPRINT' | 'IDEA_GALLERY';
  created_at: string;
}

export type ObraFileInsert = Omit<ObraFile, 'id' | 'created_at'>;

export const obraStatusLabels: Record<ObraStatus, string> = {
  PLANNED: 'Planejada',
  IN_PROGRESS: 'Em Andamento',
  PAUSED: 'Pausada',
  COMPLETED: 'Concluída',
  CANCELED: 'Cancelada',
};

export const obraStatusColors: Record<ObraStatus, { bg: string; text: string; dot: string }> = {
  PLANNED:     { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  IN_PROGRESS: { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  PAUSED:      { bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'bg-slate-400'  },
  COMPLETED:   { bg: 'bg-emerald-100',text: 'text-emerald-700',dot: 'bg-emerald-500'},
  CANCELED:    { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-400'    },
};

export function useObras(institutionId?: string | null) {
  return useQuery({
    queryKey: ['obras', institutionId],
    queryFn: async () => {
      let query = supabase
        .from('obras')
        .select('*')
        .order('starts_at', { ascending: true });

      if (institutionId) {
        query = query.eq('institution_id', institutionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Obra[];
    },
    enabled: institutionId !== undefined,
  });
}

export function useObra(id: string) {
  return useQuery({
    queryKey: ['obras', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obras')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Obra;
    },
    enabled: !!id,
  });
}

export function useCreateObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (obra: ObraInsert) => {
      const { data, error } = await supabase
        .from('obras')
        .insert(obra)
        .select()
        .single();
      if (error) throw error;
      return data as Obra;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}

export function useUpdateObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Obra> & { id: string }) => {
      const { error } = await supabase
        .from('obras')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}

export function useDeleteObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('obras').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}

export function useObraFiles(obraId?: string | null) {
  return useQuery({
    queryKey: ['obra_files', obraId],
    queryFn: async () => {
      if (!obraId) return [];
      const { data, error } = await supabase
        .from('obra_files')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ObraFile[];
    },
    enabled: !!obraId,
  });
}

export function useAddObraFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: ObraFileInsert) => {
      const { data, error } = await supabase
        .from('obra_files')
        .insert(file)
        .select()
        .single();
      if (error) throw error;
      return data as ObraFile;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['obra_files', data.obra_id] });
      }
    },
  });
}

export function useDeleteObraFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, obraId }: { id: string; obraId: string }) => {
      const { error } = await supabase.from('obra_files').delete().eq('id', id);
      if (error) throw error;
      return { id, obraId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['obra_files', data.obraId] });
    },
  });
}
