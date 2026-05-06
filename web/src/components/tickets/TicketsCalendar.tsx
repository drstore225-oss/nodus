import React, { useState } from 'react';
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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Ticket } from '../../hooks/useTickets';

interface TicketsCalendarProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: string) => void;
  onDayClick?: (date: Date) => void;
}

export const TicketsCalendar: React.FC<TicketsCalendarProps> = ({ tickets, onTicketClick, onDayClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

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

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, 'd');
      const cloneDay = day;
      const dayTickets = getTicketsForDay(cloneDay);
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isToday = isSameDay(day, new Date());

      days.push(
        <div
          key={day.toString()}
          onClick={(e) => {
            // Prevent day click if a ticket was clicked
            if ((e.target as HTMLElement).closest('.ticket-item')) return;
            onDayClick?.(cloneDay);
          }}
          className={`min-h-[120px] p-2 border-b border-r border-slate-200 transition-colors ${onDayClick ? 'cursor-pointer hover:bg-slate-100' : ''} ${
            !isCurrentMonth ? 'bg-slate-50 text-slate-400' : 'bg-white text-slate-700'
          } ${isToday ? 'bg-blue-50/50 hover:bg-blue-100/50' : ''}`}
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 capitalize">
          {format(currentDate, dateFormat, { locale: ptBR })}
        </h2>
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
  );
};
