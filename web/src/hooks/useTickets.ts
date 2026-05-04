import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { TicketStatus, TicketPriority } from '../types/database.types';

export interface Ticket {
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
  cost_center_id: string | null;
  deadline_at: string | null;
  resolved_at: string | null;
  sla_breached: boolean;
  estimated_cost: number | null;
  approved_cost: number | null;
  actual_cost: number | null;
  cost_notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  requester?: { email: string } | null;
  assignee?: { email: string } | null;
  team?: { name: string } | null;
  cost_center?: { name: string; code: string } | null;
  attachments?: { id: string; file_url: string; created_at: string }[];
  ticket_logs?: { id: string; action: string; created_at: string; profiles?: { email: string } | null }[];
}

export type TicketInsert = Pick<
  Ticket,
  'institution_id' | 'title' | 'description' | 'priority' | 'category' | 'user_id' | 'team_id' | 'cost_center_id'
>;

export type TicketFilters = {
  status?: TicketStatus;
  priority?: TicketPriority;
  slaBreached?: boolean;
  search?: string;
};

export function useTickets(filters?: TicketFilters) {
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: async () => {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          requester:profiles!tickets_user_id_fkey(email),
          assignee:profiles!tickets_assigned_to_fkey(email),
          team:teams(name),
          cost_center:cost_centers(name, code)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.priority) query = query.eq('priority', filters.priority);
      if (filters?.slaBreached !== undefined) query = query.eq('sla_breached', filters.slaBreached);
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Ticket[];
    },
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ['tickets', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          requester:profiles!tickets_user_id_fkey(email),
          assignee:profiles!tickets_assigned_to_fkey(email),
          team:teams(name),
          cost_center:cost_centers(name, code),
          attachments(id, file_url, created_at),
          ticket_logs(id, action, created_at, profiles(email))
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Ticket;
    },
    enabled: !!id,
  });
}

export function useTicketStats() {
  return useQuery({
    queryKey: ['tickets', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('status, sla_breached, priority, created_at, resolved_at');
      if (error) throw error;

      // Basic counts
      const total = data.length;
      const open = data.filter((t) => t.status === 'OPEN').length;
      const inProgress = data.filter((t) => t.status === 'IN_PROGRESS').length;
      const resolved = data.filter((t) => t.status === 'RESOLVED').length;
      const canceled = data.filter((t) => t.status === 'CANCELED').length;
      const slaBreached = data.filter((t) => t.sla_breached).length;
      const critical = data.filter(
        (t) => t.priority === 'CRITICAL' && t.status !== 'RESOLVED' && t.status !== 'CANCELED'
      ).length;

      // Resolution rate %
      const closedTotal = resolved + canceled;
      const resolutionRate = total > 0 ? Math.round((closedTotal / total) * 100) : 0;

      // Average resolution time (hours) for resolved tickets
      const resolvedWithTime = data.filter(
        (t) => t.status === 'RESOLVED' && t.resolved_at && t.created_at
      );
      const avgResolutionHours =
        resolvedWithTime.length > 0
          ? Math.round(
              resolvedWithTime.reduce((acc, t) => {
                const diff =
                  new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime();
                return acc + diff / 3_600_000;
              }, 0) / resolvedWithTime.length
            )
          : 0;

      // Priority distribution for donut chart
      const byPriority = [
        { name: 'Crítica', value: data.filter((t) => t.priority === 'CRITICAL').length, fill: '#dc2626' },
        { name: 'Alta', value: data.filter((t) => t.priority === 'HIGH').length, fill: '#ea580c' },
        { name: 'Média', value: data.filter((t) => t.priority === 'MEDIUM').length, fill: '#0ea5e9' },
        { name: 'Baixa', value: data.filter((t) => t.priority === 'LOW').length, fill: '#22c55e' },
      ];

      // Status distribution for bar chart
      const byStatus = [
        { name: 'Abertos', value: open, fill: '#3b82f6' },
        { name: 'Em Andamento', value: inProgress, fill: '#f59e0b' },
        { name: 'Resolvidos', value: resolved, fill: '#10b981' },
        { name: 'Cancelados', value: canceled, fill: '#94a3b8' },
      ];

      // Monthly trend — last 6 months
      const now = new Date();
      const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const label = d.toLocaleString('pt-BR', { month: 'short' });
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const abertos = data.filter(
          (t) => t.created_at.startsWith(monthStr) && t.status !== 'CANCELED'
        ).length;
        const resolvidos = data.filter(
          (t) => t.resolved_at?.startsWith(monthStr)
        ).length;
        return { label, abertos, resolvidos };
      });

      return {
        total,
        open,
        inProgress,
        resolved,
        canceled,
        slaBreached,
        critical,
        resolutionRate,
        avgResolutionHours,
        byPriority,
        byStatus,
        monthlyTrend,
      };
    },
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticket: TicketInsert) => {
      const { data, error } = await supabase
        .from('tickets')
        .insert(ticket)
        .select()
        .single();
      if (error) throw error;
      return data as Ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Ticket> & { id: string }) => {
      const { error } = await supabase
        .from('tickets')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}
