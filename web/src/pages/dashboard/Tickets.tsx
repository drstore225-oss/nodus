import React, { useState } from 'react';
import { useTickets, useCreateTicket } from '../../hooks/useTickets';
import type { TicketFilters, TicketType } from '../../hooks/useTickets';
import { useObras } from '../../hooks/useObras';
import { useAuth } from '../../contexts/AuthContext';
import { useUsers } from '../../hooks/useUsers';
import type { TicketStatus, TicketPriority } from '../../types/database.types';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { TicketCard } from '../../components/tickets/TicketCard';
import { CreateTicketForm } from '../../components/tickets/CreateTicketForm';
import { TicketDetailPanel } from '../../components/tickets/TicketDetailPanel';
import { TicketsCalendar } from '../../components/tickets/TicketsCalendar';
import { AttachmentUploader } from '../../components/tickets/AttachmentUploader';
import { Plus, Search, Ticket as TicketIcon, AlertTriangle, List, Calendar as CalendarIcon, Paperclip } from 'lucide-react';

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

const TYPE_OPTIONS: { value: TicketType | ''; label: string }[] = [
  { value: '', label: 'Todos os Tipos' },
  { value: 'CORRECTIVE', label: 'Corretiva' },
  { value: 'PREVENTIVE', label: 'Preventiva' },
];

export const TicketsPage: React.FC = () => {
  const { profile, user } = useAuth();
  const { data: users = [] } = useUsers(profile?.institution_id ?? undefined);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newlyCreatedTicketId, setNewlyCreatedTicketId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('');
  const [typeFilter, setTypeFilter] = useState<TicketType | ''>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [slaFilter, setSlaFilter] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const filters: TicketFilters = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(priorityFilter ? { priority: priorityFilter } : {}),
    ...(typeFilter ? { ticketType: typeFilter } : {}),
    ...(assigneeFilter ? { assigneeId: assigneeFilter } : {}),
    ...(slaFilter ? { slaBreached: true } : {}),
    ...(search ? { search } : {}),
  };

  const { data: tickets = [], isLoading } = useTickets(filters);
  const { data: obras = [] } = useObras(profile?.institution_id ?? undefined);
  const createMutation = useCreateTicket();

  const handleCreate = async (data: any) => {
    if (!profile?.institution_id) {
      alert('Você precisa estar vinculado a uma Instituição para abrir chamados. Vá no menu "Usuários" e vincule seu perfil a uma instituição.');
      return;
    }
    const created = await createMutation.mutateAsync({
      ...data,
      institution_id: profile.institution_id,
      user_id: user!.id,
      team_id: data.team_id || null,
      cost_center_id: data.cost_center_id || null,
    });
    // Advance to photo attachment step
    setNewlyCreatedTicketId(created.id);
  };

  const handleCloseCreateModal = () => {
    setIsCreateOpen(false);
    setNewlyCreatedTicketId(null);
    setSelectedDate(null);
  };

  const technicianUsers = users.filter((u) => u.role === 'TECNICO' || u.role === 'GESTOR');
  const activeFiltersCount = [statusFilter, priorityFilter, typeFilter, assigneeFilter, slaFilter].filter(Boolean).length;

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
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List className="h-4 w-4 mr-1.5" />
              Lista
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <CalendarIcon className="h-4 w-4 mr-1.5" />
              Calendário
            </button>
          </div>
          
          <Button onClick={() => { setSelectedDate(null); setIsCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Chamado
          </Button>
        </div>
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

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TicketType | '')}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {['GESTOR', 'ADMIN', 'SUPERADMIN'].includes(profile?.role || '') && (
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Técnicos</option>
            {technicianUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.email}</option>
            ))}
          </select>
        )}

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
      ) : viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => setSelectedTicketId(ticket.id)}
            />
          ))}
        </div>
      ) : (
        <TicketsCalendar 
          tickets={tickets}
          obras={obras}
          onTicketClick={setSelectedTicketId} 
          onDayDoubleClick={(date) => {
            setSelectedDate(date);
            setIsCreateOpen(true);
          }}
        />
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={handleCloseCreateModal}
        title={newlyCreatedTicketId ? 'Adicionar Fotos (Opcional)' : 'Abrir Novo Chamado'}
        size="lg"
      >
        {newlyCreatedTicketId ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Paperclip className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-800">
                Chamado criado com sucesso! Deseja adicionar fotos antes de concluir?
              </p>
            </div>
            <AttachmentUploader
              ticketId={newlyCreatedTicketId}
              onUploaded={() => {}}
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={handleCloseCreateModal}>
                Pular, sem fotos
              </Button>
              <Button onClick={handleCloseCreateModal}>
                Concluir
              </Button>
            </div>
          </div>
        ) : (
          <CreateTicketForm
            onSubmit={handleCreate}
            isLoading={createMutation.isPending}
            onCancel={handleCloseCreateModal}
            initialDate={selectedDate}
          />
        )}
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
