import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { useTicketStats } from '../../hooks/useTickets';
import { useAuth } from '../../contexts/AuthContext';
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertTriangle,
  Flame,
  TrendingUp,
  Activity,
  Timer,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── Helpers ────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatHours(h: number) {
  if (h < 1) return '< 1h';
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-slate-100 ${className}`} />
);

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number | undefined;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  isLoading?: boolean;
  alert?: boolean;
  linkTo?: string;
  sub?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  label, value, icon: Icon, iconBg, iconColor, isLoading, alert, linkTo, sub,
}) => {
  const inner = (
    <div
      className={`relative bg-white rounded-2xl border p-5 flex items-start gap-4 transition-all hover:shadow-md group ${
        alert ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'
      }`}
    >
      <div className={`p-3 rounded-xl ${iconBg} shrink-0`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        {isLoading ? (
          <Skeleton className="h-8 w-20 mt-1" />
        ) : (
          <p className={`text-3xl font-black mt-0.5 leading-none ${alert ? 'text-red-600' : 'text-slate-800'}`}>
            {value ?? '—'}
          </p>
        )}
        {sub && !isLoading && (
          <p className="text-xs text-slate-400 mt-1">{sub}</p>
        )}
      </div>
      {linkTo && (
        <span className="absolute top-4 right-4 text-slate-300 text-xs group-hover:text-blue-500 transition-colors">
          →
        </span>
      )}
    </div>
  );

  return linkTo ? <Link to={linkTo}>{inner}</Link> : inner;
};

// ─── Chart Card wrapper ───────────────────────────────────────────────────────

const ChartCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title, subtitle, children,
}) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-6">
    <div className="mb-5">
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      {label && <p className="font-semibold mb-1">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const Overview: React.FC = () => {
  const { user, profile } = useAuth();
  const { data: s, isLoading } = useTicketStats();

  const roleStyles: Record<string, string> = {
    SUPERADMIN: 'bg-purple-100 text-purple-700',
    ADMIN: 'bg-blue-100 text-blue-700',
    GESTOR: 'bg-cyan-100 text-cyan-700',
    TECNICO: 'bg-emerald-100 text-emerald-700',
    SOLICITANTE: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">
            {greeting()}, {user?.email?.split('@')[0]}! 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link
          to="/chamados"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Ticket className="h-4 w-4" />
          Novo Chamado
        </Link>
      </div>

      {/* ── SLA Warning Banner ── */}
      {(s?.slaBreached ?? 0) > 0 && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-red-800 font-semibold text-sm flex-1">
            ⚠️ {s!.slaBreached} chamado{s!.slaBreached > 1 ? 's' : ''} com SLA estourado. Ação imediata necessária.
          </p>
          <Link
            to="/chamados"
            className="text-xs text-red-700 hover:text-red-900 font-semibold underline whitespace-nowrap"
          >
            Ver agora →
          </Link>
        </div>
      )}

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total de Chamados"
          value={s?.total}
          icon={Activity}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
          isLoading={isLoading}
          linkTo="/chamados"
        />
        <KpiCard
          label="Abertos"
          value={s?.open}
          icon={Ticket}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          isLoading={isLoading}
          linkTo="/chamados"
        />
        <KpiCard
          label="Em Andamento"
          value={s?.inProgress}
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          isLoading={isLoading}
          linkTo="/chamados"
        />
        <KpiCard
          label="Resolvidos"
          value={s?.resolved}
          icon={CheckCircle}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="SLA Estourado"
          value={s?.slaBreached}
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          isLoading={isLoading}
          alert={(s?.slaBreached ?? 0) > 0}
          linkTo="/chamados"
        />
        <KpiCard
          label="Críticos Abertos"
          value={s?.critical}
          icon={Flame}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
          isLoading={isLoading}
          alert={(s?.critical ?? 0) > 0}
          linkTo="/chamados"
        />
        <KpiCard
          label="Taxa de Resolução"
          value={isLoading ? undefined : `${s?.resolutionRate ?? 0}%`}
          icon={ShieldCheck}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
          isLoading={isLoading}
          sub="chamados encerrados / total"
        />
        <KpiCard
          label="Tempo Médio"
          value={isLoading ? undefined : (s?.avgResolutionHours ? formatHours(s.avgResolutionHours) : '—')}
          icon={Timer}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          isLoading={isLoading}
          sub="média de resolução"
        />
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Area chart – Tendência mensal */}
        <ChartCard
          title="Tendência Mensal"
          subtitle="Chamados abertos vs. resolvidos nos últimos 6 meses"
        >
          {isLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={s?.monthlyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAbertos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradResolvidos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                  formatter={(v) => <span style={{ color: '#64748b' }}>{v}</span>}
                />
                <Area type="monotone" dataKey="abertos" name="Abertos" stroke="#3b82f6" strokeWidth={2} fill="url(#gradAbertos)" dot={{ r: 3, fill: '#3b82f6' }} />
                <Area type="monotone" dataKey="resolvidos" name="Resolvidos" stroke="#10b981" strokeWidth={2} fill="url(#gradResolvidos)" dot={{ r: 3, fill: '#10b981' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Donut – Distribuição por prioridade */}
        <ChartCard title="Distribuição por Prioridade" subtitle="Todos os chamados">
          {isLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="55%" height={210}>
                <PieChart>
                  <Pie
                    data={s?.byPriority}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {s?.byPriority.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <ul className="space-y-2.5 flex-1 min-w-0">
                {s?.byPriority.map((p) => (
                  <li key={p.name} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
                      <span className="text-slate-600 truncate">{p.name}</span>
                    </div>
                    <span className="font-bold text-slate-800 shrink-0">{p.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bar chart – por status */}
        <div className="md:col-span-2">
          <ChartCard title="Chamados por Status" subtitle="Visão geral do pipeline">
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={s?.byStatus} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" name="Chamados" radius={[6, 6, 0, 0]}>
                    {s?.byStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Info card – Perfil + SLA */}
        <div className="space-y-4">
          {/* Perfil */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-700">Seu Perfil</h3>
            </div>
            <dl className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <dt className="text-slate-400">E-mail</dt>
                <dd className="text-slate-700 font-medium truncate max-w-[140px] text-right">{user?.email}</dd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <dt className="text-slate-400">Acesso</dt>
                <dd>
                  <span className={`font-semibold px-2 py-0.5 rounded text-xs ${roleStyles[profile?.role ?? ''] ?? 'bg-slate-100 text-slate-600'}`}>
                    {profile?.role ?? '...'}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between items-center text-sm">
                <dt className="text-slate-400">Total</dt>
                <dd className="text-slate-700 font-bold">{isLoading ? '...' : s?.total} chamados</dd>
              </div>
            </dl>
          </div>

          {/* SLA Reference */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
            <h3 className="text-sm font-bold mb-1">SLA por Prioridade</h3>
            <p className="text-blue-200 text-xs mb-4">Prazos configurados no sistema</p>
            <ul className="space-y-2">
              {[
                { label: 'Crítica', time: '4h', color: '#f87171' },
                { label: 'Alta', time: '24h', color: '#fb923c' },
                { label: 'Média', time: '72h', color: '#fbbf24' },
                { label: 'Baixa', time: '7d', color: '#4ade80' },
              ].map((item) => (
                <li key={item.label} className="flex items-center gap-2.5 text-sm">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-blue-100 flex-1">{item.label}</span>
                  <span className="font-bold">{item.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
