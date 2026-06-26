import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useInstitution, useUpdateInstitution } from '../../hooks/useInstitutions';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import {
  Building2,
  KeyRound,
  Save,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Pencil,
  X
} from 'lucide-react';
import {
  useBuildings,
  useCreateBuilding,
  useUpdateBuilding,
  useDeleteBuilding
} from '../../hooks/useBuildings';

export const SettingsPage: React.FC = () => {
  const { profile } = useAuth();
  const { data: institution, isLoading: isInstLoading } = useInstitution(profile?.institution_id || '');
  const updateInstitutionMutation = useUpdateInstitution();

  // Gemini API Key State
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('nodus_gemini_api_key') || '');

  // Buildings State & Hooks
  const { data: buildings = [], isLoading: isBuildingsLoading } = useBuildings(profile?.institution_id);
  const createBuildingMutation = useCreateBuilding();
  const updateBuildingMutation = useUpdateBuilding();
  const deleteBuildingMutation = useDeleteBuilding();

  const [isAddingBuilding, setIsAddingBuilding] = useState(false);
  const [newBuildingData, setNewBuildingData] = useState({ name: '', total_m2: 0, floors: 1 });
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editBuildingData, setEditBuildingData] = useState({ name: '', total_m2: 0, floors: 1 });

  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.institution_id || !newBuildingData.name || !newBuildingData.total_m2) return;
    try {
      await createBuildingMutation.mutateAsync({
        institution_id: profile.institution_id,
        name: newBuildingData.name,
        total_m2: newBuildingData.total_m2,
        floors: newBuildingData.floors || 1,
      });
      setNewBuildingData({ name: '', total_m2: 0, floors: 1 });
      setIsAddingBuilding(false);
    } catch (error: any) {
      alert('Erro ao criar prédio: ' + error.message);
    }
  };

  const startEditingBuilding = (b: any) => {
    setEditingBuildingId(b.id);
    setEditBuildingData({ name: b.name, total_m2: parseFloat(b.total_m2), floors: b.floors || 1 });
  };

  const handleSaveEditBuilding = async () => {
    if (!editingBuildingId) return;
    try {
      await updateBuildingMutation.mutateAsync({
        id: editingBuildingId,
        name: editBuildingData.name,
        total_m2: editBuildingData.total_m2,
        floors: editBuildingData.floors,
      });
      setEditingBuildingId(null);
    } catch (error: any) {
      alert('Erro ao atualizar prédio: ' + error.message);
    }
  };

  const handleDeleteBuilding = async (id: string) => {
    if (!profile?.institution_id) return;
    if (confirm('Tem certeza que deseja excluir este prédio? Todos os chamados e obras vinculados perderão a referência.')) {
      try {
        await deleteBuildingMutation.mutateAsync({ id, institutionId: profile.institution_id });
      } catch (error: any) {
        alert('Erro ao excluir prédio: ' + error.message);
      }
    }
  };

  // Institution State
  const [instData, setInstData] = useState({
    fantasy_name: '',
    corporate_name: '',
    cnpj: '',
    zip_code: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  // Password State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdStatus, setPwdStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isPwdLoading, setIsPwdLoading] = useState(false);

  useEffect(() => {
    if (institution) {
      setInstData({
        fantasy_name: institution.fantasy_name || '',
        corporate_name: institution.corporate_name || '',
        cnpj: institution.cnpj || '',
        zip_code: institution.zip_code || '',
        street: institution.street || '',
        number: institution.number || '',
        complement: institution.complement || '',
        neighborhood: institution.neighborhood || '',
        city: institution.city || '',
        state: institution.state || '',
      });
    }
  }, [institution]);

  const canEditInstitution = ['SUPERADMIN', 'ADMIN', 'GESTOR'].includes(profile?.role || '');

  const handleInstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInstData({ ...instData, [e.target.name]: e.target.value });
  };

  const handleSaveInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution?.id) return;
    try {
      await updateInstitutionMutation.mutateAsync({
        id: institution.id,
        ...instData,
      });
      alert('Dados da instituição atualizados com sucesso!');
    } catch (error: any) {
      alert('Erro ao atualizar instituição: ' + error.message);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdStatus(null);
    if (password !== confirmPassword) {
      setPwdStatus({ type: 'error', msg: 'As senhas não coincidem.' });
      return;
    }
    if (password.length < 6) {
      setPwdStatus({ type: 'error', msg: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    setIsPwdLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsPwdLoading(false);

    if (error) {
      setPwdStatus({ type: 'error', msg: error.message });
    } else {
      setPwdStatus({ type: 'success', msg: 'Senha atualizada com sucesso!' });
      setPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie suas preferências pessoais e dados da sua organização.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Painel Esquerdo: Menu ou Informações Resumo */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3 border-b border-slate-100 pb-2">Meu Perfil</h3>
            <p className="text-sm text-slate-600 mb-1"><span className="font-medium text-slate-700">Função:</span> {profile?.role}</p>
            <p className="text-sm text-slate-600"><span className="font-medium text-slate-700">ID:</span> {profile?.id.split('-')[0]}...</p>
          </div>

          {/* Configuração da Chave da API do Gemini */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-purple-600" />
              Nodus AI (Gemini)
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Insira sua API Key do Gemini para ativar análises inteligentes avançadas no Chatbot.
            </p>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="Insira sua Gemini Key..."
                className="w-full text-xs h-9 rounded-lg border border-slate-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={geminiKey}
                onChange={(e) => {
                  setGeminiKey(e.target.value);
                  localStorage.setItem('nodus_gemini_api_key', e.target.value);
                }}
              />
              {geminiKey ? (
                <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="h-3 w-3" />
                  Chave configurada e ativa
                </p>
              ) : (
                <p className="text-[10px] text-slate-400">
                  Modo Analítico Local ativo (sem custo)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Painel Direito: Formulários */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Seção Pessoal */}
          <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-slate-800">Alterar Senha</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {pwdStatus && (
                  <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${pwdStatus.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {pwdStatus.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    {pwdStatus.msg}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Nova Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" isLoading={isPwdLoading} disabled={!password}>
                    Atualizar Senha
                  </Button>
                </div>
              </form>
            </div>
          </section>

          {/* Seção Instituição */}
          {canEditInstitution && profile?.institution_id && (
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-slate-800">Dados da Instituição</h2>
              </div>
              <div className="p-6">
                {isInstLoading ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  </div>
                ) : (
                  <form onSubmit={handleSaveInstitution} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="fantasy_name">Nome Fantasia *</Label>
                        <Input
                          id="fantasy_name"
                          name="fantasy_name"
                          value={instData.fantasy_name}
                          onChange={handleInstChange}
                          required
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="corporate_name">Razão Social *</Label>
                        <Input
                          id="corporate_name"
                          name="corporate_name"
                          value={instData.corporate_name}
                          onChange={handleInstChange}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input
                          id="cnpj"
                          name="cnpj"
                          value={instData.cnpj}
                          onChange={handleInstChange}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="zip_code">CEP</Label>
                        <Input
                          id="zip_code"
                          name="zip_code"
                          value={instData.zip_code}
                          onChange={handleInstChange}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="street">Rua/Logradouro</Label>
                        <Input
                          id="street"
                          name="street"
                          value={instData.street}
                          onChange={handleInstChange}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="number">Número</Label>
                        <Input
                          id="number"
                          name="number"
                          value={instData.number}
                          onChange={handleInstChange}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="complement">Complemento</Label>
                        <Input
                          id="complement"
                          name="complement"
                          value={instData.complement}
                          onChange={handleInstChange}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="neighborhood">Bairro</Label>
                        <Input
                          id="neighborhood"
                          name="neighborhood"
                          value={instData.neighborhood}
                          onChange={handleInstChange}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="city">Cidade</Label>
                        <Input
                          id="city"
                          name="city"
                          value={instData.city}
                          onChange={handleInstChange}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="state">Estado (UF)</Label>
                        <Input
                          id="state"
                          name="state"
                          value={instData.state}
                          onChange={handleInstChange}
                          maxLength={2}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
                      <Button type="submit" isLoading={updateInstitutionMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Instituição
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </section>
          )}

          {/* Seção Prédios */}
          {profile?.institution_id && (
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <h2 className="font-semibold text-slate-800">Prédios e Metragens (m²)</h2>
                </div>
                {canEditInstitution && (
                  <Button size="sm" onClick={() => setIsAddingBuilding(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Prédio
                  </Button>
                )}
              </div>
              
              <div className="p-6">
                {/* Form para adicionar prédio */}
                {isAddingBuilding && (
                  <form onSubmit={handleCreateBuilding} className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700">Novo Prédio</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="b_name">Nome do Prédio *</Label>
                        <Input
                          id="b_name"
                          value={newBuildingData.name}
                          onChange={(e) => setNewBuildingData({ ...newBuildingData, name: e.target.value })}
                          placeholder="Ex: Bloco Administrativo"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="b_m2">Metragem Quadrada (m²) *</Label>
                        <Input
                          id="b_m2"
                          type="number"
                          value={newBuildingData.total_m2 || ''}
                          onChange={(e) => setNewBuildingData({ ...newBuildingData, total_m2: parseFloat(e.target.value) })}
                          placeholder="Ex: 1200"
                          min="0.1"
                          step="any"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="b_floors">Andares</Label>
                        <Input
                          id="b_floors"
                          type="number"
                          value={newBuildingData.floors || ''}
                          onChange={(e) => setNewBuildingData({ ...newBuildingData, floors: parseInt(e.target.value) })}
                          placeholder="Ex: 3"
                          min="1"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingBuilding(false)}>Cancelar</Button>
                      <Button type="submit" size="sm">Salvar</Button>
                    </div>
                  </form>
                )}

                {/* Listagem de prédios */}
                {isBuildingsLoading ? (
                  <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  </div>
                ) : buildings.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">Nenhum prédio cadastrado para esta organização.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                      <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                        <tr>
                          <th className="px-4 py-3">Nome</th>
                          <th className="px-4 py-3">Área (m²)</th>
                          <th className="px-4 py-3">Andares</th>
                          {canEditInstitution && <th className="px-4 py-3 text-right">Ações</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {buildings.map((b: any) => (
                          <tr key={b.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {editingBuildingId === b.id ? (
                                <Input
                                  value={editBuildingData.name}
                                  onChange={(e) => setEditBuildingData({ ...editBuildingData, name: e.target.value })}
                                />
                              ) : (
                                b.name
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {editingBuildingId === b.id ? (
                                <Input
                                  type="number"
                                  value={editBuildingData.total_m2 || ''}
                                  onChange={(e) => setEditBuildingData({ ...editBuildingData, total_m2: parseFloat(e.target.value) })}
                                />
                              ) : (
                                `${parseFloat(b.total_m2).toLocaleString('pt-BR')} m²`
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {editingBuildingId === b.id ? (
                                <Input
                                  type="number"
                                  value={editBuildingData.floors || ''}
                                  onChange={(e) => setEditBuildingData({ ...editBuildingData, floors: parseInt(e.target.value) })}
                                />
                              ) : (
                                b.floors || 1
                              )}
                            </td>
                            {canEditInstitution && (
                              <td className="px-4 py-3 text-right">
                                {editingBuildingId === b.id ? (
                                  <div className="flex justify-end gap-1.5">
                                    <button type="button" onClick={handleSaveEditBuilding} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Salvar">
                                      <Save className="h-4 w-4" />
                                    </button>
                                    <button type="button" onClick={() => setEditingBuildingId(null)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Cancelar">
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex justify-end gap-1.5">
                                    <button type="button" onClick={() => startEditingBuilding(b)} className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded" title="Editar">
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button type="button" onClick={() => handleDeleteBuilding(b.id)} className="p-1 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded" title="Excluir">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
};
