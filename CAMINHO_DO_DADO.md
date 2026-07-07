# 🛠️ Nodus: O Caminho do Dado (Data Flow)

Este guia foi criado para ajudar você a entender como os dados trafegam no ecossistema do **Nodus** — desde o banco de dados no **Supabase**, passando pela API cliente, pelo gerenciamento de estado no React, até a renderização final na tela.

---

## 🗺️ Visão Geral do Fluxo

A arquitetura do Nodus é baseada em uma comunicação direta do Frontend (React) com o Backend/Banco de Dados (Supabase). O fluxo do dado segue o seguinte ciclo:

```mermaid
graph TD
    subgraph Supabase (Banco de Dados)
        A[(PostgreSQL Tables)] <-->|Triggers & RLS| B(Supabase Engine)
    end

    subgraph React App (web/src)
        C[Supabase Client Client] <-->|VITE_SUPABASE_URL| B
        D[React Query Hooks] <-->|useQuery / useMutation| C
        E[React Pages & Components] <-->|Renderização & Eventos| D
    end

    style A fill:#3ecf8e,stroke:#333,stroke-width:1px,color:#fff
    style B fill:#24b47e,stroke:#333,stroke-width:1px,color:#fff
    style C fill:#4b5563,stroke:#333,stroke-width:1px,color:#fff
    style D fill:#ff4154,stroke:#333,stroke-width:1px,color:#fff
    style E fill:#61dafb,stroke:#333,stroke-width:1px,color:#000
```

---

## 📂 1. O Ponto de Partida: O Banco de Dados (Supabase)

Toda a persistência dos dados no Nodus ocorre em um banco de dados PostgreSQL hospedado no Supabase.

*   **Tabelas e Relacionamentos:** O arquivo principal de schema é o [schema.sql](file:///C:/Users/adriano.jose/OneDrive - Corporativo/Documentos/Projetos/Nodus/supabase/schema.sql). Ele define tabelas como `institutions`, `profiles`, `tickets`, e `obras`.
*   **Triggers e Funções:** O Supabase executa lógica diretamente no banco de dados. Por exemplo:
    *   `handle_new_user()`: Insere automaticamente um perfil na tabela `public.profiles` sempre que um usuário se cadastra no `auth.users`.
    *   `calculate_sla_deadline()`: Calcula o prazo do chamado (SLA) automaticamente com base na prioridade escolhida.
    *   `notify_ticket_changes()`: Gera notificações in-app quando chamados são criados ou alterados.
*   **Segurança (RLS - Row Level Security):** O banco de dados restringe quem pode ler/escrever dados baseado nas políticas SQL (por exemplo, garantir que usuários técnicos só vejam chamados da sua própria instituição).

---

## 🔌 2. A Conexão com o Frontend: O Supabase Client

Para se comunicar com o Supabase, o frontend (React) utiliza a biblioteca oficial `@supabase/supabase-js`.

*   **Arquivo de Configuração:** A inicialização do cliente ocorre em [supabase.ts](file:///C:/Users/adriano.jose/OneDrive - Corporativo/Documentos/Projetos/Nodus/web/src/lib/supabase.ts).
*   **Variáveis de Ambiente (.env):** O cliente é configurado usando variáveis de ambiente que definem a URL do projeto e a chave anônima pública:
    ```typescript
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    export const supabase = createClient(supabaseUrl, supabaseAnonKey);
    ```

---

## ⚡ 3. A Ponte de Dados: Hooks do React Query

Em vez de fazer requisições brutas diretamente nos componentes React, o Nodus usa o **TanStack React Query** (`@tanstack/react-query`) encapsulado em Custom Hooks. O React Query é responsável por gerenciar cache, estados de carregamento (loading), e sincronização de dados.

Vamos pegar como exemplo o arquivo de hooks das Obras: [useObras.ts](file:///C:/Users/adriano.jose/OneDrive - Corporativo/Documentos/Projetos/Nodus/web/src/hooks/useObras.ts).

### 🔍 A. Busca de Dados (Queries)
Para buscar a lista de obras de uma instituição:
```typescript
export function useObras(institutionId?: string | null) {
  return useQuery({
    queryKey: ['obras', institutionId], // Chave de cache única
    queryFn: async () => {
      let query = supabase
        .from('obras')
        .select('*')
        .order('starts_at', { ascending: true });

      if (institutionId) {
        query = query.eq('institution_id', institutionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Obra[];
    },
    enabled: institutionId !== undefined, // Só executa se tiver institutionId
  });
}
```

### ✍️ B. Alteração de Dados (Mutations)
Para salvar uma nova obra no banco de dados e atualizar a tela imediatamente:
```typescript
export function useCreateObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (obra: ObraInsert) => {
      const { data, error } = await supabase
        .from('obras')
        .insert(obra)
        .select()
        .single();
      if (error) throw error;
      return data as Obra;
    },
    onSuccess: () => {
      // ⚠️ CRÍTICO: Invalida o cache antigo das 'obras'
      // Isso força o React Query a fazer uma nova busca automaticamente, atualizando a tela!
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}
```

---

## 🖥️ 4. A Tela: Renderização no React

Finalmente, os componentes React consomem os hooks para exibir e atualizar o layout.

Veja como isso funciona na prática na página [Obras.tsx](file:///C:/Users/adriano.jose/OneDrive - Corporativo/Documentos/Projetos/Nodus/web/src/pages/dashboard/Obras.tsx):

### 📥 1. Carregando dados
O componente chama o hook `useObras` fornecendo a instituição do usuário autenticado:
```tsx
const { data: obras, isLoading, error } = useObras(auth.profile?.institution_id);
```

### 🔄 2. Gerenciando a tela com base nos estados
O React Query gerencia o estado da requisição. O componente reage adequadamente:
```tsx
if (isLoading) {
  return <LoadingSpinner />; // Exibe spinner enquanto carrega
}

if (error) {
  return <ErrorMessage message="Erro ao carregar obras." />;
}
```

### 🎨 3. Exibindo os dados na interface (JSX)
Caso os dados existam, realizamos um mapeamento (`map`) do array de dados gerando elementos HTML/React customizados:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {obras?.map((obra) => (
    <ObraCard
      key={obra.id}
      obra={obra}
      onEdit={handleEdit}
      onQr={handleQrCode}
      canManage={canManage}
    />
  ))}
</div>
```

---

## 📈 Resumo do Ciclo de Vida do Dado

| Ação do Usuário / Sistema | Camada Envolvida | O que acontece por baixo dos panos? |
| :--- | :--- | :--- |
| **Página abre** | Frontend (`Obras.tsx`) | Dispara `useObras()`, que verifica se há dados no cache. Se não houver, faz requisição via `supabase` client. |
| **Envio para Supabase** | API Client / Rede | O Supabase Client envia uma query REST para o endpoint do Supabase. |
| **Persistência no DB** | Banco (Supabase) | O PostgreSQL insere/atualiza a linha, executa os Triggers (como calcular SLAs ou Logs) e retorna o dado criado. |
| **Retorno & Cache** | State Manager | A Mutation do React Query recebe a resposta e dispara o `invalidateQueries(['obras'])`. |
| **Atualização Visual** | UI (React) | O React Query atualiza o cache local. Os componentes inscritos na query detectam a mudança e renderizam novamente com os dados atualizados. |
