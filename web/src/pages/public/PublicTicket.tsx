import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useInstitution } from '../../hooks/useInstitutions';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { priorityLabels } from '../../utils/ticket';
import type { TicketPriority } from '../../types/database.types';
import { CheckCircle2, AlertCircle, Copy, ArrowRight } from 'lucide-react';

const publicTicketSchema = z.object({
  requester_name: z.string().min(3, 'Nome obrigatório (mínimo 3 caracteres)'),
  requester_email: z.string().email('E-mail inválido'),
  title: z.string().min(3, 'Título obrigatório (mínimo 3 caracteres)'),
  description: z.string().min(10, 'Descreva com mais detalhes o problema (mínimo 10 caracteres)'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  category: z.string().optional(),
});

type PublicTicketFormValues = z.infer<typeof publicTicketSchema>;

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
  { value: 'Outros', label: 'Outros' },
];

export const PublicTicket: React.FC = () => {
  const { institutionId } = useParams<{ institutionId: string }>();
  const { data: institution, isLoading: isLoadingInst, error: instError } = useInstitution(institutionId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<PublicTicketFormValues>({
    resolver: zodResolver(publicTicketSchema),
    defaultValues: { priority: 'MEDIUM' },
  });

  const onSubmit = async (data: PublicTicketFormValues) => {
    if (!institutionId) return;
    setIsSubmitting(true);
    try {
      const newTicketId = crypto.randomUUID();
      const { error } = await supabase.from('tickets').insert({
        id: newTicketId,
        institution_id: institutionId,
        user_id: null, // Anônimo
        requester_name: data.requester_name,
        requester_email: data.requester_email,
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category,
        team_id: null,
        cost_center_id: null,
      });

      if (error) throw error;

      setCreatedTicketId(newTicketId);
      setIsSuccess(true);
    } catch (error) {
      console.error('Erro ao abrir chamado:', error);
      alert('Não foi possível enviar o chamado. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingInst) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (instError || !institution) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Instituição não encontrada</h1>
        <p className="text-slate-600 max-w-md">
          O link que você acessou é inválido ou a instituição não existe mais. 
          Por favor, solicite um novo link de atendimento.
        </p>
      </div>
    );
  }

  if (isSuccess && createdTicketId) {
    const trackingLink = `${window.location.origin}/acompanhar/${createdTicketId}`;
    
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Chamado Enviado!</h1>
          <p className="text-slate-600 mb-6">
            Sua solicitação para <strong>{institution.fantasy_name}</strong> foi registrada com sucesso.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 text-left">
            <p className="text-sm font-semibold text-slate-700 mb-2">Seu Link de Acompanhamento</p>
            <p className="text-xs text-slate-500 mb-3">
              Guarde este link para acompanhar o andamento e a resolução do seu problema.
            </p>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={trackingLink}
                className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-600 focus:outline-none"
              />
              <Button 
                variant="outline" 
                onClick={() => {
                  navigator.clipboard.writeText(trackingLink);
                  alert('Link copiado!');
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => window.location.href = trackingLink}>
              Acessar Acompanhamento <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button onClick={() => { setIsSuccess(false); setCreatedTicketId(null); }} variant="ghost">
              Abrir outro chamado
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="max-w-2xl w-full space-y-8">
        
        <div className="text-center">
          <img src="/logo.png" alt="Nodus Logo" className="mx-auto h-16 w-auto object-contain mb-2" />
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900">
            Abertura de Chamado
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Atendimento para <span className="font-semibold text-slate-800">{institution.fantasy_name}</span>
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-2xl border border-slate-100 sm:px-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 pb-6 border-b border-slate-100">
              <div className="space-y-1.5">
                <Label htmlFor="requester_name">Seu Nome Completo *</Label>
                <Input
                  id="requester_name"
                  placeholder="Ex: João da Silva"
                  error={errors.requester_name?.message}
                  {...register('requester_name')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="requester_email">Seu E-mail *</Label>
                <Input
                  id="requester_email"
                  type="email"
                  placeholder="Ex: joao@email.com"
                  error={errors.requester_email?.message}
                  {...register('requester_email')}
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label htmlFor="title">Título do Problema *</Label>
              <Input
                id="title"
                placeholder="Ex: Lâmpada queimada no corredor, Vazamento na pia..."
                error={errors.title?.message}
                {...register('title')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descrição Detalhada *</Label>
              <textarea
                id="description"
                rows={5}
                placeholder="Por favor, descreva o problema informando a localização exata e detalhes que possam ajudar a equipe técnica."
                className={`flex w-full rounded-md border ${errors.description ? 'border-red-300' : 'border-slate-300'} bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none`}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="priority">Nível de Urgência *</Label>
                <Select
                  id="priority"
                  options={priorityOptions}
                  {...register('priority')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Categoria do Problema</Label>
                <Select
                  id="category"
                  placeholder="Não tenho certeza"
                  options={categoryOptions}
                  {...register('category')}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Ao enviar, a equipe de manutenção será notificada.
              </p>
              <Button type="submit" isLoading={isSubmitting} size="lg">
                Enviar Chamado
              </Button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
