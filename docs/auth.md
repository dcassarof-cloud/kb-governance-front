# Autenticação e Sessão — KB Governance Frontend

## Onde está a lógica

- `src/services/auth.service.ts`: estado de sessão, login, refresh, logout e leitura de roles.
- `src/config/axios.ts`: tratamento de `401`, retry pós-refresh e redirecionamento.
- `src/App.tsx`: proteção de rotas por autenticação/role.

## Fluxo de login

1. Tela de login envia `email` + `password` para `POST /auth/login`.
2. `AuthService` normaliza o payload (`accessToken/token`, `refreshToken/refresh_token`).
3. Sessão é gravada em `localStorage` (`token`, `refreshToken`, `user`).
4. App habilita navegação autenticada e agenda refresh antecipado.

## Fluxo de refresh

- Refresh é agendado com base no `exp` do JWT (2 minutos antes do vencimento).
- Em paralelo, requisições que retornam `401` fora de endpoints de auth disparam refresh sob controle de **promessa única** (evita tempestade de refresh).
- Com refresh bem-sucedido, a requisição original é repetida uma vez com `skipAuthRefresh`.

## Fluxo de logout

- `logout()` chama `POST /auth/logout` quando existe sessão.
- Independentemente do retorno, o frontend limpa storage e estado interno.

## Estratégia para 401 e retry seguro

- Não tenta refresh em `/auth/login`, `/auth/refresh`, `/auth/logout`.
- Evita loops infinitos marcando a nova tentativa com `skipAuthRefresh`.
- Se refresh falhar:
  - sessão é invalidada,
  - usuário é redirecionado para `/login`.

## RBAC na interface

- `hasRole()` combina role do usuário normalizado + claims do token.
- Rotas administrativas usam `RequireRole`.
- Regra é de UX (não substitui autorização no backend).

## Boas práticas de segurança no frontend

- Não imprimir token em logs.
- Não persistir credenciais em texto claro.
- Tratar mensagens de erro para evitar exposição de dados internos.
