# UI Standards — Consisa KB Governance

## Estados obrigatórios por tela de dados

### 1) Loading

- Usar skeleton (`LoadingSkeleton`) ou indicador equivalente.
- Evitar layout shift brusco durante carregamento.

### 2) Empty

- Exibir `EmptyState` com mensagem objetiva.
- Incluir ação contextual:
  - “Limpar filtros” quando o vazio vem de filtro restritivo,
  - “Recarregar” quando aplicável.

### 3) Erro

- Exibir feedback visível com `ApiErrorBanner` e/ou `ApiError`.
- Sempre oferecer ação de recuperação (“Recarregar” / “Tentar novamente”).
- Preferir mensagens amigáveis, mantendo `correlationId` para suporte quando disponível.

## Error Boundary

- Toda aplicação deve permanecer envolvida por `ErrorBoundary` global.
- Fallback deve permitir ao usuário:
  - recarregar a página,
  - voltar para uma rota segura (dashboard).

## Padrões de feedback

- Eventos assíncronos de sucesso/erro devem usar toast.
- Nunca deixar ação crítica sem feedback visual.

## Acessibilidade mínima

- Dialogs devem usar estrutura Radix/shadcn completa (`DialogTitle`, `DialogDescription`).
- Campos devem possuir `Label` associado.
- Ícones interativos precisam de texto visível ou `aria-label` quando aplicável.
- Respeitar foco/teclado em componentes de overlay.

## Terminologia de domínio

Padronizar linguagem nas telas e docs:

- **manual/artigo**
- **agente**
- **usuário app_user**
- **responsável**

Evitar termos ambíguos ou nomenclaturas diferentes para o mesmo conceito.
