import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO, differenceInDays, isPast, isFuture, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import type { ObraStatus } from '../../hooks/useObras';
import { obraStatusLabels, obraStatusColors } from '../../hooks/useObras';
import {
  HardHat,
  MapPin,
  Calendar,
  User,
  Phone,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  Info,
} from 'lucide-react';

interface PublicObraData {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  status: ObraStatus;
  starts_at: string;
  ends_at: string;
  responsible_name: string | null;
  responsible_contact: string | null;
  public_notes: string | null;
  institution_name: string;
}

const statusBanners: Record<ObraStatus, { icon: React.ElementType; bg: string; border: string; text: string; title: string; message: string }> = {
  IN_PROGRESS: {
    icon: HardHat,
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    title: '⚠️ Área em Isolamento',
    message: 'Esta área está com acesso restrito devido à obra em andamento. Siga as orientações da sinalização local.',
  },
  PLANNED: {
    icon: Clock,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    title: '📅 Obra Planejada',
    message: 'Esta obra ainda não foi iniciada. Fique atento ao período de execução.',
  },
  PAUSED: {
    icon: Clock,
    bg: 'bg-slate-50',
    border: 'border-slate-300',
    text: 'text-slate-700',
    title: '⏸ Obra Pausada',
    message: 'Os trabalhos estão temporariamente suspensos.',
  },
  COMPLETED: {
    icon: CheckCircle,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    title: '✅ Obra Concluída',
    message: 'Os trabalhos foram finalizados. O acesso à área foi normalizado.',
  },
  CANCELED: {
    icon: AlertTriangle,
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-600',
    title: 'Obra Cancelada',
    message: 'Esta obra foi cancelada.',
  },
};

