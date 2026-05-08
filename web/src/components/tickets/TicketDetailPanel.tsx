import React, { useState, useEffect } from 'react';
import { useTicket, useUpdateTicket, useUpdateChecklistItem } from '../../hooks/useTickets';
import { useUsers } from '../../hooks/useUsers';
import { useTeams } from '../../hooks/useTeams';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { AttachmentUploader } from './AttachmentUploader';
import {
  statusLabels, priorityLabels, statusBadgeClass, priorityBadgeClass,
  formatDate, formatCurrency, getSLARemaining,
} from '../../utils/ticket';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import type { TicketStatus, TicketPriority } from '../../types/database.types';
import {
  X, Clock, AlertTriangle, User, Tag, DollarSign, Users, Calendar,
  CheckCircle, ArrowRight, Paperclip, History, Save, CheckSquare, Square, Pencil
} from 'lucide-react';

interface TicketDetailPanelProps {
  ticketId: string;
  onClose: () => void;
}

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'CANCELED'],
  IN_PROGRESS: ['RESOLVED', 'OPEN'],
  RESOLVED: [],
  CANCELED: ['OPEN'],
};

const nextStatusLabels: Record<TicketStatus, string> = {
  IN_PROGRESS: 'Iniciar Atendimento',
  RESOLVED: 'Marcar como Resolvido',
  OPEN: 'Reabrir Chamado',
  CANCELED: 'Cancelar',
};

