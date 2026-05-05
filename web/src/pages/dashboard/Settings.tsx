import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useInstitution, useUpdateInstitution } from '../../hooks/useInstitutions';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Building2, KeyRound, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { profile } = useAuth();
  const { data: institution, isLoading: isInstLoading } = useInstitution(profile?.institution_id || '');
  const updateInstitutionMutation = useUpdateInstitution();

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

        </div>
      </div>
    </div>
  );
};
