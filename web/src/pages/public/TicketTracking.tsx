import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { statusLabels, priorityLabels, statusBadgeClass, priorityBadgeClass, formatDate } from '../../utils/ticket';
import { TicketStatus, TicketPriority } from '../../types/database.types';
import { Ticket, Clock, CheckCircle2, AlertCircle, ArrowLeft, Building2 } from 'lucide-react';

interface PublicTicketData {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  created_at: string;
  resolved_at: string | null;
  deadline_at: string | null;
  requester_name: string;
  requester_email: string;
  public_observation: string | null;
  institution_name: string;
}

interface PublicTicketLog {
  id: string;
  action: string;
  created_at: string;
}

export const TicketTracking: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [ticket, setTicket] = useState<PublicTicketData | null>(null);
  const [logs, setLogs] = useState<PublicTicketLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketId) return;
      setIsLoading(true);
      setError(false);
      try {
        // Busca os dados do chamado via RPC segura
        const { data: ticketData, error: ticketError } = await supabase.rpc('get_public_ticket', {
          p_ticket_id: ticketId
        });

        if (ticketError || !ticketData) throw new Error('Chamado não encontrado');
        setTicket(ticketData as PublicTicketData);

        // Busca o histórico via RPC segura
        const { data: logsData, error: logsError } = await supabase.rpc('get_public_ticket_logs', {
          p_ticket_id: ticketId
        });

        if (!logsError && logsData) {
          setLogs(logsData as PublicTicketLog[]);
        }

      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Chamado não encontrado</h1>
        <p className="text-slate-600 max-w-md">
          O link de acompanhamento é inválido ou o chamado foi excluído. 
          Verifique se copiou o link corretamente.
        </p>
      </div>
    );
  }

  // Determina o progresso visual (0 = Aberto, 1 = Em Andamento, 2 = Resolvido)
  const steps = [
    { label: 'Aberto', active: true, completed: ticket.status !== 'OPEN' },
    { label: 'Em Andamento', active: ticket.status === 'IN_PROGRESS' || ticket.status === 'RESOLVED', completed: ticket.status === 'RESOLVED' },
    { label: 'Resolvido', active: ticket.status === 'RESOLVED', completed: ticket.status === 'RESOLVED' }
  ];

  if (ticket.status === 'CANCELED') {
    steps[1] = { label: 'Cancelado', active: true, completed: true };
    steps[2] = { label: '-', active: false, completed: false };
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="max-w-3xl w-full space-y-6">
        
        {/* Header Voltar */}
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Página Inicial
          </Link>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <Building2 className="h-4 w-4" />
            {ticket.institution_name}
          </div>
        </div>

        {/* Card Principal */}
        <div className="bg-white shadow rounded-2xl border border-slate-200 overflow-hidden">
          
          <div className="p-6 sm:p-8 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">{ticket.title}</h1>
                <p className="text-sm text-slate-500">Solicitado por <span className="font-semibold text-slate-700">{ticket.requester_name || ticket.requester_email || 'Você'}</span> em {formatDate(ticket.created_at)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusBadgeClass[ticket.status]}`}>
                  {statusLabels[ticket.status]}
                </span>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${priorityBadgeClass[ticket.priority]}`}>
                  {priorityLabels[ticket.priority]}
                </span>
              </div>
            </div>

            <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {ticket.public_observation && (
              <div className="mt-4 bg-blue-50/80 rounded-xl p-4 border border-blue-100">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">Última Observação da Equipe</p>
                <p className="text-sm text-blue-900 whitespace-pre-wrap">{ticket.public_observation}</p>
              </div>
            )}
            
            {ticket.deadline_at && ticket.status !== 'RESOLVED' && ticket.status !== 'CANCELED' && (
              <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3 border border-amber-100">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>Previsão de conclusão até: <strong>{formatDate(ticket.deadline_at)}</strong></span>
              </div>
            )}
          </div>

          {/* Stepper de Progresso */}
          <div className="px-6 py-8 sm:px-10 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wide">Progresso do Chamado</h3>
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t-2 border-slate-200"></div>
              </div>
              <div className="relative flex justify-between">
                {steps.map((step, stepIdx) => (
                  <div key={step.label} className="flex flex-col items-center">
                    <span 
                      className={`h-10 w-10 rounded-full flex items-center justify-center ring-4 ring-white ${
                        step.completed ? 'bg-emerald-500 text-white' : 
                        step.active && ticket.status === 'CANCELED' ? 'bg-red-500 text-white' :
                        step.active ? 'bg-blue-600 text-white' : 
                        'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {step.completed ? <CheckCircle2 className="h-6 w-6" /> : 
                       step.active && ticket.status === 'CANCELED' ? <AlertCircle className="h-6 w-6" /> :
                       step.active && stepIdx === 1 ? <Clock className="h-5 w-5" /> :
                       <Ticket className="h-5 w-5" />}
                    </span>
                    <span className={`mt-3 text-sm font-medium ${step.active ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline de Histórico */}
          <div className="p-6 sm:p-8">
            <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wide">Histórico de Atividades</h3>
            
            <div className="space-y-6">
              {logs.length === 0 ? (
                <p className="text-sm text-slate-500 italic">O histórico ainda está vazio.</p>
              ) : (
                logs.map((log, index) => (
                  <div key={log.id} className="flex gap-4 relative">
                    {index !== logs.length - 1 && (
                      <div className="absolute left-[11px] top-8 bottom-[-24px] w-[2px] bg-slate-100" />
                    )}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      index === 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-slate-400'}`} />
                    </div>
                    <div className="flex-1 pb-2">
                      <p className={`text-sm ${index === 0 ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
                        {log.action}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(log.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};
