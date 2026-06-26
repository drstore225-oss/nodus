import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { useTeams } from '../../hooks/useTeams';
import { useCostCenters } from '../../hooks/useCostCenters';
import { useBuildings } from '../../hooks/useBuildings';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { priorityLabels } from '../../utils/ticket';
import type { TicketPriority } from '../../types/database.types';

const ticketSchema = z.object({
  title: z.string().min(3, 'Título obrigatório (mínimo 3 caracteres)'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  ticket_type: z.enum(['CORRECTIVE', 'PREVENTIVE']),
  category: z.string().optional(),
  building_id: z.string().optional(),
  team_id: z.string().optional(),
  cost_center_id: z.string().optional(),
  scheduled_at: z.string().optional(),
  deadline_at: z.string().optional(),
}).refine(
  (data) => {
    if (data.scheduled_at && data.deadline_at) {
      return new Date(data.deadline_at) >= new Date(data.scheduled_at);
    }
    return true;
  },
  {
    message: 'Data Final não pode ser anterior à Data de Início.',
    path: ['deadline_at'],
  }
);

type TicketFormValues = z.infer<typeof ticketSchema>;

interface CreateTicketFormProps {
  onSubmit: (data: TicketFormValues) => Promise<void>;
  isLoading: boolean;
  onCancel: () => void;
  initialDate?: Date | null;
}

const priorityOptions = (Object.entries(priorityLabels) as [TicketPriority, string][]).map(
  ([v, l]) => ({ value: v, label: l })
);

const categoryOptions = [
  { value: 'Elétrica', label: 'Elétrica' },
  { value: 'Hidráulica', label: 'Hidráulica' },
  { value: 'Civil', label: 'Civil' },
  { value: 'Climatização', label: 'Climatização (AC/Ventilação)' },
  { value: 'Tecnologia', label: 'Tecnologia / TI' },
  { value: 'Segurança', label: 'Segurança Patrimonial' },
  { value: 'Limpeza', label: 'Limpeza / Conservação' },
  { value: 'Jardinagem', label: 'Jardinagem' },
  { value: 'Equipamentos', label: 'Equipamentos' },
  { value: 'Outros', label: 'Outros' },
];

export const CreateTicketForm: React.FC<CreateTicketFormProps> = ({
  onSubmit,
  isLoading,
  onCancel,
  initialDate,
}) => {
  const { profile } = useAuth();
  const { data: teams = [] } = useTeams(profile?.institution_id ?? undefined);
  const { data: costCenters = [] } = useCostCenters(profile?.institution_id ?? undefined);
  const { data: buildings = [] } = useBuildings(profile?.institution_id ?? undefined);

  const { register, handleSubmit, formState: { errors } } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { 
      priority: 'MEDIUM',
      ticket_type: 'CORRECTIVE',
      scheduled_at: initialDate ? initialDate.toISOString().slice(0, 16) : undefined,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title">Título do Chamado *</Label>
        <div className="mt-1">
          <Input
            id="title"
            placeholder="Descreva brevemente o problema..."
            error={errors.title?.message}
            {...register('title')}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descrição Detalhada</Label>
        <div className="mt-1">
          <textarea
            id="description"
            rows={4}
            placeholder="Descreva com detalhes o problema, localização, urgência..."
            className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            {...register('description')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority">Prioridade *</Label>
          <div className="mt-1">
            <Select
              id="priority"
              options={priorityOptions}
              {...register('priority')}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="ticket_type">Tipo de Manutenção *</Label>
          <div className="mt-1">
            <Select
              id="ticket_type"
              options={[
                { value: 'CORRECTIVE', label: 'Corretiva' },
                { value: 'PREVENTIVE', label: 'Preventiva' },
              ]}
              {...register('ticket_type')}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Categoria</Label>
          <div className="mt-1">
            <Select
              id="category"
              placeholder="Selecione..."
              options={categoryOptions}
              {...register('category')}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="scheduled_at">Data de Início</Label>
          <div className="mt-1">
            <Input
              id="scheduled_at"
              type="datetime-local"
              error={errors.scheduled_at?.message}
              {...register('scheduled_at')}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="deadline_at">Data de Término / Prazo</Label>
          <div className="mt-1">
            <Input
              id="deadline_at"
              type="datetime-local"
              error={errors.deadline_at?.message}
              {...register('deadline_at')}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="building_id">Prédio / Edifício</Label>
          <div className="mt-1">
            <Select
              id="building_id"
              placeholder="Nenhum prédio"
              options={buildings.map((b) => ({ value: b.id, label: `${b.name} (${parseFloat(b.total_m2.toString()).toLocaleString('pt-BR')} m²)` }))}
              {...register('building_id')}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="team_id">Equipe</Label>
          <div className="mt-1">
            <Select
              id="team_id"
              placeholder="Sem equipe específica"
              options={teams.map((t) => ({ value: t.id, label: t.name }))}
              {...register('team_id')}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="cost_center_id">Centro de Custo</Label>
          <div className="mt-1">
            <Select
              id="cost_center_id"
              placeholder="Sem centro de custo"
              options={costCenters.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
              {...register('cost_center_id')}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Abrir Chamado
        </Button>
      </div>
    </form>
  );
};