function formatDate(dateStr: string) {
  return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

function getDurationLabel(starts: string, ends: string): string {
  const s = parseISO(starts);
  const e = parseISO(ends);
  const days = differenceInDays(e, s) + 1;
  return `${days} dia${days !== 1 ? 's' : ''}`;
}

function getProgressLabel(starts: string, ends: string, status: ObraStatus): string {
  if (status === 'COMPLETED') return 'Concluída';
  if (status === 'CANCELED') return 'Cancelada';
  if (status === 'PAUSED') return 'Pausada';
  const now = startOfDay(new Date());
  const s = startOfDay(parseISO(starts));
  const e = startOfDay(parseISO(ends));
  
  if (status === 'IN_PROGRESS' && now > e) {
    const days = differenceInDays(now, e);
    return `Prazo encerrado (atrasada há ${days} dia${days !== 1 ? 's' : ''})`;
  }

  if (isFuture(s)) {
    const daysUntil = differenceInDays(s, now);
    return `Inicia em ${daysUntil} dia${daysUntil !== 1 ? 's' : ''}`;
  }
  if (isPast(e)) {
    return 'Prazo encerrado';
  }
  const elapsed = differenceInDays(now, s);
  const total = differenceInDays(e, s);
  const pct = Math.min(100, Math.round((elapsed / total) * 100));
  return `${pct}% do período concluído`;
}

function getProgressPct(starts: string, ends: string, status: ObraStatus): number {
  if (status === 'COMPLETED') return 100;
  if (status === 'CANCELED' || status === 'PAUSED') return 0;
  const now = new Date();
  const s = parseISO(starts);
  const e = parseISO(ends);
  if (isFuture(s)) return 0;
  if (isPast(e)) return 100;
  const elapsed = differenceInDays(now, s);
  const total = differenceInDays(e, s);
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export const PublicObra: React.FC = () => {
  const { obraId } = useParams<{ obraId: string }>();
  const [obra, setObra] = useState<PublicObraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!obraId) { setNotFound(true); setLoading(false); return; }
    supabase.rpc('get_public_obra', { p_obra_id: obraId }).then(({ data, error }) => {
      if (error || !data) { setNotFound(true); } else { setObra(data as PublicObraData); }
      setLoading(false);
    });
  }, [obraId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (notFound || !obra) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <HardHat className="h-16 w-16 text-slate-300 mb-4" />
        <h1 className="text-xl font-bold text-slate-700 mb-2">Obra não encontrada</h1>
        <p className="text-slate-500 text-sm">Este link pode estar expirado ou ser inválido.</p>
      </div>
    );
  }

  const now = startOfDay(new Date());
  const end = startOfDay(parseISO(obra.ends_at));
  const daysDelayed = differenceInDays(now, end);
  const isDelayed = obra.status === 'IN_PROGRESS' && daysDelayed > 0;

  const colors = isDelayed
    ? { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' }
    : obraStatusColors[obra.status];

  const banner = isDelayed
    ? {
        icon: AlertTriangle,
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        title: '⚠️ Obra Atrasada',
        message: `Esta área continua com acesso restrito. Os trabalhos estão em andamento, mas ultrapassaram o prazo de conclusão previsto em ${daysDelayed} dia${daysDelayed !== 1 ? 's' : ''}.`,
      }
    : statusBanners[obra.status];

  const BannerIcon = banner.icon;
  const progressPct = getProgressPct(obra.starts_at, obra.ends_at, obra.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Nodus" className="h-7 w-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span className="font-bold text-slate-700">Nodus</span>
        </div>
        <span className="text-slate-300 text-sm mx-1">|</span>
        <span className="text-sm text-slate-500 truncate">Informações da Obra</span>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {/* Status Banner */}
        <div className={`${banner.bg} border ${banner.border} rounded-2xl p-4 flex items-start gap-3`}>
          <BannerIcon className={`h-5 w-5 ${banner.text} shrink-0 mt-0.5`} />
          <div>
            <p className={`font-bold text-sm ${banner.text}`}>{banner.title}</p>
            <p className={`text-xs mt-1 ${banner.text} opacity-80`}>{banner.message}</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-slate-300" />
                  <span className="text-xs text-slate-300">{obra.institution_name}</span>
                </div>
                <h1 className="text-xl font-black leading-tight">{obra.title}</h1>
                {obra.location && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <MapPin className="h-4 w-4 text-amber-400" />
                    <span className="text-sm text-slate-200">{obra.location}</span>
                  </div>
                )}
              </div>
              <span className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${colors.bg} ${colors.text}`}>
                <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                {isDelayed ? `Atrasada (${daysDelayed} dia${daysDelayed !== 1 ? 's' : ''})` : obraStatusLabels[obra.status]}
              </span>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Description */}
            {obra.description && (
              <p className="text-sm text-slate-600 leading-relaxed">{obra.description}</p>
            )}

            {/* Date range */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Período da Obra
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Início previsto</p>
                  <p className="text-sm font-semibold text-slate-700">{formatDate(obra.starts_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Término previsto</p>
                  <p className="text-sm font-semibold text-slate-700">{formatDate(obra.ends_at)}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Duração total: <span className="font-semibold text-slate-700">{getDurationLabel(obra.starts_at, obra.ends_at)}</span>
              </div>

              {/* Progress bar */}
              {obra.status === 'IN_PROGRESS' && (
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Andamento do período</span>
                    <span className="font-semibold text-slate-600">{progressPct}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{getProgressLabel(obra.starts_at, obra.ends_at, obra.status)}</p>
                </div>
              )}
            </div>

            {/* Responsible */}
            {(obra.responsible_name || obra.responsible_contact) && (
              <div className="border border-slate-100 rounded-xl p-4 space-y-2">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Responsável pela Obra
                </h2>
                {obra.responsible_name && (
                  <p className="text-sm font-semibold text-slate-700">{obra.responsible_name}</p>
                )}
                {obra.responsible_contact && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{obra.responsible_contact}</span>
                  </div>
                )}
              </div>
            )}

            {/* Public notes */}
            {obra.public_notes && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <Info className="h-3.5 w-3.5" />
                  Informações Importantes
                </h2>
                <p className="text-sm text-blue-800 leading-relaxed">{obra.public_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 pt-2">
          Informações fornecidas por <span className="font-semibold">{obra.institution_name}</span> via Nodus
        </p>
      </main>
    </div>
  );
};
