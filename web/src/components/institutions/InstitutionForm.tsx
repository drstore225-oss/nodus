import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Institution } from '../../types/database.types';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';

const institutionSchema = z.object({
  cnpj: z.string().min(14, 'CNPJ inválido').max(18),
  fantasy_name: z.string().min(2, 'Nome Fantasia obrigatório'),
  corporate_name: z.string().min(2, 'Razão Social obrigatória'),
  zip_code: z.string().min(8, 'CEP inválido'),
  street: z.string().min(2, 'Logradouro obrigatório'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Bairro obrigatório'),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().length(2, 'UF inválida'),
});

type InstitutionFormValues = z.infer<typeof institutionSchema>;

interface InstitutionFormProps {
  institution?: Institution;
  onSubmit: (data: InstitutionFormValues) => Promise<void>;
  isLoading: boolean;
  onCancel: () => void;
}

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

const formatCEP = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
};

export const InstitutionForm: React.FC<InstitutionFormProps> = ({
  institution,
  onSubmit,
  isLoading,
  onCancel,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InstitutionFormValues>({
    resolver: zodResolver(institutionSchema),
    defaultValues: institution
      ? {
          cnpj: institution.cnpj || '',
          fantasy_name: institution.fantasy_name,
          corporate_name: institution.corporate_name,
          zip_code: institution.zip_code || '',
          street: institution.street || '',
          number: institution.number || '',
          complement: institution.complement || '',
          neighborhood: institution.neighborhood || '',
          city: institution.city || '',
          state: institution.state || '',
        }
      : {},
  });

  const zipCode = watch('zip_code');

  // Busca CEP na API ViaCEP
  const handleCEPBlur = async () => {
    const cep = zipCode?.replace(/\D/g, '');
    if (cep?.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setValue('street', data.logradouro);
          setValue('neighborhood', data.bairro);
          setValue('city', data.localidade);
          setValue('state', data.uf);
        }
      } catch {}
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fantasy_name">Nome Fantasia *</Label>
          <div className="mt-1">
            <Input
              id="fantasy_name"
              placeholder="Nome Fantasia"
              error={errors.fantasy_name?.message}
              {...register('fantasy_name')}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="cnpj">CNPJ *</Label>
          <div className="mt-1">
            <Input
              id="cnpj"
              placeholder="00.000.000/0000-00"
              error={errors.cnpj?.message}
              {...register('cnpj', {
                onChange: (e) => {
                  e.target.value = formatCNPJ(e.target.value);
                },
              })}
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="corporate_name">Razão Social *</Label>
        <div className="mt-1">
          <Input
            id="corporate_name"
            placeholder="Razão Social"
            error={errors.corporate_name?.message}
            {...register('corporate_name')}
          />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-sm font-medium text-slate-600 mb-3">Endereço</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="zip_code">CEP *</Label>
            <div className="mt-1">
              <Input
                id="zip_code"
                placeholder="00000-000"
                error={errors.zip_code?.message}
                {...register('zip_code', {
                  onChange: (e) => {
                    e.target.value = formatCEP(e.target.value);
                  },
                  onBlur: handleCEPBlur,
                })}
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="street">Logradouro *</Label>
            <div className="mt-1">
              <Input
                id="street"
                placeholder="Rua / Av."
                error={errors.street?.message}
                {...register('street')}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div>
            <Label htmlFor="number">Número *</Label>
            <div className="mt-1">
              <Input
                id="number"
                placeholder="Nº"
                error={errors.number?.message}
                {...register('number')}
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="complement">Complemento</Label>
            <div className="mt-1">
              <Input
                id="complement"
                placeholder="Sala, Andar, etc."
                {...register('complement')}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="sm:col-span-1">
            <Label htmlFor="neighborhood">Bairro *</Label>
            <div className="mt-1">
              <Input
                id="neighborhood"
                placeholder="Bairro"
                error={errors.neighborhood?.message}
                {...register('neighborhood')}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="city">Cidade *</Label>
            <div className="mt-1">
              <Input
                id="city"
                placeholder="Cidade"
                error={errors.city?.message}
                {...register('city')}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="state">UF *</Label>
            <div className="mt-1">
              <Input
                id="state"
                placeholder="SP"
                maxLength={2}
                className="uppercase"
                error={errors.state?.message}
                {...register('state', {
                  onChange: (e) => { e.target.value = e.target.value.toUpperCase(); }
                })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {institution ? 'Salvar Alterações' : 'Cadastrar Instituição'}
        </Button>
      </div>
    </form>
  );
};
