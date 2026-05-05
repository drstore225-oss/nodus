import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketType = 'CORRECTIVE' | 'PREVENTIVE';

export interface TicketChecklist {
  id: string;
  item_text: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  profiles?: { email: string } | null;
}

export interface MobileTicket {
  id: string;
  institution_id: string;
  title: string;
  description: string | null;
  ticket_type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  user_id: string;
  assigned_to: string | null;
  team_id: string | null;
  scheduled_at: string | null;
  deadline_at: string | null;
  resolved_at: string | null;
  public_observation: string | null;
  sla_breached: boolean;
  estimated_cost: number | null;
  actual_cost: number | null;
  created_at: string;
  requester?: { email: string } | null;
  team?: { name: string } | null;
  ticket_checklists?: TicketChecklist[];
}

export function useMyTickets(userId: string | undefined) {
  return useQuery({
    queryKey: ['mobile-tickets', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          requester:profiles!tickets_user_id_fkey(email),
          team:teams(name)
        `)
        .or(`assigned_to.eq.${userId},user_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MobileTicket[];
    },
    enabled: !!userId,
  });
}

export function useTicketById(id: string) {
  return useQuery({
    queryKey: ['mobile-ticket', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          requester:profiles!tickets_user_id_fkey(email),
          team:teams(name),
          ticket_checklists(id, item_text, is_completed, completed_at, completed_by, profiles!ticket_checklists_completed_by_fkey(email))
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as MobileTicket;
    },
    enabled: !!id,
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TicketStatus }) => {
      const { error } = await supabase
        .from('tickets')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['mobile-ticket'] });
    },
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from('ticket_checklists')
        .update({
          is_completed,
          completed_at: is_completed ? new Date().toISOString() : null,
          completed_by: is_completed ? (await supabase.auth.getUser()).data.user?.id : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-ticket'] });
    },
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticket: Partial<MobileTicket>) => {
      const { data, error } = await supabase
        .from('tickets')
        .insert(ticket)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-tickets'] });
    },
  });
}
