import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useUsers, useUpdateUserRole, useCreateUser } from '../../hooks/useUsers';
import type { ProfileWithTeam } from '../../hooks/useUsers';
import { useInstitutions } from '../../hooks/useInstitutions';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/database.types';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Label } from '../../components/ui/Label';
import { Users, Search, Pencil, Plus } from 'lucide-react';

const roleLabels: Record<UserRole, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN: 'Admin',
  GESTOR: 'Gestor',
  TECNICO: 'Técnico',
  SOLICITANTE: 'Solicitante',
};

const roleBadgeVariant: Record<UserRole, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  SUPERADMIN: 'danger',
  ADMIN: 'info',
  GESTOR: 'warning',
  TECNICO: 'success',
  SOLICITANTE: 'default',
};

const roleOptions = Object.entries(roleLabels).map(([v, l]) => ({ value: v, label: l }));

export const UsersPage: React.FC = () => {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<ProfileWithTeam | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (profile?.role !== 'SUPERADMIN') {
    return <Navigate to="/" replace />;
  }

  const { data: users = [], isLoading } = useUsers();
  const { data: institutions = [] } = useInstitutions();
  const updateMutation = useUpdateUserRole();
  const createMutation = useCreateUser();

  const { register, handleSubmit, reset } = useForm<{
    role: UserRole;
    institution_id: string;
    team_id: string;
  }>();

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<{
    email: string;
    password: string;
    role: UserRole;
    institution_id: string;
  }>({
    defaultValues: {
      role: 'SOLICITANTE' as UserRole,
      institution_id: '',
    },
  });

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (user: ProfileWithTeam) => {
    setEditingUser(user);
    reset({
      role: user.role,
      institution_id: user.institution_id || '',
      team_id: user.team_id || '',
    });
  };

  const onSubmit = async (data: { role: UserRole; institution_id: string; team_id: string }) => {
    if (!editingUser) return;
    await updateMutation.mutateAsync({
      userId: editingUser.id,
      role: data.role,
      institutionId: data.institution_id || null,
      teamId: data.team_id || null,
    });
    setEditingUser(null);
  };

  const onCreateSubmit = async (data: {
    email: string;
    password: string;
    role: UserRole;
    institution_id: string;
  }) => {
    setErrorMsg(null);
    try {
      await createMutation.mutateAsync({
        email: data.email,
        password: data.password,
        role: data.role,
        institutionId: data.institution_id || null,
      });
      setIsCreating(false);
      resetCreate();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar usuário');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuários</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie perfis de acesso e funções no sistema
          </p>
        </div>
        <Button
          onClick={() => {
            setErrorMsg(null);
            setIsCreating(true);
            resetCreate({
              email: '',
              password: '',
              role: 'SOLICITANTE' as UserRole,
              institution_id: '',
            });
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Usuário
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por e-mail ou função..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 h-10 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-6 font-medium text-slate-500">E-mail</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Função</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 hidden md:table-cell">Instituição</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500 hidden lg:table-cell">Equipe</th>
                    <th className="py-3 px-4 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-700">
                              {user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-slate-800 truncate max-w-[200px]">{user.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={roleBadgeVariant[user.role]}>
                          {roleLabels[user.role]}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-500 hidden md:table-cell">
                        {(user.institution as any)?.fantasy_name || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 hidden lg:table-cell">
                        {(user.team as any)?.name || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Editar Usuário"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Editar Usuário"
        size="md"
      >
        {editingUser && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 font-mono">
              {editingUser.email}
            </div>

            <div>
              <Label htmlFor="edit-role">Função (Role)</Label>
              <div className="mt-1">
                <Select
                  id="edit-role"
                  options={roleOptions}
                  {...register('role', { required: true })}
                />
              </div>
            </div>

            {profile?.role === 'SUPERADMIN' && (
              <div>
                <Label htmlFor="edit-institution">Instituição</Label>
                <div className="mt-1">
                  <Select
                    id="edit-institution"
                    placeholder="Nenhuma (Superadmin)"
                    options={institutions.map((i) => ({ value: i.id, label: i.fantasy_name }))}
                    {...register('institution_id')}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={updateMutation.isPending}>
                Salvar
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title="Adicionar Usuário"
        size="md"
      >
        <form onSubmit={handleSubmitCreate(onCreateSubmit)} className="space-y-4">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
              <span className="flex-shrink-0">⚠</span>
              {errorMsg}
            </div>
          )}

          <div>
            <Label htmlFor="create-email">E-mail</Label>
            <div className="mt-1">
              <input
                id="create-email"
                type="email"
                placeholder="exemplo@email.com"
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...registerCreate('email', { required: 'E-mail é obrigatório' })}
              />
              {createErrors.email && (
                <span className="text-xs text-red-500 mt-1 block">{createErrors.email.message}</span>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="create-password">Senha</Label>
            <div className="mt-1">
              <input
                id="create-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...registerCreate('password', {
                  required: 'Senha é obrigatória',
                  minLength: { value: 6, message: 'A senha deve ter no mínimo 6 caracteres' },
                })}
              />
              {createErrors.password && (
                <span className="text-xs text-red-500 mt-1 block">{createErrors.password.message}</span>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="create-role">Função (Role)</Label>
            <div className="mt-1">
              <Select
                id="create-role"
                options={roleOptions}
                {...registerCreate('role', { required: true })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="create-institution">Instituição</Label>
            <div className="mt-1">
              <Select
                id="create-institution"
                placeholder="Nenhuma (Superadmin)"
                options={institutions.map((i) => ({ value: i.id, label: i.fantasy_name }))}
                {...registerCreate('institution_id')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Criar Usuário
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
