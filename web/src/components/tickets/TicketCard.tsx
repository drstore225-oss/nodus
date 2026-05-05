import React from 'react';
import { Ticket } from '../../hooks/useTickets';
import {
  statusLabels, priorityLabels,
  statusBadgeClass, priorityBadgeClass, priorityDotClass,
  formatDate, getSLARemaining,
} from '../../utils/ticket';
import { Clock, AlertTriangle, User, Tag } from 'lucide-react';

interface TicketCardProps {
  ticket: Ticket;
  onClick: () => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onClick }) => {
  const slaRemaining = getSLARemaining(ticket.deadline_at);
  const isExpired = slaRemaining === 'Expirado' || ticket.sla_breached;
  const isActive = ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border transition-all cursor-pointer hover:shadow-md group ${
        ticket.sla_breached && isActive
          ? 'border-red-300 ring-1 ring-red-200'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
            {ticket.title}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusBadgeClass[ticket.status]}`}>
            {statusLabels[ticket.status]}
          </span>
        </div>

        {/* Description */}
        {ticket.description && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-2">{ticket.description}</p>
        )}

        {/* Tags Row */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${priorityBadgeClass[ticket.priority]}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${priorityDotClass[ticket.priority]}`} />
            {priorityLabels[ticket.priority]}
          </span>
          {ticket.category && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              <Tag className="h-2.5 w-2.5" />
              {ticket.category}
            </span>
          )}
          {(ticket.team as any)?.name && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700">
              {(ticket.team as any).name}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-50 pt-3">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[100px]">
              {ticket.user_id 
                ? (ticket.requester as any)?.email?.split('@')[0] || '—'
                : ticket.requester_name?.split(' ')[0] || ticket.requester_email?.split('@')[0] || 'Público'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isActive && ticket.deadline_at && (
              <div className={`flex items-center gap-1 font-medium ${isExpired ? 'text-red-500' : 'text-slate-500'}`}>
                {isExpired ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                <span>{slaRemaining}</span>
              </div>
            )}
            <span>{formatDate(ticket.created_at).split(' ')[0]}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
