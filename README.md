# Nodus — Sistema de Gestão de Manutenção Predial

Sistema interno Multi-Institucional de Gestão de Chamados de Manutenção com controle de SLA, custos e perfis de acesso.

## 🏗️ Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Backend | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Web | React + TypeScript + Vite + TailwindCSS v3 |
| Mobile | Expo (React Native) + NativeWind |
| Estado | React Query (TanStack) |
| Formulários | React Hook Form + Zod |

---

## 🚀 Setup Rápido

### 1. Banco de Dados (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor** e rode:
   ```
   supabase/schema.sql    ← Schema completo (tabelas, triggers, RLS)
   supabase/seed.sql      ← Dados iniciais (instituições, equipes, centros de custo)
   ```
3. Crie o primeiro usuário em **Authentication > Users > Add User**
4. Promova para SUPERADMIN no SQL Editor:
   ```sql
   UPDATE public.profiles 
   SET role = 'SUPERADMIN' 
   WHERE email = 'seu@email.com';
   ```

### 2. Aplicação Web

```bash
cd web
cp .env.example .env.local
# Edite .env.local com suas credenciais do Supabase

npm install
npm run dev
# Acesse: http://localhost:5173
```

### 3. Aplicativo Mobile

```bash
cd mobile
cp .env.example .env
# Edite .env com suas credenciais do Supabase

npm install
npx expo start
# Escaneie o QR Code com o Expo Go
```

---

## 👥 Perfis de Acesso

| Role | Permissão |
|------|-----------|
| SUPERADMIN | Acesso total a todas as instituições |
| ADMIN | Acesso total à sua instituição (CRUD de usuários, aprovação de custos) |
| GESTOR | Gerencia chamados e custos da sua equipe |
| TECNICO | Vê e atualiza chamados atribuídos a ele |
| SOLICITANTE | Cria e acompanha apenas os seus chamados |

---

## ⏱️ SLA por Prioridade

| Prioridade | Prazo |
|------------|-------|
| 🔴 CRITICAL | 4 horas |
| 🟠 HIGH | 24 horas |
| 🔵 MEDIUM | 72 horas |
| ⚪ LOW | 168 horas (7 dias) |

---

## 📁 Estrutura do Projeto

```
Nodus/
├── supabase/
│   ├── schema.sql         ← Schema completo + RLS + Triggers
│   └── seed.sql           ← Dados iniciais
│
├── web/                   ← React + Vite
│   └── src/
│       ├── components/    ← UI components (Button, Input, Modal...)
│       │   ├── ui/
│       │   ├── layouts/
│       │   ├── institutions/
│       │   └── tickets/
│       ├── contexts/      ← AuthContext
│       ├── hooks/         ← useTickets, useInstitutions, useTeams...
│       ├── pages/         ← Dashboard, Tickets, Users, Teams...
│       ├── types/         ← TypeScript types
│       └── utils/         ← Formatação (SLA, moeda, status)
│
└── mobile/                ← Expo (React Native)
    ├── app/
    │   ├── (tabs)/        ← Tabs: index (chamados) + profile
    │   ├── ticket/[id].tsx← Detalhe do chamado + upload foto
    │   ├── login.tsx      ← Tela de autenticação
    │   └── _layout.tsx    ← Root layout + Auth guard
    └── src/
        ├── contexts/      ← AuthContext mobile
        ├── hooks/         ← useTickets mobile
        └── lib/           ← Supabase client
```

---

## 💡 Funcionalidades Implementadas

### Web 🖥️
- [x] Login com e-mail/senha (Supabase Auth)
- [x] Dashboard com KPIs (Abertos, Em Andamento, SLA Estourado, Críticos)
- [x] Banner de alerta quando há SLA estourado
- [x] CRUD de Instituições (CNPJ, Razão Social, busca de CEP automática)
- [x] CRUD de Equipes por instituição
- [x] CRUD de Centros de Custo por instituição
- [x] Gerenciamento de Usuários (alteração de role e instituição)
- [x] Listagem de Chamados com filtros (status, prioridade, SLA, busca)
- [x] Criação de Chamados
- [x] Painel de Detalhe com: atribuição de técnico, gestão de custos, transições de status
- [x] Sidebar responsiva (desktop + mobile)
- [x] Proteção de rotas por autenticação

### Mobile 📱
- [x] Login nativo com Supabase Auth
- [x] Lista de Chamados atribuídos (com filtros e busca)
- [x] Indicadores visuais de SLA (expirado, restante)
- [x] Detalhe do Chamado
- [x] Atualização de Status (com confirmação)
- [x] Upload de Fotos (câmera ou galeria → Supabase Storage)
- [x] Tela de Perfil com logout
