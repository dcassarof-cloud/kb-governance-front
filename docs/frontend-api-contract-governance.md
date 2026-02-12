# Contrato real usado pelo FRONT (Governança e Relatórios)

Fonte: leitura direta de `src/config/api.ts`, `src/config/axios.ts`, `src/services/governance.service.ts` e hook de uso em `src/features/governance/hooks/useGovernance.ts`.

## Base URL

- `API_BASE_URL` vem de `VITE_API_BASE_URL` (fallback para `http://localhost:8080/api/v1`).

## Endpoints consumidos no módulo de Governança

### 1) Listagem de issues
- Método: `GET`
- Endpoint: `/governance/issues`
- Função: `governanceService.listIssues(filter)`
- Parâmetros realmente enviados (querystring):
  - `page` (number)
  - `size` (number)
  - `sort` (string) — ex: `createdAt,desc`
  - `issueType` (enum)
  - `severity` (enum)
  - `status` (enum)
  - `systemCode` (string)
  - `responsibleType` (string)
  - `responsibleId` (string)
  - `q` (string)
  - `overdue` (boolean, apenas quando `true`)
  - `unassigned` (boolean, apenas quando `true`)

### 2) Overview de governança
- Método: `GET`
- Endpoint: `/governance/overview`
- Função: `governanceService.getOverview()`
- Parâmetros: nenhum.

### 3) Resumo de responsáveis
- Método: `GET`
- Endpoint: `/governance/responsibles/summary`
- Função: `governanceService.getResponsiblesSummary()`
- Parâmetros: nenhum.

### 4) Sugestão de responsável
- Método: `GET`
- Endpoint: `/governance/responsibles/suggest`
- Função: `governanceService.getSuggestedAssignee(query)`
- Parâmetros:
  - `q` (string), enviado apenas quando não vazio.

### 5) Opções de responsáveis
- Método: `GET`
- Endpoint: `/users/responsibles`
- Função: `governanceService.getResponsiblesOptions()`
- Parâmetros: nenhum.

### 6) Relatório CSV (manual updates)
- Método: `GET`
- Endpoint: `/reports/manual-updates`
- Função: `governanceService.downloadManualUpdatesReport(params)`
- Parâmetros (querystring):
  - `systemCode` (string, opcional)
  - `status` (string, opcional)
  - `start` (YYYY-MM-DD, opcional)
  - `end` (YYYY-MM-DD, opcional)
  - `format=csv` (fixo)

## Regra transversal implementada no front

- Antes de serializar querystring, o front aplica `cleanQueryParams(params)`:
  - remove `null` e `undefined`
  - remove string vazia ou só com espaços
  - remove booleans `false` (envia apenas quando `true`)
  - mantém números e strings válidas
