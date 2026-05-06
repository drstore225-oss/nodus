import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { TicketPriority } from '../types/database.types';

export type MaintenanceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface MaintenancePlan {
  id: string;
  institution_id: string;
  title: string;
  description: string | null;
  priority: TicketPriority;
  category: string | null;
  assigned_to: string | null;
  team_id: string | null;
  cost_center_id: string | null;
  frequency: MaintenanceFrequency;
  is_active: boolean;
  last_generated_at: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  assignee?: { email: string } | null;
  team?: { name: string } | null;
  cost_center?: { name: string; code: string } | null;
  maintenance_plan_checklists?: { id: string; item_text: string; created_at: string }[];
}

export type MaintenancePlanInsert = Pick<
  MaintenancePlan,
  'institution_id' | 'title' | 'description' | 'priority' | 'category' | 'assigned_to' | 'team_id' | 'cost_center_id' | 'frequency' | 'is_active'
>;

export function useMaintenancePlans() {
  return useQuery({
    queryKey: ['maintenance_plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_plans')
        .select(`
          *,
          assignee:profiles!maintenance_plans_assigned_to_fkey(email),
          team:teams(name),
          cost_center:cost_centers(name, code),
          maintenance_plan_checklists(id, item_text, created_at)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MaintenancePlan[];
    },
  });
}

export function useCreateMaintenancePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (plan: MaintenancePlanInsert) => {
      const { data, error } = await supabase
        .from('maintenance_plans')
        .insert(plan)
        .select()
        .single();
      if (error) throw error;
      return data as MaintenancePlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_plans'] });
    },
  });
}

export function useUpdateMaintenancePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<MaintenancePlan> & { id: string }) => {
      const { error } = await supabase
        .from('maintenance_plans')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_plans'] });
    },
  });
}

export function useDeleteMaintenancePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('maintenance_plans')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_plans'] });
    },
  });
}

export function useCreatePlanChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ plan_id, item_text }: { plan_id: string; item_text: string }) => {
      const { error } = await supabase
        .from('maintenance_plan_checklists')
        .insert({ plan_id, item_text });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_plans'] });
    },
  });
}

export function useDeletePlanChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('maintenance_plan_checklists')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_plans'] });
    },
  });
}
