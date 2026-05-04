import React, { useState } from 'react';
import { useTickets, useCreateTicket, TicketFilters } from '../../hooks/useTickets';
import { useAuth } from '../../contexts/AuthContext';
import { TicketStatus, TicketPriority } from '../../types/database.types';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { TicketCard } from '../../components/tickets/TicketCard';
import { CreateTicketForm } from '../../components/tickets/CreateTicketForm';
import { TicketDetailPanel } from '../../components/tickets/TicketDetailPanel';
import { statusLabels, priorityLabels } from '../../utils/ticket';
import { Plus, Search, SlidersHorizontal, Ticket as TicketIcon, AlertTriangle } from 'lucide-react';

const STATUS_OPTIONS: { value: TicketStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os Status' },
  { value: 'OPEN', label: 'Abertos' },
  { value: 'IN_PROGRESS', label: 'Em Andamento' },
  { value: 'RESOLVED', label: 'Resolvidos' },
  { value: 'CANCELED', label: 'Cancelados' },
];

const PRIORITY_OPTIONS: { value: TicketPriority | ''; label: string }[] = [
  { value: '', label: 'Todas as Prioridades' },
  { value: 'CRITICAL', label: 'Crítica' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'MEDIUM', label: 'Média' },
  { value: 'LOW', label: 'Baixa' },
];

export const TicketsPage: React.FC = () => {
  const { profile, user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('');
  const [slaFilter, setSlaFilter] = useState(false);

  const filters: TicketFilters = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(priorityFilter ? { priority: priorityFilter } : {}),
    ...(slaFilter ? { slaBreached: true } : {}),
    ...(search ? { search } : {}),
  };

  const { data: tickets = [], isLoading } = useTickets(filters);
  const createMutation = useCreateTicket();

  const handleCreate = async (data: any) => {
    if (!profile?.institution_id) return;
    await createMutation.mutateAsync({
      ...data,
      institution_id: profile.institution_id,
      user_id: user!.id,
      team_id: data.team_id || null,
      cost_center_id: data.cost_center_id || null,
    });
    setIsCreateOpen(false);
  };

  const activeFiltersCount = [statusFilter, priorityFilter, slaFilter].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Chamados</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isLoading ? '...' : `${tickets.length} chamado${tickets.length !== 1 ? 's' : ''} encontrado${tickets.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Chamado
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar chamados..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 h-10 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TicketStatus | '')}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | '')}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <button
          onClick={() => setSlaFilter(!slaFilter)}
          className={`flex items-center gap-2 h-10 px-4 rounded-md border text-sm font-medium transition-colors ${
            slaFilter
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          SLA Estourado
        </button>
      </div>

      {/* Ticket Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <TicketIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Nenhum chamado encontrado</p>
          <p className="text-slate-400 text-sm mt-1">
            {activeFiltersCount > 0 ? 'Tente ajustar os filtros.' : 'Clique em "Novo Chamado" para começar.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => setSelectedTicketId(ticket.id)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Abrir Novo Chamado"
        size="lg"
      >
        <CreateTicketForm
          onSubmit={handleCreate}
          isLoading={createMutation.isPending}
          onCancel={() => setIsCreateOpen(false)}
        />
      </Modal>

      {/* Detail Panel */}
      {selectedTicketId && (
        <TicketDetailPanel
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </div>
  );
};
