import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface MobileTicket {
  id: string;
  institution_id: string;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  user_id: string;
  assigned_to: string | null;
  team_id: string | null;
  deadline_at: string | null;
  resolved_at: string | null;
  sla_breached: boolean;
  estimated_cost: number | null;
  actual_cost: number | null;
  created_at: string;
  requester?: { email: string } | null;
  team?: { name: string } | null;
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
          team:teams(name)
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
