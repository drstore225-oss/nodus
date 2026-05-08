import React, { useState, useRef, useEffect } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  startOfDay,
  endOfDay,
  addDays,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X, Plus, ArrowRight } from 'lucide-react';
import type { Ticket } from '../../hooks/useTickets';

interface TicketsCalendarProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: string) => void;
  onDayClick?: (date: Date) => void;
  onDayDoubleClick?: (date: Date) => void;
}

export const TicketsCalendar: React.FC<TicketsCalendarProps> = ({ tickets, onTicketClick, onDayClick, onDayDoubleClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayListDate, setDayListDate] = useState<Date | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: ptBR });
  const endDate = endOfWeek(monthEnd, { locale: ptBR });

  const dateFormat = 'MMMM yyyy';
  const days = [];
  let day = startDate;
  let formattedDate = '';

  const getTicketsForDay = (day: Date) => {
    return tickets.filter((ticket) => {
      if (ticket.scheduled_at && ticket.deadline_at) {
        // Ticket has a date range
        const start = startOfDay(parseISO(ticket.scheduled_at));
        const end = endOfDay(parseISO(ticket.deadline_at));
        return isWithinInterval(day, { start, end });
      } else {
        // Single date
        const ticketDateStr = ticket.scheduled_at || ticket.deadline_at || ticket.created_at;
        if (!ticketDateStr) return false;
        const ticketDate = parseISO(ticketDateStr);
        return isSameDay(ticketDate, day);
      }
    });
  };

  const handleDayClick = (e: React.MouseEvent, cloneDay: Date) => {
    if ((e.target as HTMLElement).closest('.ticket-item')) return;

    if (clickTimerRef.current) {
      // Double click detected
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      setDayListDate(null);
      onDayDoubleClick?.(cloneDay);
      onDayClick?.(cloneDay); // fallback if no double click handler
    } else {
      // First click — wait to see if double click follows
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        // Single click: show list panel
        setDayListDate(cloneDay);
      }, 250);
    }
  };

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, 'd');
      const cloneDay = day;
      const dayTickets = getTicketsForDay(cloneDay);
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isToday = isSameDay(day, new Date());
      const isSelected = dayListDate !== null && isSameDay(cloneDay, dayListDate);

      days.push(
        <div
          key={day.toString()}
          onClick={(e) => handleDayClick(e, cloneDay)}
          className={`min-h-[120px] p-2 border-b border-r border-slate-200 transition-colors cursor-pointer ${
            isSelected ? 'ring-2 ring-inset ring-blue-500' : ''
          } ${
            !isCurrentMonth ? 'bg-slate-50 text-slate-400 hover:bg-slate-100' : 'bg-white text-slate-700 hover:bg-slate-50'
          } ${isToday ? 'bg-blue-50/50 hover:bg-blue-100/50' : ''}`}
          title="Clique para ver chamados • Duplo clique para novo chamado"
        >
          <div className="flex justify-between items-center mb-2">
            <span
              className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
                isToday ? 'bg-blue-600 text-white' : ''
              }`}
            >
              {formattedDate}
            </span>
            {dayTickets.length > 0 && (
              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {dayTickets.length}
              </span>
            )}
          </div>
          <div className="space-y-1.5 overflow-y-auto max-h-[80px] custom-scrollbar">
            {dayTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onTicketClick(ticket.id);
                }}
                className={`ticket-item text-xs p-1.5 rounded cursor-pointer border-l-2 hover:opacity-80 transition-opacity truncate ${
                  ticket.priority === 'CRITICAL'
                    ? 'bg-red-50 border-red-500 text-red-700'
                    : ticket.priority === 'HIGH'
                    ? 'bg-orange-50 border-orange-500 text-orange-700'
                    : ticket.priority === 'MEDIUM'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-slate-100 border-slate-400 text-slate-700'
                }`}
                title={ticket.title}
              >
                <div className="flex items-center gap-1 font-semibold truncate">
                  {ticket.ticket_type === 'PREVENTIVE' && <span className="px-1 bg-white/50 rounded uppercase text-[9px] border border-current opacity-70">Prev</span>}
                  <span className="truncate">{ticket.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
  }

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const selectedDayTickets = dayListDate ? getTicketsForDay(dayListDate) : [];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800 capitalize">
              {format(currentDate, dateFormat, { locale: ptBR })}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Clique no dia para ver chamados · Duplo clique para novo chamado</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700"
            >
              Hoje
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {weekDays.map((d, i) => (
            <div key={i} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wide border-r border-slate-200 last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 border-l border-t border-slate-200">
          {days}
        </div>
      </div>

      {/* Day Tickets Panel */}
      {dayListDate && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Chamados em {format(dayListDate, "dd 'de' MMMM", { locale: ptBR })}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedDayTickets.length === 0
                  ? 'Nenhum chamado neste dia'
                  : `${selectedDayTickets.length} chamado${selectedDayTickets.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { onDayDoubleClick?.(dayListDate); onDayClick?.(dayListDate); setDayListDate(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Novo Chamado
              </button>
              <button
                onClick={() => setDayListDate(null)}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {selectedDayTickets.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">
              Nenhum chamado agendado para este dia.
              <br />
              <button
                onClick={() => { onDayDoubleClick?.(dayListDate); onDayClick?.(dayListDate); setDayListDate(null); }}
                className="mt-3 inline-flex items-center gap-1 text-blue-600 hover:underline font-medium text-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Criar novo chamado para este dia
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {selectedDayTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => { onTicketClick(ticket.id); setDayListDate(null); }}
                  className="w-full flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors text-left group"
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      ticket.priority === 'CRITICAL' ? 'bg-red-500' :
                      ticket.priority === 'HIGH' ? 'bg-orange-500' :
                      ticket.priority === 'MEDIUM' ? 'bg-blue-500' : 'bg-slate-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{ticket.title}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {ticket.ticket_type === 'PREVENTIVE' ? 'Preventiva' : 'Corretiva'} ·{' '}
                      {ticket.status === 'OPEN' ? 'Aberto' :
                       ticket.status === 'IN_PROGRESS' ? 'Em andamento' :
                       ticket.status === 'RESOLVED' ? 'Resolvido' : 'Cancelado'}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
