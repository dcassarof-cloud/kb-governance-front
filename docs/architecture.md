# Arquitetura Frontend — KB Governance

## Visão de pastas

- `src/pages/`  
  Entradas de rota (Dashboard, Governança, Login, etc.).
- `src/features/`  
  Domínio por feature. Ex.: `features/governance` concentra hooks, reducer de estado local e componentes de tela.
- `src/components/`  
  Componentes reutilizáveis (layout, shared, ui e fallback de erro).
- `src/services/`  
  Camada de acesso à API e regras de mapeamento de payload.
- `src/config/`  
  Configuração de API/baseUrl e constantes globais.
- `src/lib/`  
  Utilitários puros (normalização de erro, limpeza de query params, helpers).
- `src/context/`  
  Providers globais (tema).

## Fluxo de dados

Fluxo padrão aplicado no app:

1. **UI (page/component)** captura interação do usuário.
2. **Hook de feature** (React Query + reducer local) prepara filtros/estado.
3. **Service** chama endpoint via `api-client`.
4. **api-client/http client** injeta headers, token e correlationId.
5. **Backend** retorna payload.
6. **Service/lib** normaliza payload/erro.
7. **Hook/UI** exibe estados de loading, empty, sucesso ou erro.

Representação simplificada:

```text
UI -> Hook (React Query) -> Service -> api-client -> Backend
                               ^                        |
                               |------ cache/refetch ----
```

## Rotas e RBAC

- Rotas declaradas em `src/App.tsx`.
- Wrapper `RequireRole` aplica controle de acesso na UX.
- Sem autenticação: redirect para `/login`.
- Sem permissão: redirect para `/dashboard`.

## Convenções de URL e query params

### Fonte única de verdade

Na tela de Governança, os filtros são sincronizados com `URLSearchParams` para:

- permitir compartilhamento de URL entre usuários,
- preservar estado em refresh/navigation,
- facilitar debugging e reprodutibilidade.

### Regras práticas

- `cleanQueryParams` remove valores vazios antes de serializar.
- O estado digitado é debounced antes de consulta remota.
- `page` só vai para URL quando `> 1`.
- Chaves de cache do React Query incluem os filtros serializados para evitar colisão de cache.

## Limites de responsabilidade

- Frontend não implementa regra de negócio pesada.
- Backend continua como fonte oficial para cálculo de status e decisões de domínio.
- Front apenas orquestra UX, filtros, estado local transitório e feedback visual.
