import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUsers } from '../../hooks/useUsers';
import { useTeams } from '../../hooks/useTeams';
import {
  useMaintenancePlans,
  useCreateMaintenancePlan,
  useUpdateMaintenancePlan,
  useDeleteMaintenancePlan,
  useCreatePlanChecklistItem,
  useDeletePlanChecklistItem,
} from '../../hooks/useMaintenancePlans';
import type { MaintenanceFrequency } from '../../hooks/useMaintenancePlans';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Calendar, Plus, Trash2, X, ListTodo, Activity } from 'lucide-react';
import type { TicketPriority } from '../../types/database.types';

const frequencyLabels: Record<MaintenanceFrequency, string> = {
  DAILY: 'Diária',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
};

const priorityLabels: Record<TicketPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const MaintenancePlans: React.FC = () => {
  const { profile } = useAuth();
  const { data: plans = [], isLoading } = useMaintenancePlans();
  const { data: users = [] } = useUsers(profile?.institution_id ?? undefined);
  const { data: teams = [] } = useTeams();

  const createMutation = useCreateMaintenancePlan();
  const updateMutation = useUpdateMaintenancePlan();
  const deleteMutation = useDeleteMaintenancePlan();
  const addChecklistMutation = useCreatePlanChecklistItem();
  const removeChecklistMutation = useDeletePlanChecklistItem();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as TicketPriority,
    frequency: 'DAILY' as MaintenanceFrequency,
    assigned_to: '',
    team_id: '',
  });

  const technicianUsers = users.filter((u) => u.role === 'TECNICO' || u.role === 'GESTOR');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.institution_id) return;

    await createMutation.mutateAsync({
      institution_id: profile.institution_id,
      title: formData.title,
      description: formData.description || null,
      priority: formData.priority,
      frequency: formData.frequency,
      assigned_to: formData.assigned_to || null,
      team_id: formData.team_id || null,
      is_active: true,
      category: 'Preventiva',
      cost_center_id: null,
    });

    setIsCreateOpen(false);
    setFormData({ title: '', description: '', priority: 'MEDIUM', frequency: 'DAILY', assigned_to: '', team_id: '' });
  };

  const toggleActive = async (id: string, current: boolean) => {
    await updateMutation.mutateAsync({ id, is_active: !current });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este plano de manutenção? Todas as preventivas futuras não serão geradas.')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleAddChecklist = async (planId: string) => {
    if (!newChecklistItem.trim()) return;
    await addChecklistMutation.mutateAsync({ plan_id: planId, item_text: newChecklistItem });
    setNewChecklistItem('');
  };

  if (profile?.role === 'SOLICITANTE' || profile?.role === 'TECNICO') {
    return <div className="p-8 text-center text-slate-500">Acesso restrito a gestores e administradores.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Planos de Manutenção Preventiva</h1>
          <p className="text-sm text-slate-500 mt-1">Configure chamados que são abertos automaticamente em uma frequência definida.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-sm">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Nenhum plano de manutenção configurado</p>
          <p className="text-slate-400 text-sm mt-1">Crie um plano para gerar preventivas automaticamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${
                        plan.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {plan.is_active ? 'Ativo' : 'Pausado'}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-blue-100 text-blue-700">
                        {frequencyLabels[plan.frequency]}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">{plan.title}</h3>
                    {plan.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{plan.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button 
                      onClick={() => toggleActive(plan.id, plan.is_active)}
                      className={`p-2 rounded-lg transition-colors ${plan.is_active ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                      title={plan.is_active ? 'Pausar Geração' : 'Ativar Geração'}
                    >
                      <Activity className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(plan.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                  <div>
                    <span className="text-slate-400 block text-xs uppercase tracking-wide mb-0.5">Atribuição</span>
                    <span className="font-medium text-slate-700">
                      {plan.team ? `Equipe: ${plan.team.name}` : plan.assignee?.email || 'Fila Geral / Não atribuído'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs uppercase tracking-wide mb-0.5">Prioridade</span>
                    <span className="font-medium text-slate-700">{priorityLabels[plan.priority]}</span>
                  </div>
                </div>
              </div>

              {/* Checklists area */}
              <div className="p-5 bg-slate-50 flex-1 flex flex-col">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                  <ListTodo className="h-4 w-4" /> Checklist do Plano
                </h4>
                
                <div className="space-y-2 mb-4 flex-1">
                  {(!plan.maintenance_plan_checklists || plan.maintenance_plan_checklists.length === 0) ? (
                    <p className="text-sm text-slate-400 italic">Nenhum item adicionado ao checklist.</p>
                  ) : (
                    plan.maintenance_plan_checklists.map((chk) => (
                      <div key={chk.id} className="flex justify-between items-center bg-white border border-slate-200 rounded px-3 py-2 text-sm">
                        <span className="text-slate-700">{chk.item_text}</span>
                        <button 
                          onClick={() => removeChecklistMutation.mutate(chk.id)}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add new checklist item */}
                <div className="flex gap-2 mt-auto">
                  <input
                    type="text"
                    placeholder="Adicionar item ao checklist..."
                    className="flex-1 h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setNewChecklistItem((e.target as HTMLInputElement).value);
                        handleAddChecklist(plan.id);
                      }
                    }}
                    onBlur={(e) => setNewChecklistItem(e.target.value)}
                  />
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => handleAddChecklist(plan.id)}
                    isLoading={addChecklistMutation.isPending}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Novo Plano de Manutenção">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título do Plano *</label>
            <input
              required
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Manutenção Preventiva do Ar Condicionado"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <textarea
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Instruções gerais..."
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Frequência *</label>
              <select
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as MaintenanceFrequency })}
              >
                {Object.entries(frequencyLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketPriority })}
              >
                {Object.entries(priorityLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Técnico Específico</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                disabled={!!formData.team_id}
              >
                <option value="">Nenhum</option>
                {technicianUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ou Equipe (Múltiplos)</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                value={formData.team_id}
                onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                disabled={!!formData.assigned_to}
              >
                <option value="">Nenhuma</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Se escolher uma Equipe, a preventiva ficará visível para todos os membros dela.
          </p>

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Salvar Plano
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
