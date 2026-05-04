import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useCostCenters, useCreateCostCenter, useUpdateCostCenter, useDeleteCostCenter, CostCenter
} from '../../hooks/useCostCenters';
import { useInstitutions } from '../../hooks/useInstitutions';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select } from '../../components/ui/Select';
import { Layers, Plus, Pencil, Trash2, Search } from 'lucide-react';

const schema = z.object({
  code: z.string().min(1, 'Código obrigatório'),
  name: z.string().min(2, 'Nome obrigatório'),
  institution_id: z.string().uuid('Selecione uma instituição'),
});

type FormValues = z.infer<typeof schema>;

export const CostCentersPage: React.FC = () => {
  const { profile } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CostCenter | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CostCenter | null>(null);
  const [search, setSearch] = useState('');

  const isSuperAdmin = profile?.role === 'SUPERADMIN';
  const { data: items = [], isLoading } = useCostCenters(
    isSuperAdmin ? undefined : profile?.institution_id ?? undefined
  );
  const { data: institutions = [] } = useInstitutions();
  const createMutation = useCreateCostCenter();
  const updateMutation = useUpdateCostCenter();
  const deleteMutation = useDeleteCostCenter();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { institution_id: profile?.institution_id || '' },
  });

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.code.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    reset({ code: '', name: '', institution_id: profile?.institution_id || '' });
    setIsFormOpen(true);
  };

  const openEdit = (item: CostCenter) => {
    setEditingItem(item);
    reset({ code: item.code, name: item.name, institution_id: item.institution_id });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Centros de Custo</h1>
          <p className="text-sm text-slate-500 mt-1">Associados a cada instituição</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Centro de Custo
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por código ou nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 h-10 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Nenhum centro de custo encontrado</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-6 font-medium text-slate-500">Código</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Nome</th>
                  {isSuperAdmin && (
                    <th className="text-left py-3 px-4 font-medium text-slate-500 hidden md:table-cell">Instituição</th>
                  )}
                  <th className="py-3 px-4 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-6">
                      <span className="font-mono text-sm bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {item.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{item.name}</td>
                    {isSuperAdmin && (
                      <td className="py-3 px-4 text-slate-500 hidden md:table-cell">
                        {(item.institution as any)?.fantasy_name || '—'}
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(item)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Novo Centro de Custo">
        <form onSubmit={handleSubmit(async (d) => { await createMutation.mutateAsync(d); setIsFormOpen(false); reset(); })} className="space-y-4">
          {isSuperAdmin && (
            <div>
              <Label>Instituição *</Label>
              <div className="mt-1">
                <Select
                  placeholder="Selecione"
                  options={institutions.map((i) => ({ value: i.id, label: i.fantasy_name }))}
                  error={errors.institution_id?.message}
                  {...register('institution_id')}
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Código *</Label>
              <div className="mt-1">
                <Input placeholder="CC001" error={errors.code?.message} {...register('code')} />
              </div>
            </div>
            <div>
              <Label>Nome *</Label>
              <div className="mt-1">
                <Input placeholder="Nome do Centro" error={errors.name?.message} {...register('name')} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Criar</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Editar Centro de Custo">
        <form onSubmit={handleSubmit(async (d) => { if (!editingItem) return; await updateMutation.mutateAsync({ id: editingItem.id, name: d.name, code: d.code }); setEditingItem(null); })} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Código *</Label>
              <div className="mt-1">
                <Input error={errors.code?.message} {...register('code')} />
              </div>
            </div>
            <div>
              <Label>Nome *</Label>
              <div className="mt-1">
                <Input error={errors.name?.message} {...register('name')} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>Cancelar</Button>
            <Button type="submit" isLoading={updateMutation.isPending}>Salvar</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Excluir Centro de Custo" size="sm">
        <div className="space-y-4">
          <p className="text-slate-600">Excluir o centro de custo <strong>{deleteConfirm?.name}</strong>?</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => { if (deleteConfirm) { await deleteMutation.mutateAsync(deleteConfirm.id); setDeleteConfirm(null); } }}
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
