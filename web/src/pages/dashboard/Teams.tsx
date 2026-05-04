import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTeams, useCreateTeam, useUpdateTeam, useDeleteTeam, Team } from '../../hooks/useTeams';
import { useInstitutions } from '../../hooks/useInstitutions';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select } from '../../components/ui/Select';
import { UsersRound, Plus, Pencil, Trash2, Search } from 'lucide-react';

const teamSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  institution_id: z.string().uuid('Selecione uma instituição'),
});

type TeamFormValues = z.infer<typeof teamSchema>;

export const TeamsPage: React.FC = () => {
  const { profile } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Team | null>(null);
  const [search, setSearch] = useState('');

  const isSuperAdmin = profile?.role === 'SUPERADMIN';
  const { data: teams = [], isLoading } = useTeams(
    isSuperAdmin ? undefined : profile?.institution_id ?? undefined
  );
  const { data: institutions = [] } = useInstitutions();
  const createMutation = useCreateTeam();
  const updateMutation = useUpdateTeam();
  const deleteMutation = useDeleteTeam();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: { institution_id: profile?.institution_id || '' },
  });

  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    ((t.institution as any)?.fantasy_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data: TeamFormValues) => {
    await createMutation.mutateAsync(data);
    setIsFormOpen(false);
    reset();
  };

  const handleUpdate = async (data: TeamFormValues) => {
    if (!editingTeam) return;
    await updateMutation.mutateAsync({ id: editingTeam.id, name: data.name });
    setEditingTeam(null);
    reset();
  };

  const openCreate = () => {
    reset({ name: '', institution_id: profile?.institution_id || '' });
    setIsFormOpen(true);
  };

  const openEdit = (team: Team) => {
    setEditingTeam(team);
    reset({ name: team.name, institution_id: team.institution_id });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Equipes</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie as equipes de manutenção</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Equipe
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar equipe..."
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
              <UsersRound className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Nenhuma equipe encontrada</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-6 font-medium text-slate-500">Nome da Equipe</th>
                  {isSuperAdmin && (
                    <th className="text-left py-3 px-4 font-medium text-slate-500 hidden md:table-cell">Instituição</th>
                  )}
                  <th className="text-left py-3 px-4 font-medium text-slate-500">Criada em</th>
                  <th className="py-3 px-4 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((team) => (
                  <tr key={team.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                          <UsersRound className="h-4 w-4 text-cyan-600" />
                        </div>
                        <span className="font-medium text-slate-800">{team.name}</span>
                      </div>
                    </td>
                    {isSuperAdmin && (
                      <td className="py-3 px-4 text-slate-500 hidden md:table-cell">
                        {(team.institution as any)?.fantasy_name || '—'}
                      </td>
                    )}
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(team.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(team)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(team)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
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
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Nova Equipe">
        <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Equipe *</Label>
            <div className="mt-1">
              <Input id="name" placeholder="Ex: Equipe Elétrica" error={errors.name?.message} {...register('name')} />
            </div>
          </div>
          {isSuperAdmin && (
            <div>
              <Label htmlFor="institution_id">Instituição *</Label>
              <div className="mt-1">
                <Select
                  id="institution_id"
                  placeholder="Selecione uma instituição"
                  options={institutions.map((i) => ({ value: i.id, label: i.fantasy_name }))}
                  error={errors.institution_id?.message}
                  {...register('institution_id')}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Criar Equipe</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingTeam} onClose={() => setEditingTeam(null)} title="Editar Equipe">
        <form onSubmit={handleSubmit(handleUpdate)} className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Nome da Equipe *</Label>
            <div className="mt-1">
              <Input id="edit-name" error={errors.name?.message} {...register('name')} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setEditingTeam(null)}>Cancelar</Button>
            <Button type="submit" isLoading={updateMutation.isPending}>Salvar</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Excluir Equipe" size="sm">
        <div className="space-y-4">
          <p className="text-slate-600">
            Excluir a equipe <strong>{deleteConfirm?.name}</strong>? Usuários vinculados serão desvinculados.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (deleteConfirm) {
                  await deleteMutation.mutateAsync(deleteConfirm.id);
                  setDeleteConfirm(null);
                }
              }}
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
