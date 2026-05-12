import React, { useState } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import {
  useObras,
  useCreateObra,
  useUpdateObra,
  useDeleteObra,
  obraStatusLabels,
  obraStatusColors,
  type Obra,
  type ObraStatus,
} from '../../hooks/useObras';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import {
  HardHat,
  Plus,
  MapPin,
  Calendar,
  User,
  Phone,
  QrCode,
  Link2,
  Pencil,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  CheckCircle,
  PauseCircle,
  XCircle,
  CalendarRange,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: ObraStatus[] = ['PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELED'];

const StatusIcon: React.FC<{ status: ObraStatus; className?: string }> = ({ status, className = 'h-4 w-4' }) => {
  const icons = {
    PLANNED: CalendarRange,
    IN_PROGRESS: HardHat,
    PAUSED: PauseCircle,
    COMPLETED: CheckCircle,
    CANCELED: XCircle,
  };
  const Icon = icons[status];
  return <Icon className={className} />;
};

function formatDateRange(starts: string, ends: string) {
  const s = parseISO(starts);
  const e = parseISO(ends);
  const days = differenceInDays(e, s) + 1;
  return {
    start: format(s, "dd/MM/yyyy", { locale: ptBR }),
    end: format(e, "dd/MM/yyyy", { locale: ptBR }),
    duration: `${days} dia${days !== 1 ? 's' : ''}`,
  };
}

function getPublicUrl(id: string) {
  return `${window.location.origin}/obra/${id}`;
}

function getQrUrl(id: string) {
  const url = encodeURIComponent(getPublicUrl(id));
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${url}&margin=16&color=1e293b&bgcolor=ffffff`;
}

// ─── Empty Form ───────────────────────────────────────────────────────────────

const emptyForm = {
  title: '',
  description: '',
  location: '',
  status: 'PLANNED' as ObraStatus,
  starts_at: '',
  ends_at: '',
  responsible_name: '',
  responsible_contact: '',
  public_notes: '',
};

// ─── Obra Card ────────────────────────────────────────────────────────────────

interface ObraCardProps {
  obra: Obra;
  onEdit: (obra: Obra) => void;
  onQr: (obra: Obra) => void;
  canManage: boolean;
}

const ObraCard: React.FC<ObraCardProps> = ({ obra, onEdit, onQr, canManage }) => {
  const colors = obraStatusColors[obra.status];
  const range = formatDateRange(obra.starts_at, obra.ends_at);
  const isActive = obra.status === 'IN_PROGRESS';

  return (
    <div
      className={`bg-white rounded-xl border transition-all hover:shadow-md ${
        isActive ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-200'
      }`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`p-2 rounded-lg shrink-0 ${colors.bg}`}>
              <StatusIcon status={obra.status} className={`h-4 w-4 ${colors.text}`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-800 text-sm leading-snug truncate">{obra.title}</h3>
              {obra.location && (
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{obra.location}</span>
                </div>
              )}
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 flex items-center gap-1 ${colors.bg} ${colors.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
            {obraStatusLabels[obra.status]}
          </span>
        </div>

        {/* Description */}
        {obra.description && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-2">{obra.description}</p>
        )}

        {/* Date range */}
        <div className="flex items-center gap-2 mb-4 bg-slate-50 rounded-lg p-2.5">
          <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-600 font-medium">
            {range.start} → {range.end}
          </span>
          <span className="text-xs text-slate-400 ml-auto">{range.duration}</span>
        </div>

        {/* Responsible */}
        {obra.responsible_name && (
          <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span>{obra.responsible_name}</span>
            {obra.responsible_contact && (
              <>
                <Phone className="h-3 w-3 text-slate-300 ml-2" />
                <span>{obra.responsible_contact}</span>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={() => onQr(obra)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors font-medium"
          >
            <QrCode className="h-3.5 w-3.5" />
            QR Code
          </button>
          <a
            href={getPublicUrl(obra.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition-colors font-medium"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Link Público
          </a>
          {canManage && (
            <button
              onClick={() => onEdit(obra)}
              className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── QR Modal ─────────────────────────────────────────────────────────────────

const QrModal: React.FC<{ obra: Obra; onClose: () => void }> = ({ obra, onClose }) => {
  const publicUrl = getPublicUrl(obra.id);
  const qrUrl = getQrUrl(obra.id);
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen onClose={onClose} title="QR Code da Obra" size="sm">
      <div className="space-y-5">
        <div className="text-center">
          <h3 className="font-semibold text-slate-800">{obra.title}</h3>
          {obra.location && <p className="text-sm text-slate-500 mt-1">{obra.location}</p>}
        </div>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm">
            <img
              src={qrUrl}
              alt="QR Code"
              className="w-56 h-56 rounded-lg"
            />
          </div>
        </div>

        {/* URL */}
        <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-600 flex-1 truncate font-mono">{publicUrl}</span>
          <button
            onClick={copyLink}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 ${
              copied ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>

        {/* Download */}
        <div className="flex gap-3">
          <a
            href={qrUrl}
            download={`qrcode-${obra.id}.png`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <QrCode className="h-4 w-4" />
            Baixar QR Code
          </a>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Obra Form ────────────────────────────────────────────────────────────────

interface ObraFormProps {
  initial?: Partial<typeof emptyForm>;
  onSubmit: (data: typeof emptyForm) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  mode: 'create' | 'edit';
  onDelete?: () => void;
}

const ObraForm: React.FC<ObraFormProps> = ({ initial, onSubmit, onCancel, isLoading, mode, onDelete }) => {
  const [form, setForm] = useState({ ...emptyForm, ...initial });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (field: keyof typeof emptyForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.starts_at || !form.ends_at) return;
    await onSubmit(form);
  };

  const inputCls = 'w-full h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white';
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {/* Título */}
        <div>
          <label className={labelCls}>Título da Obra *</label>
          <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex: Reforma do Corredor B" required />
        </div>

        {/* Descrição */}
        <div>
          <label className={labelCls}>Descrição</label>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Descreva o escopo da obra..."
          />
        </div>

        {/* Local */}
        <div>
          <label className={labelCls}>Área / Local de Isolamento</label>
          <input className={inputCls} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Ex: Ala Norte, 2º andar" />
        </div>

        {/* Status */}
        <div>
          <label className={labelCls}>Status</label>
          <div className="relative">
            <select
              className={`${inputCls} pr-8 appearance-none`}
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{obraStatusLabels[s]}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Início *</label>
            <input type="date" className={inputCls} value={form.starts_at.slice(0, 10)} onChange={(e) => set('starts_at', e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Término *</label>
            <input type="date" className={inputCls} value={form.ends_at.slice(0, 10)} onChange={(e) => set('ends_at', e.target.value)} required />
          </div>
        </div>

        {/* Responsável */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Responsável</label>
            <input className={inputCls} value={form.responsible_name} onChange={(e) => set('responsible_name', e.target.value)} placeholder="Nome" />
          </div>
          <div>
            <label className={labelCls}>Contato</label>
            <input className={inputCls} value={form.responsible_contact} onChange={(e) => set('responsible_contact', e.target.value)} placeholder="Tel / e-mail" />
          </div>
        </div>

        {/* Aviso público */}
        <div>
          <label className={labelCls}>Avisos para o Público (visível no QR code)</label>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
            rows={3}
            value={form.public_notes}
            onChange={(e) => set('public_notes', e.target.value)}
            placeholder="Ex: Acesso ao corredor B estará bloqueado. Use a passagem alternativa pela Ala Sul."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        {mode === 'edit' && onDelete && (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 font-medium">Confirmar exclusão?</span>
              <button type="button" onClick={onDelete} className="text-xs px-2 py-1 bg-red-600 text-white rounded-md font-medium hover:bg-red-700">Excluir</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-1 border border-slate-300 rounded-md">Cancelar</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors font-medium"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </button>
          )
        )}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : mode === 'create' ? 'Criar Obra' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>
    </form>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const ObrasPage: React.FC = () => {
  const { profile, user } = useAuth();
  const canManage = ['ADMIN', 'GESTOR', 'SUPERADMIN'].includes(profile?.role || '');

  const { data: obras = [], isLoading } = useObras(profile?.institution_id ?? undefined);

  const createMutation = useCreateObra();
  const updateMutation = useUpdateObra();
  const deleteMutation = useDeleteObra();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editObra, setEditObra] = useState<Obra | null>(null);
  const [qrObra, setQrObra] = useState<Obra | null>(null);
  const [statusFilter, setStatusFilter] = useState<ObraStatus | ''>('');

  const filtered = statusFilter ? obras.filter((o) => o.status === statusFilter) : obras;

  const handleCreate = async (form: typeof emptyForm) => {
    if (!profile?.institution_id) return;
    await createMutation.mutateAsync({
      ...form,
      institution_id: profile.institution_id,
      created_by: user!.id,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at + 'T23:59:59').toISOString(),
    });
    setIsCreateOpen(false);
  };

  const handleUpdate = async (form: typeof emptyForm) => {
    if (!editObra) return;
    await updateMutation.mutateAsync({
      id: editObra.id,
      ...form,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at + 'T23:59:59').toISOString(),
    });
    setEditObra(null);
  };

  const handleDelete = async () => {
    if (!editObra) return;
    await deleteMutation.mutateAsync(editObra.id);
    setEditObra(null);
  };

  const activeCount = obras.filter((o) => o.status === 'IN_PROGRESS').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Obras</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isLoading ? '...' : `${obras.length} obra${obras.length !== 1 ? 's' : ''} cadastrada${obras.length !== 1 ? 's' : ''}`}
            {activeCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-medium">
                <AlertTriangle className="h-3 w-3" />
                {activeCount} em andamento
              </span>
            )}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Obra
          </Button>
        )}
      </div>

      {/* Active work banner */}
      {activeCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <HardHat className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-800 text-sm">
              {activeCount === 1 ? '1 obra em andamento' : `${activeCount} obras em andamento`}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Há áreas com acesso restrito ou isolamento ativo no momento.</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('')}
          className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
            statusFilter === '' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Todas
        </button>
        {STATUS_OPTIONS.map((s) => {
          const c = obraStatusColors[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                statusFilter === s
                  ? `${c.bg} ${c.text} ring-1 ring-current`
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${statusFilter === s ? c.dot : 'bg-slate-300'}`} />
              {obraStatusLabels[s]}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <HardHat className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">
            {statusFilter ? 'Nenhuma obra com este status' : 'Nenhuma obra cadastrada'}
          </p>
          {canManage && !statusFilter && (
            <p className="text-slate-400 text-sm mt-1">
              Clique em "Nova Obra" para cadastrar uma intervenção.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((obra) => (
            <ObraCard
              key={obra.id}
              obra={obra}
              onEdit={setEditObra}
              onQr={setQrObra}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Nova Obra" size="lg">
        <ObraForm
          mode="create"
          onSubmit={handleCreate}
          onCancel={() => setIsCreateOpen(false)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      {editObra && (
        <Modal isOpen onClose={() => setEditObra(null)} title="Editar Obra" size="lg">
          <ObraForm
            mode="edit"
            initial={{
              ...editObra,
              starts_at: editObra.starts_at.slice(0, 10),
              ends_at: editObra.ends_at.slice(0, 10),
              description: editObra.description ?? '',
              location: editObra.location ?? '',
              responsible_name: editObra.responsible_name ?? '',
              responsible_contact: editObra.responsible_contact ?? '',
              public_notes: editObra.public_notes ?? '',
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditObra(null)}
            onDelete={handleDelete}
            isLoading={updateMutation.isPending || deleteMutation.isPending}
          />
        </Modal>
      )}

      {/* QR Code Modal */}
      {qrObra && <QrModal obra={qrObra} onClose={() => setQrObra(null)} />}
    </div>
  );
};
