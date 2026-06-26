import React, { useState, useRef, useEffect } from 'react';
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import {
  useObras,
  useCreateObra,
  useUpdateObra,
  useDeleteObra,
  useObraFiles,
  useAddObraFile,
  useDeleteObraFile,
  obraStatusLabels,
  obraStatusColors,
  type Obra,
  type ObraStatus,
} from '../../hooks/useObras';
import { useBuildings } from '../../hooks/useBuildings';
import { supabase } from '../../lib/supabase';
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
  Briefcase,
  Wrench,
  Receipt,
  FileText,
  Image as ImageIcon,
  Eye,
  Download,
  Upload,
  Info,
  Building,
  Loader2
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
  executor_type: 'INTERNAL' as 'INTERNAL' | 'EXTERNAL',
  materials_budget: '',
  public_notes: '',
  building_id: '',
};

// ─── Obra Card ────────────────────────────────────────────────────────────────

interface ObraCardProps {
  obra: Obra;
  onEdit: (obra: Obra) => void;
  onQr: (obra: Obra) => void;
  onSelectProject?: (obraId: string) => void;
  canManage: boolean;
}

const ObraCard: React.FC<ObraCardProps> = ({ obra, onEdit, onQr, onSelectProject, canManage }) => {
  const now = startOfDay(new Date());
  const end = startOfDay(parseISO(obra.ends_at));
  const daysDelayed = differenceInDays(now, end);
  const isDelayed = obra.status === 'IN_PROGRESS' && daysDelayed > 0;

  const colors = isDelayed
    ? { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' }
    : obraStatusColors[obra.status];

  const range = formatDateRange(obra.starts_at, obra.ends_at);
  const isActive = obra.status === 'IN_PROGRESS';

  return (
    <div
      className={`bg-white rounded-xl border transition-all hover:shadow-md ${
        isDelayed
          ? 'border-red-300 ring-1 ring-red-100'
          : isActive
          ? 'border-amber-300 ring-1 ring-amber-100'
          : 'border-slate-200'
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
            {isDelayed ? `Atrasada (${daysDelayed} dia${daysDelayed !== 1 ? 's' : ''})` : obraStatusLabels[obra.status]}
          </span>
        </div>

        {/* Description */}
        {obra.description && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-2">{obra.description}</p>
        )}

        {/* Date range & Executor */}
        <div className="flex flex-col gap-2 mb-4 bg-slate-50 rounded-lg p-2.5">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-600 font-medium">
              {range.start} → {range.end}
            </span>
            <span className="text-xs text-slate-400 ml-auto">{range.duration}</span>
          </div>
          <div className="flex items-center gap-2 pt-2 mt-1 border-t border-slate-200/60">
            {obra.executor_type === 'INTERNAL' ? (
              <Wrench className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            ) : (
              <Briefcase className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            )}
            <span className="text-xs text-slate-600">
              Execução: <span className="font-medium">{obra.executor_type === 'INTERNAL' ? 'Manutenção Local' : 'Empresa Terceirizada'}</span>
            </span>
          </div>
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
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 flex-wrap">
          <button
            onClick={() => onQr(obra)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors font-medium"
          >
            <QrCode className="h-3.5 w-3.5" />
            QR
          </button>
          <a
            href={getPublicUrl(obra.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition-colors font-medium"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Público
          </a>
          {onSelectProject && (
            <button
              onClick={() => onSelectProject(obra.id)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-medium"
            >
              <FileText className="h-3.5 w-3.5" />
              Projeto
            </button>
          )}
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
  const { profile } = useAuth();
  const { data: buildings = [] } = useBuildings(profile?.institution_id);
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

        {/* Prédio / Edifício */}
        <div>
          <label className={labelCls}>Prédio / Edifício Vinculado</label>
          <div className="relative">
            <select
              className={`${inputCls} pr-8 appearance-none`}
              value={form.building_id || ''}
              onChange={(e) => set('building_id', e.target.value)}
            >
              <option value="">Nenhum prédio (Localização livre)</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({parseFloat(b.total_m2.toString()).toLocaleString('pt-BR')} m²)</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Local */}
        <div>
          <label className={labelCls}>Área / Local de Isolamento (Especificação)</label>
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

        {/* Responsável & Executor */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Quem executa?</label>
            <div className="relative">
              <select
                className={`${inputCls} pr-8 appearance-none`}
                value={form.executor_type}
                onChange={(e) => set('executor_type', e.target.value)}
              >
                <option value="INTERNAL">Manutenção Local</option>
                <option value="EXTERNAL">Empresa Terceirizada</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Nome do Responsável</label>
            <input className={inputCls} value={form.responsible_name} onChange={(e) => set('responsible_name', e.target.value)} placeholder="Nome" />
          </div>
          <div>
            <label className={labelCls}>Contato do Responsável</label>
            <input className={inputCls} value={form.responsible_contact} onChange={(e) => set('responsible_contact', e.target.value)} placeholder="Tel / e-mail" />
          </div>
        </div>

        {/* Materiais e Orçamento */}
        <div>
          <label className={labelCls}>
            <span className="flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-slate-400" />
              Lista de Materiais e Orçamento (Apenas uso interno)
            </span>
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
            rows={4}
            value={form.materials_budget}
            onChange={(e) => set('materials_budget', e.target.value)}
            placeholder="Ex: 50 sacos de cimento (R$ 1.500)&#10;Mão de obra contratada (R$ 5.000)&#10;Total previsto: R$ 6.500"
          />
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

  const activeCount = obras.filter((o) => o.status === 'IN_PROGRESS').length;

  const [activeTab, setActiveTab] = useState<'cronograma' | 'projetos'>('cronograma');
  const [selectedObraId, setSelectedObraId] = useState<string>('');

  // Seleciona a primeira obra por padrão na aba de projetos
  useEffect(() => {
    if (activeTab === 'projetos' && !selectedObraId && obras.length > 0) {
      setSelectedObraId(obras[0].id);
    }
  }, [activeTab, obras, selectedObraId]);

  const selectedObra = obras.find((o) => o.id === selectedObraId);

  // Hooks de Projetos
  const { data: files = [], isLoading: isFilesLoading } = useObraFiles(selectedObraId || null);
  const addFileMutation = useAddObraFile();
  const deleteFileMutation = useDeleteObraFile();

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [projectDescText, setProjectDescText] = useState('');

  // Sincroniza a descrição do projeto quando a obra selecionada muda
  useEffect(() => {
    if (selectedObra) {
      setProjectDescText(selectedObra.project_description ?? '');
    }
  }, [selectedObra]);

  const handleSaveDescription = async () => {
    if (!selectedObraId) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedObraId,
        project_description: projectDescText,
      } as any);
      setIsEditingDescription(false);
    } catch (err: any) {
      alert('Erro ao salvar descrição: ' + err.message);
    }
  };

  // Uploads
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputBlueprintRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, type: 'BLUEPRINT' | 'IDEA_GALLERY') => {
    const file = e.target.files?.[0];
    if (!file || !selectedObraId) return;

    setIsUploadingFile(true);
    setUploadError(null);

    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `obras/${selectedObraId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('attachments')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadErr) throw new Error(uploadErr.message);

      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);

      await addFileMutation.mutateAsync({
        obra_id: selectedObraId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: type,
      });

    } catch (err: any) {
      setUploadError(err.message || 'Erro ao fazer upload do arquivo.');
    } finally {
      setIsUploadingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!selectedObraId) return;
    if (confirm('Deseja realmente remover este arquivo do projeto?')) {
      try {
        await deleteFileMutation.mutateAsync({ id: fileId, obraId: selectedObraId });
      } catch (err: any) {
        alert('Erro ao excluir arquivo: ' + err.message);
      }
    }
  };

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const handleCreate = async (form: typeof emptyForm) => {
    if (!profile?.institution_id) return;
    await createMutation.mutateAsync({
      ...form,
      institution_id: profile.institution_id,
      created_by: user!.id,
      starts_at: new Date(form.starts_at + 'T00:00:00').toISOString(),
      ends_at: new Date(form.ends_at + 'T23:59:59').toISOString(),
      building_id: form.building_id || null,
    });
    setIsCreateOpen(false);
  };

  const handleUpdate = async (form: typeof emptyForm) => {
    if (!editObra) return;
    await updateMutation.mutateAsync({
      id: editObra.id,
      ...form,
      starts_at: new Date(form.starts_at + 'T00:00:00').toISOString(),
      ends_at: new Date(form.ends_at + 'T23:59:59').toISOString(),
      building_id: form.building_id || null,
    });
    setEditObra(null);
  };

  const handleDelete = async () => {
    if (!editObra) return;
    await deleteMutation.mutateAsync(editObra.id);
    setEditObra(null);
  };

  const handleSelectProjectTab = (obraId: string) => {
    setSelectedObraId(obraId);
    setActiveTab('projetos');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Obras e Projetos</h1>
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
        {canManage && activeTab === 'cronograma' && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Obra
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('cronograma')}
          className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'cronograma'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <CalendarRange className="h-4 w-4" />
          Cronograma / Obras Ativas
        </button>
        <button
          onClick={() => setActiveTab('projetos')}
          className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'projetos'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <FileText className="h-4 w-4" />
          Projetos e Plantas (Galeria de Ideias)
        </button>
      </div>

      {activeTab === 'cronograma' ? (
        <>
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
                  onSelectProject={handleSelectProjectTab}
                  canManage={canManage}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          {/* Seletor de Obra para o Projeto */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                Vincular Projeto à Obra
              </h3>
              <p className="text-xs text-slate-500">Selecione uma obra ativa da sua instituição para gerenciar plantas e referências.</p>
            </div>
            <div className="relative">
              <select
                className="h-10 rounded-lg border border-slate-300 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[280px] appearance-none"
                value={selectedObraId}
                onChange={(e) => setSelectedObraId(e.target.value)}
              >
                <option value="">-- Selecione uma Obra --</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>{o.title}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {!selectedObraId ? (
            <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-sm">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Nenhuma obra selecionada</p>
              <p className="text-slate-400 text-sm mt-1">Selecione uma obra no seletor acima para visualizar e gerenciar o projeto correspondente.</p>
            </div>
          ) : !selectedObra ? (
            <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-sm">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Obra não encontrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Coluna de Descrição e Plantas */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Descrição do Projeto */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Descrição do Projeto
                    </h2>
                    {canManage && !isEditingDescription && (
                      <Button size="sm" variant="outline" onClick={() => setIsEditingDescription(true)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                    )}
                  </div>
                  <div className="p-6">
                    {isEditingDescription ? (
                      <div className="space-y-4">
                        <textarea
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          rows={6}
                          value={projectDescText}
                          onChange={(e) => setProjectDescText(e.target.value)}
                          placeholder="Descreva o projeto, materiais a serem usados, plantas e ideias..."
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            setProjectDescText(selectedObra?.project_description ?? '');
                            setIsEditingDescription(false);
                          }}>Cancelar</Button>
                          <Button size="sm" onClick={handleSaveDescription}>Salvar Projeto</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="prose max-w-none">
                        {selectedObra?.project_description ? (
                          <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed">{selectedObra.project_description}</p>
                        ) : (
                          <p className="text-slate-400 text-sm italic">Nenhum detalhe do projeto cadastrado para esta obra. Clique em "Editar" para descrever o que será feito.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Plantas Baixas */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Plantas do Projeto (PDF / Imagens)
                    </h2>
                    {canManage && (
                      <div>
                        <input
                          type="file"
                          ref={fileInputBlueprintRef}
                          className="hidden"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleUploadFile(e, 'BLUEPRINT')}
                        />
                        <Button size="sm" disabled={isUploadingFile} onClick={() => fileInputBlueprintRef.current?.click()}>
                          {isUploadingFile ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                          Enviar Planta
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="p-6 space-y-3">
                    {uploadError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">⚠️ {uploadError}</p>}
                    
                    {isFilesLoading ? (
                      <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
                    ) : files.filter(f => f.file_type === 'BLUEPRINT').length === 0 ? (
                      <p className="text-sm text-slate-400 italic">Nenhuma planta anexada a este projeto.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {files.filter(f => f.file_type === 'BLUEPRINT').map(file => (
                          <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-slate-400" />
                              <div>
                                <p className="text-sm font-medium text-slate-700 truncate max-w-[250px] sm:max-w-[400px]">{file.file_name}</p>
                                <p className="text-[10px] text-slate-400">{format(parseISO(file.created_at), "dd/MM/yyyy HH:mm")}</p>
                              </div>
                            </div>
                            <div className="flex gap-1.5">
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                title="Visualizar"
                              >
                                <Eye className="h-4 w-4" />
                              </a>
                              <a
                                href={file.file_url}
                                download
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFile(file.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  title="Deletar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Coluna da Galeria de Ideias */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-full min-h-[400px]">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-purple-600" />
                      Galeria de Ideias
                    </h2>
                    {canManage && (
                      <div>
                        <input
                          type="file"
                          ref={fileInputGalleryRef}
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleUploadFile(e, 'IDEA_GALLERY')}
                        />
                        <button
                          type="button"
                          disabled={isUploadingFile}
                          onClick={() => fileInputGalleryRef.current?.click()}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 border border-purple-200 rounded-lg"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex-1 overflow-y-auto">
                    {isFilesLoading ? (
                      <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
                    ) : files.filter(f => f.file_type === 'IDEA_GALLERY').length === 0 ? (
                      <p className="text-sm text-slate-400 italic text-center py-12">Nenhuma imagem inspiradora adicionada à galeria.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {files.filter(f => f.file_type === 'IDEA_GALLERY').map(file => (
                          <div key={file.id} className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-sm hover:shadow transition-shadow">
                            <img
                              src={file.file_url}
                              alt={file.file_name}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => setLightboxUrl(file.file_url)}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setLightboxUrl(file.file_url)}
                                className="p-1.5 bg-white text-slate-800 rounded-full hover:bg-slate-100 transition-colors shadow"
                                title="Ampliar"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {canManage && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFile(file.id)}
                                  className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow"
                                  title="Remover"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
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
              starts_at: format(parseISO(editObra.starts_at), 'yyyy-MM-dd'),
              ends_at: format(parseISO(editObra.ends_at), 'yyyy-MM-dd'),
              description: editObra.description ?? '',
              location: editObra.location ?? '',
              responsible_name: editObra.responsible_name ?? '',
              responsible_contact: editObra.responsible_contact ?? '',
              executor_type: editObra.executor_type,
              materials_budget: editObra.materials_budget ?? '',
              public_notes: editObra.public_notes ?? '',
              building_id: editObra.building_id ?? '',
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

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <Modal isOpen onClose={() => setLightboxUrl(null)} title="Visualização da Ideia" size="lg">
          <div className="flex flex-col items-center gap-4 bg-slate-900 p-2 rounded-xl overflow-hidden">
            <img src={lightboxUrl} alt="Ideia Ampliada" className="max-h-[70vh] object-contain rounded-lg" />
            <Button variant="outline" className="text-white hover:text-slate-800" onClick={() => setLightboxUrl(null)}>Fechar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
