import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { TicketStatus, TicketPriority } from '../types/database.types';

export type TicketType = 'CORRECTIVE' | 'PREVENTIVE';

export interface Ticket {
  id: string;
  institution_id: string;
  title: string;
  description: string | null;
  ticket_type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  user_id: string | null;
  requester_name: string | null;
  requester_email: string | null;
  public_observation: string | null;
  assigned_to: string | null;
  team_id: string | null;
  cost_center_id: string | null;
  scheduled_at: string | null;
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
  ticket_checklists?: { id: string; item_text: string; is_completed: boolean; completed_at: string | null; completed_by: string | null; profiles?: { email: string } | null }[];
}

export type TicketInsert = Pick<
  Ticket,
  'institution_id' | 'title' | 'description' | 'ticket_type' | 'priority' | 'category' | 'user_id' | 'team_id' | 'cost_center_id' | 'requester_name' | 'requester_email' | 'public_observation' | 'scheduled_at' | 'deadline_at'
>;

export type TicketFilters = {
  status?: TicketStatus;
  priority?: TicketPriority;
  ticketType?: TicketType;
  assigneeId?: string;
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
      if (filters?.ticketType) query = query.eq('ticket_type', filters.ticketType);
      if (filters?.assigneeId) query = query.eq('assigned_to', filters.assigneeId);
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
          ticket_logs(id, action, created_at, profiles(email)),
          ticket_checklists(id, item_text, is_completed, completed_at, completed_by, profiles!ticket_checklists_completed_by_fkey(email))
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
        .select('status, sla_breached, priority, created_at, resolved_at, deadline_at');
      if (error) throw error;

      const now = new Date();

      // Helper: chamado ativo (ainda não fechado)
      const isActive = (t: typeof data[0]) =>
        t.status === 'OPEN' || t.status === 'IN_PROGRESS';

      // Helper: chamado expirado (prazo passou e ainda não foi resolvido/cancelado)
      const isExpiredActive = (t: typeof data[0]) =>
        isActive(t) && !!t.deadline_at && new Date(t.deadline_at) < now;

      // Basic counts
      const total = data.length;
      const open = data.filter((t) => t.status === 'OPEN').length;
      const inProgress = data.filter((t) => t.status === 'IN_PROGRESS').length;
      const resolved = data.filter((t) => t.status === 'RESOLVED').length;
      const canceled = data.filter((t) => t.status === 'CANCELED').length;

      // SLA estourado: inclui chamados já marcados no banco E chamados ativos com prazo vencido
      const slaBreached = data.filter(
        (t) => t.sla_breached || isExpiredActive(t)
      ).length;

      const critical = data.filter(
        (t) => t.priority === 'CRITICAL' && isActive(t)
      ).length;

      // Taxa de resolução: apenas resolvidos são "sucesso"; expirados e cancelados são "falha"
      // Fórmula: resolvidos / (resolvidos + cancelados + expirados ativos)
      const expiredCount = data.filter(isExpiredActive).length;
      const effectiveClosed = resolved; // apenas resolvidos contam como êxito
      // taxa = resolvidos / total (expirados e cancelados = falha)
      const resolutionRate = total > 0 ? Math.round((effectiveClosed / total) * 100) : 0;

      // Tempo médio de resolução:
      // - Chamados RESOLVED → usa resolved_at
      // - Chamados expirados ativos → usa deadline_at como referência de encerramento
      const resolvedWithTime = data.filter(
        (t) => t.status === 'RESOLVED' && t.resolved_at && t.created_at
      );
      const expiredWithTime = data.filter(
        (t) => isExpiredActive(t) && t.deadline_at && t.created_at
      );

      const allClosedForAvg = [
        ...resolvedWithTime.map((t) => ({
          start: t.created_at,
          end: t.resolved_at!,
        })),
        ...expiredWithTime.map((t) => ({
          start: t.created_at,
          end: t.deadline_at!,
        })),
      ];

      const avgResolutionHours =
        allClosedForAvg.length > 0
          ? Math.round(
              allClosedForAvg.reduce((acc, t) => {
                const diff =
                  new Date(t.end).getTime() - new Date(t.start).getTime();
                return acc + diff / 3_600_000;
              }, 0) / allClosedForAvg.length
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
        { name: 'Expirados', value: expiredCount, fill: '#ef4444' },
      ];

      // Monthly trend — last 6 months
      const now_trend = new Date();
      const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now_trend.getFullYear(), now_trend.getMonth() - (5 - i), 1);
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
        expiredCount,
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
    onError: (error: Error) => {
      console.error('Erro ao atualizar chamado:', error);
      alert(`Erro ao atualizar chamado: ${error.message}\n\nVerifique se você tem permissão para realizar esta ação.`);
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
          completed_by: is_completed ? (await supabase.auth.getUser()).data.user?.id : null
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}