export const TicketDetailPanel: React.FC<TicketDetailPanelProps> = ({ ticketId, onClose }) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: ticket, isLoading } = useTicket(ticketId);
  const { data: users = [] } = useUsers(profile?.institution_id ?? undefined);
  const { data: teams = [] } = useTeams(profile?.institution_id ?? undefined);
  const updateMutation = useUpdateTicket();
  const updateChecklistMutation = useUpdateChecklistItem();
  
  const [assigneeId, setAssigneeId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [deadlineAt, setDeadlineAt] = useState('');
  
  // Public Observation State
  const [isEditingObservation, setIsEditingObservation] = useState(false);
  const [publicObservation, setPublicObservation] = useState('');
  
  // Cost states
  const [isEditingCosts, setIsEditingCosts] = useState(false);
  const [costs, setCosts] = useState({
    estimated_cost: 0,
    approved_cost: 0,
    actual_cost: 0,
    cost_notes: '',
  });

  // Ticket basic info edit state
  const [isEditingTicket, setIsEditingTicket] = useState(false);
  const [ticketEdit, setTicketEdit] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as TicketPriority,
    category: '',
  });

  useEffect(() => {
    if (ticket) {
      setPublicObservation(ticket.public_observation || '');
      setCosts({
        estimated_cost: ticket.estimated_cost || 0,
        approved_cost: ticket.approved_cost || 0,
        actual_cost: ticket.actual_cost || 0,
        cost_notes: ticket.cost_notes || '',
      });
      setScheduledAt(ticket.scheduled_at ? new Date(ticket.scheduled_at).toISOString().slice(0, 16) : '');
      setDeadlineAt(ticket.deadline_at ? new Date(ticket.deadline_at).toISOString().slice(0, 16) : '');
      
      setTicketEdit({
        title: ticket.title,
        description: ticket.description || '',
        priority: ticket.priority,
        category: ticket.category || '',
      });
    }
  }, [ticket]);

  const canAssign = ['GESTOR', 'ADMIN', 'SUPERADMIN'].includes(profile?.role || '');
  const canEditCosts = ['GESTOR', 'ADMIN', 'SUPERADMIN'].includes(profile?.role || '');
  const canEditTicket = canAssign || ticket?.user_id === profile?.id;
  const slaRemaining = getSLARemaining(ticket?.deadline_at);
  const isActive = ticket?.status === 'OPEN' || ticket?.status === 'IN_PROGRESS';

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket) return;

    const updatePayload: Partial<typeof ticket> & { id: string } = { id: ticket.id, status: newStatus };

    // Se o chamado não tem técnico atribuído e o usuário logado está mudando o status,
    // auto-atribui ele mesmo (válido para IN_PROGRESS e RESOLVED)
    if (!ticket.assigned_to && profile?.id && (newStatus === 'IN_PROGRESS' || newStatus === 'RESOLVED')) {
      updatePayload.assigned_to = profile.id;
    }

    await updateMutation.mutateAsync(updatePayload);
  };

  const handleAssign = async () => {
    if (!ticket) return;
    await updateMutation.mutateAsync({ id: ticket.id, assigned_to: assigneeId || null, team_id: teamId || null });
    setAssigneeId('');
    setTeamId('');
  };

  const handleUpdateSchedule = async () => {
    if (!ticket) return;
    
    if (scheduledAt && deadlineAt && new Date(deadlineAt) < new Date(scheduledAt)) {
      alert('A data de término não pode ser anterior à data de início.');
      return;
    }

    await updateMutation.mutateAsync({ 
      id: ticket.id, 
      scheduled_at: scheduledAt || null,
      deadline_at: deadlineAt || null,
    });
  };

  const handleSaveObservation = async () => {
    if (!ticket) return;
    await updateMutation.mutateAsync({ id: ticket.id, public_observation: publicObservation });
    setIsEditingObservation(false);
  };

  const handleSaveCosts = async () => {
    if (!ticket) return;
    await updateMutation.mutateAsync({
      id: ticket.id,
      estimated_cost: costs.estimated_cost,
      approved_cost: costs.approved_cost,
      actual_cost: costs.actual_cost,
      cost_notes: costs.cost_notes,
    });
    setIsEditingCosts(false);
  };

  const handleSaveTicketEdit = async () => {
    if (!ticket) return;
    if (!ticketEdit.title.trim()) {
      alert('O título é obrigatório.');
      return;
    }
    await updateMutation.mutateAsync({
      id: ticket.id,
      title: ticketEdit.title,
      description: ticketEdit.description,
      priority: ticketEdit.priority,
      category: ticketEdit.category,
    });
    setIsEditingTicket(false);
  };

  const technicianUsers = users.filter((u) => u.role === 'TECNICO' || u.role === 'GESTOR');

  if (!ticket && isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
        <div className="relative ml-auto w-full max-w-2xl bg-white shadow-2xl flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const nextStatuses = STATUS_TRANSITIONS[ticket.status];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative ml-auto w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadgeClass[ticket.status]}`}>
              {statusLabels[ticket.status]}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityBadgeClass[ticket.priority]}`}>
              {priorityLabels[ticket.priority]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isEditingTicket && canEditTicket && ticket.status !== 'RESOLVED' && ticket.status !== 'CANCELED' && (
              <button onClick={() => setIsEditingTicket(true)} className="p-2 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Editar Chamado">
                <Pencil className="h-5 w-5" />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-8">
            {isEditingTicket ? (
              <div className="bg-white border border-blue-200 rounded-xl p-5 space-y-4 shadow-sm">
                <p className="text-sm font-bold text-slate-800 border-b pb-2">Editar Detalhes do Chamado</p>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Título</label>
                  <input
                    type="text"
                    className="w-full h-9 rounded-md border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={ticketEdit.title}
                    onChange={(e) => setTicketEdit({ ...ticketEdit, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Descrição</label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                    value={ticketEdit.description}
                    onChange={(e) => setTicketEdit({ ...ticketEdit, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Prioridade</label>
                    <Select
                      className="w-full"
                      value={ticketEdit.priority}
                      onChange={(e) => setTicketEdit({ ...ticketEdit, priority: e.target.value as any })}
                      options={Object.entries(priorityLabels).map(([v, l]) => ({ value: v, label: l }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Categoria</label>
                    <Select
                      className="w-full"
                      value={ticketEdit.category}
                      onChange={(e) => setTicketEdit({ ...ticketEdit, category: e.target.value })}
                      options={[
                        { value: 'Elétrica', label: 'Elétrica' },
                        { value: 'Hidráulica', label: 'Hidráulica' },
                        { value: 'Civil', label: 'Civil' },
                        { value: 'Climatização', label: 'Climatização (AC/Ventilação)' },
                        { value: 'Tecnologia', label: 'Tecnologia / TI' },
                        { value: 'Segurança', label: 'Segurança Patrimonial' },
                        { value: 'Limpeza', label: 'Limpeza / Conservação' },
                        { value: 'Jardinagem', label: 'Jardinagem' },
                        { value: 'Outros', label: 'Outros' },
                      ]}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setIsEditingTicket(false)}>Cancelar</Button>
                  <Button onClick={handleSaveTicketEdit} isLoading={updateMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" /> Salvar Alterações
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-slate-800">{ticket.title}</h2>
                {ticket.description && (
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                )}
              </div>
            )}

            {/* SLA Alert */}
            {isActive && ticket.sla_breached && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-red-800 font-semibold text-sm">SLA Estourado!</p>
                  <p className="text-red-600 text-xs">Prazo de atendimento expirou. Ação imediata necessária.</p>
                </div>
              </div>
            )}
            {isActive && !ticket.sla_breached && ticket.deadline_at && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-amber-800 font-semibold text-sm">SLA Restante: {slaRemaining}</p>
                  <p className="text-amber-600 text-xs">Prazo limite: {formatDate(ticket.deadline_at)}</p>
                </div>
              </div>
            )}

            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 gap-6 text-sm bg-slate-50 border border-slate-200 rounded-xl p-5">
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Solicitante</p>
                    <p className="text-slate-700 font-medium">
                      {ticket.user_id 
                        ? (ticket.requester as any)?.email || '—'
                        : `${ticket.requester_name || ''} (${ticket.requester_email || ''})`}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Técnico Atribuído</p>
                    <p className="text-slate-700 font-medium">
                      {(ticket.assignee as any)?.email || <span className="text-slate-400 italic">Nenhum</span>}
                    </p>
                  </div>
                </div>
                {ticket.category && (
                  <div className="flex items-start gap-2">
                    <Tag className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Categoria</p>
                      <p className="text-slate-700 font-medium">{ticket.category}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Criado em</p>
                    <p className="text-slate-700 font-medium">{formatDate(ticket.created_at)}</p>
                  </div>
                </div>
                {(ticket.team as any)?.name && (
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Equipe</p>
                      <p className="text-slate-700 font-medium">{(ticket.team as any).name}</p>
                    </div>
                  </div>
                )}
                {(ticket.cost_center as any)?.name && (
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Centro de Custo</p>
                      <p className="text-slate-700 font-medium">{(ticket.cost_center as any).name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Assign Section */}
            {canAssign && ticket.status !== 'RESOLVED' && ticket.status !== 'CANCELED' && (
              <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-white">
                <p className="text-sm font-bold text-slate-700">Atribuição e Agendamento</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Técnico Individual</label>
                    <Select
                      className="w-full"
                      placeholder="Sem técnico..."
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      disabled={!!teamId}
                      options={technicianUsers.map((u) => ({
                        value: u.id,
                        label: u.email,
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Ou Equipe (Múltiplos)</label>
                    <Select
                      className="w-full"
                      placeholder="Sem equipe..."
                      value={teamId}
                      onChange={(e) => setTeamId(e.target.value)}
                      disabled={!!assigneeId}
                      options={teams.map((t) => ({
                        value: t.id,
                        label: t.name,
                      }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button onClick={handleAssign} disabled={(!assigneeId && !teamId)} isLoading={updateMutation.isPending} size="sm">
                    Salvar Atribuição
                  </Button>
                </div>
                
                <hr className="border-slate-100" />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Data de Início</label>
                    <input
                      type="datetime-local"
                      className="w-full h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Data de Término / Prazo</label>
                    <input
                      type="datetime-local"
                      className="w-full h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={deadlineAt}
                      onChange={(e) => setDeadlineAt(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button onClick={handleUpdateSchedule} isLoading={updateMutation.isPending} size="sm">
                    Salvar Período
                  </Button>
                </div>
              </div>
            )}

            {/* Public Observation Section */}
            {(canAssign || ticket.assigned_to === profile?.id) && (
              <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Observação Pública (Cliente)
                  </p>
                  {!isEditingObservation && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingObservation(true)}>
                      Editar Observação
                    </Button>
                  )}
                </div>

                {isEditingObservation ? (
                  <div className="space-y-3">
                    <textarea
                      className="w-full rounded-md border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                      value={publicObservation}
                      onChange={(e) => setPublicObservation(e.target.value)}
                      placeholder="Descreva o que está sendo feito. O solicitante verá esta mensagem..."
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setIsEditingObservation(false)}>Cancelar</Button>
                      <Button onClick={handleSaveObservation} isLoading={updateMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" /> Salvar Observação
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {ticket.public_observation ? (
                      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.public_observation}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Nenhuma observação pública adicionada.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Checklists Section */}
            {ticket.ticket_checklists && ticket.ticket_checklists.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <p className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                  Checklist Diário / Tarefas
                </p>
                <div className="space-y-2">
                  {ticket.ticket_checklists.map((chk) => (
                    <div 
                      key={chk.id} 
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        chk.is_completed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <button
                        onClick={() => updateChecklistMutation.mutate({ id: chk.id, is_completed: !chk.is_completed })}
                        disabled={updateChecklistMutation.isPending || (!canAssign && ticket.assigned_to !== profile?.id)}
                        className={`mt-0.5 flex-shrink-0 transition-colors ${
                          chk.is_completed ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-400 hover:text-blue-500'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {chk.is_completed ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm ${chk.is_completed ? 'text-slate-500 line-through' : 'text-slate-700 font-medium'}`}>
                          {chk.item_text}
                        </p>
                        {chk.is_completed && chk.completed_at && (
                          <p className="text-xs text-slate-400 mt-1">
                            Concluído por {chk.profiles?.email?.split('@')[0]} em {formatDate(chk.completed_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments Section - always visible so users can upload */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white">
              <p className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexos e Fotos {ticket.attachments && ticket.attachments.length > 0 ? `(${ticket.attachments.length})` : ''}
              </p>

              {/* Existing attachments grid */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {ticket.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative aspect-square rounded-lg border border-slate-200 overflow-hidden hover:border-blue-400 transition-colors"
                    >
                      <img src={att.file_url} alt="Anexo" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </a>
                  ))}
                </div>
              )}

              {/* Upload area - visible to assigned tech and managers */}
              {(canAssign || ticket.assigned_to === profile?.id) && ticket.status !== 'RESOLVED' && ticket.status !== 'CANCELED' && (
                <div className="border-t border-slate-100 pt-4 mt-2">
                  <p className="text-xs text-slate-500 mb-3">Adicionar fotos ao chamado:</p>
                  <AttachmentUploader
                    ticketId={ticket.id}
                    compact
                    onUploaded={() => {
                      queryClient.invalidateQueries({ queryKey: ['tickets', ticket.id] });
                    }}
                  />
                </div>
              )}
            </div>

            {/* Cost Section */}
            {canEditCosts && (
              <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Gestão de Custos
                  </p>
                  {!isEditingCosts && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingCosts(true)}>
                      Editar Custos
                    </Button>
                  )}
                </div>

                {isEditingCosts ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Estimado (R$)</label>
                        <input
                          type="number"
                          className="w-full h-9 rounded-md border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          value={costs.estimated_cost}
                          onChange={(e) => setCosts({ ...costs, estimated_cost: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Aprovado (R$)</label>
                        <input
                          type="number"
                          className="w-full h-9 rounded-md border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          value={costs.approved_cost}
                          onChange={(e) => setCosts({ ...costs, approved_cost: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Realizado (R$)</label>
                        <input
                          type="number"
                          className="w-full h-9 rounded-md border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          value={costs.actual_cost}
                          onChange={(e) => setCosts({ ...costs, actual_cost: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Observações de Custo</label>
                      <textarea
                        className="w-full rounded-md border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
                        value={costs.cost_notes}
                        onChange={(e) => setCosts({ ...costs, cost_notes: e.target.value })}
                        placeholder="Ex: Peças compradas na loja X, NF nº 12345..."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setIsEditingCosts(false)}>Cancelar</Button>
                      <Button onClick={handleSaveCosts} isLoading={updateMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" /> Salvar Custos
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-3 gap-3 text-center text-sm">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1">Estimado</p>
                        <p className="font-semibold text-slate-800">{formatCurrency(ticket.estimated_cost)}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <p className="text-xs text-blue-500 mb-1">Aprovado</p>
                        <p className="font-semibold text-blue-700">{formatCurrency(ticket.approved_cost)}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                        <p className="text-xs text-emerald-500 mb-1">Realizado</p>
                        <p className="font-semibold text-emerald-700">{formatCurrency(ticket.actual_cost)}</p>
                      </div>
                    </div>
                    {ticket.cost_notes && (
                      <div className="mt-3 bg-slate-50 border border-slate-100 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide">Observações</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.cost_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Timeline / Logs */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white">
              <p className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico do Chamado
              </p>
              <div className="space-y-4">
                {(ticket.ticket_logs || []).length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Nenhum log registrado ainda.</p>
                ) : (
                  (ticket.ticket_logs || []).map((log, index) => (
                    <div key={log.id} className="flex gap-3 relative">
                      {/* Linha vertical */}
                      {index !== (ticket.ticket_logs?.length || 1) - 1 && (
                        <div className="absolute left-[9px] top-6 bottom-[-16px] w-[2px] bg-slate-100" />
                      )}
                      <div className="w-[20px] h-[20px] rounded-full bg-slate-100 border-2 border-white shadow-sm flex-shrink-0 mt-0.5" />
                      <div className="flex-1 pb-4">
                        <p className="text-sm text-slate-700 font-medium">
                          {log.action}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">{formatDate(log.created_at)}</span>
                          {log.profiles?.email && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-xs text-slate-500">{log.profiles.email}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        {nextStatuses.length > 0 && (
          <div className="flex-shrink-0 border-t border-slate-200 px-6 py-4 bg-slate-50">
            <div className="flex gap-3 justify-end">
              {nextStatuses.map((status) => (
               <Button
                  key={status}
                  variant={status === 'RESOLVED' ? 'primary' : status === 'CANCELED' ? 'outline' : 'secondary'}
                  className={status === 'RESOLVED' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                  onClick={() => handleStatusChange(status)}
                  isLoading={updateMutation.isPending}
                >
                  {status === 'RESOLVED' ? <CheckCircle className="h-4 w-4 mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                  {nextStatusLabels[status]}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
