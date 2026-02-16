# Consisa Organisa — KB Governance Frontend

Frontend React do módulo **KB Governance** da plataforma Consisa Organisa. Este projeto concentra a experiência de monitoramento de qualidade de manuais/artigos, distribuição de responsabilidade, acompanhamento de pendências e operação de sincronização.

## 1) Visão do produto e escopo

O KB Governance apoia times de conteúdo e governança em três frentes:

- **Visibilidade operacional**: dashboard com indicadores de artigos, pendências e status de governança.
- **Tratativa de inconsistências**: fila de issues com filtros, atribuição de responsável (agente/time/usuário app_user), atualização de status e histórico.
- **Operação contínua**: telas de sincronização, necessidades recorrentes, responsáveis, carga de trabalho e configurações administrativas.

### Principais telas

- `Dashboard`
- `Artigos`
- `Governança` + `Detalhe da issue`
- `Necessidades`
- `Responsáveis`
- `Workload` (restrito por RBAC)
- `Sync` (restrito por RBAC)
- `Settings` (restrito por RBAC)
- `Login`

## 2) Stack e padrões adotados

- **React 18 + TypeScript + Vite 5**
- **React Router v6** para rotas
- **TanStack React Query v5** para cache e sincronização de dados remotos
- **Tailwind CSS + shadcn/ui (Radix UI)** para UI
- **Fetch client customizado** com tratamento de JWT/refresh, `X-Correlation-Id` e normalização de erro

Padrões de projeto:

- Camada de serviços em `src/services/*`
- Hooks de domínio em `src/features/**/hooks`
- Estado de tela complexo com `useReducer` quando necessário
- Componentes de layout e UI compartilhados em `src/components/*`

## 3) Executar localmente

### Requisitos

- **Node.js 20 LTS** (recomendado)
- npm 10+

### Passos

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
```

Checks úteis:

```bash
npm run typecheck
npm run test
```

## 4) Variáveis de ambiente (`.env`)

Este frontend usa variáveis `VITE_*` lidas em tempo de build.

Crie um arquivo `.env.local`:

```env
VITE_API_BASE_URL=https://seu-backend/api/v1
VITE_GOVERNANCE_DUE_DATE_FORMAT=offset-datetime
```

### Chaves atualmente usadas no código

- `VITE_API_BASE_URL` (**obrigatória**)  
  Base URL da API. O app faz fail-fast se ausente ou fora do padrão `/api/v1`.
- `VITE_GOVERNANCE_DUE_DATE_FORMAT` (opcional)  
  Formato de interpretação de due date na governança (`offset-datetime` padrão, ou `local-date`).

## 5) Configuração de API e autenticação

- Base URL centralizada em `src/config/api.ts`.
- Endpoints mapeados em `API_ENDPOINTS` (sem hardcode em páginas).
- Cliente HTTP em `src/config/axios.ts` / `src/services/api-client.service.ts`.

### JWT + refresh

- `accessToken`, `refreshToken` e `user` são persistidos em `localStorage` (`kb_governance_*`).
- O `AuthService` agenda refresh antecipado (2 min antes do `exp` do JWT).
- Em `401` fora de endpoint de auth, o cliente tenta refresh uma vez e repete a requisição.
- Se refresh falhar, a sessão é limpa e o usuário é redirecionado para `/login`.

## 6) RBAC na UX

Proteção de rotas é feita no `App.tsx` via `RequireRole`:

- `workload`, `sync`: `ADMIN` ou `MANAGER`
- `settings`: `ADMIN`

Sem autenticação: redireciona para `/login`.  
Sem role necessária: redireciona para `/dashboard`.

## 7) Tratamento de erros e estados de tela

### Error Boundary global

- `src/main.tsx` envolve o app com `ErrorBoundary`.
- Falhas inesperadas de renderização exibem fallback com ações de recarregar e voltar para dashboard.

### Erros de API

- Erros são normalizados (status, code, message, correlationId, details).
- Páginas utilizam `toast`, `ApiErrorBanner` e/ou `ApiError` para feedback.

### Estados vazios e recuperação

- Listas exibem `EmptyState` quando não há dados.
- Em falha de carregamento, o padrão é mostrar ação explícita de **“Recarregar”**.

## 8) Logs e observabilidade no cliente

- Cada requisição inclui `X-Correlation-Id` gerado no frontend.
- Se backend retornar `correlationId`, ele é preservado na normalização de erro.
- Em ambiente de desenvolvimento, logs técnicos são habilitados (`config.debug`).

Boas práticas:

- Não logar tokens, payloads sensíveis ou dados pessoais desnecessários.
- Registrar apenas metadados de diagnóstico (endpoint, método, status, code, correlationId).

## 9) Estrutura resumida

```text
src/
  components/      # UI compartilhada, layout, fallback/error
  context/         # providers (ex.: tema)
  features/        # domínio por feature (governance)
  hooks/           # hooks utilitários
  services/        # integração com API
  pages/           # telas roteáveis
  config/          # config global (API, app)
  lib/             # utilitários e normalizadores
```

## 10) Documentação complementar

- `docs/architecture.md`
- `docs/auth.md`
- `docs/ui-standards.md`
- `docs/frontend-api-contract-governance.md`
