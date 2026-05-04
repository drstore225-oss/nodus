import React, { useState } from 'react';
import {
  useInstitutions,
  useCreateInstitution,
  useUpdateInstitution,
  useDeleteInstitution,
} from '../../hooks/useInstitutions';
import { Institution } from '../../types/database.types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { InstitutionForm } from '../../components/institutions/InstitutionForm';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Search,
  FileText,
} from 'lucide-react';

export const Institutions: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Institution | null>(null);
  const [search, setSearch] = useState('');

  const { data: institutions = [], isLoading } = useInstitutions();
  const createMutation = useCreateInstitution();
  const updateMutation = useUpdateInstitution();
  const deleteMutation = useDeleteInstitution();

  const filtered = institutions.filter((i) =>
    i.fantasy_name.toLowerCase().includes(search.toLowerCase()) ||
    (i.corporate_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.cnpj || '').includes(search)
  );

  const handleCreate = async (data: any) => {
    await createMutation.mutateAsync(data);
    setIsFormOpen(false);
  };

  const handleUpdate = async (data: any) => {
    if (!editingInstitution) return;
    await updateMutation.mutateAsync({ id: editingInstitution.id, ...data });
    setEditingInstitution(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMutation.mutateAsync(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Instituições</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie as empresas cadastradas no sistema
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Instituição
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nome, razão social ou CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 h-10 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Nenhuma instituição encontrada</p>
            <p className="text-slate-400 text-sm mt-1">
              {search ? 'Tente buscar por outro termo.' : 'Clique em "Nova Instituição" para começar.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((institution) => (
            <Card key={institution.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex-row items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 truncate">
                    {institution.fantasy_name}
                  </h3>
                  <p className="text-sm text-slate-500 truncate">{institution.corporate_name}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditingInstitution(institution)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(institution)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {institution.cnpj && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span>{institution.cnpj}</span>
                  </div>
                )}
                {institution.city && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span>
                      {institution.street}{institution.number ? `, ${institution.number}` : ''} — {institution.city}/{institution.state}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Criar */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Nova Instituição"
        size="lg"
      >
        <InstitutionForm
          onSubmit={handleCreate}
          isLoading={createMutation.isPending}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      {/* Modal de Editar */}
      <Modal
        isOpen={!!editingInstitution}
        onClose={() => setEditingInstitution(null)}
        title="Editar Instituição"
        size="lg"
      >
        {editingInstitution && (
          <InstitutionForm
            institution={editingInstitution}
            onSubmit={handleUpdate}
            isLoading={updateMutation.isPending}
            onCancel={() => setEditingInstitution(null)}
          />
        )}
      </Modal>

      {/* Modal de Confirmar Exclusão */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Excluir Instituição"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-600">
            Tem certeza que deseja excluir a instituição{' '}
            <strong className="text-slate-900">{deleteConfirm?.fantasy_name}</strong>?
            Esta ação não pode ser desfeita e removerá todos os dados vinculados.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleteMutation.isPending}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
