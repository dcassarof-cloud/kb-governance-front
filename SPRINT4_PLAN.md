# PLANO SPRINT 4 — FRONTEND KB GOVERNANCE

**Versao: 1.0 | Data: 2026-02-02**
**Projeto: Consisa KB Governance**
**Stack: React + TypeScript + ShadCN + Tailwind**

---

## SUMARIO

1. [Diagnostico do Estado Atual](#a-diagnostico-do-estado-atual)
2. [Wireflow Textual — Nova Navegacao](#b-wireflow-textual--nova-navegacao)
3. [Lista de Componentes/Telas a Modificar](#c-lista-de-componentestelas-a-modificar)
4. [Microcopy Sugerida](#d-microcopy-sugerida)
5. [Padroes de Estado (Qualidade)](#e-padroes-de-estado-qualidade)
6. [Checklist Final — Criterios de Aceitacao](#f-checklist-final--criterios-de-aceitacao)
7. [Ordem de Implementacao](#g-ordem-de-implementacao-sugerida)

---

## A) DIAGNOSTICO DO ESTADO ATUAL

### A.1) Inventario de Telas (9 telas ativas)

| Tela | Rota | O que entrega hoje | Problema |
|------|------|--------------------|----------|
| **Dashboard** | `/dashboard` | 4 cards (Total/OK/Com Issues/Total Issues) + grafico pizza status + grafico barra sistemas | **Nao orienta decisao**. Mostra "o que" mas nao "o que fazer". Sem issues criticas, sem atrasados, sem call-to-action |
| **Governanca** | `/governance` | Cards resumo + filtros avancados + lista de issues com acoes | **Boa base**, mas filtros complexos demais, sem ordenacao por SLA/prioridade, sem toggles rapidos (overdue/unassigned) |
| **Responsaveis** | `/responsibles` | Cards resumo + tabela de responsaveis com backlog | **Util** mas poderia ser secao do dashboard ou atalho da governanca |
| **Duplicados** | `/duplicates` | Lista de grupos duplicados com acoes (definir principal/mesclar/ignorar) | **Tela morta** - duplicado e tipo de issue, deveria estar integrado na governanca |
| **Manuais** | `/articles` | Lista de artigos com busca | **Consulta apenas** - sem acoes, sem conexao com governanca |
| **Sistemas** | `/systems` | Cards com qualidade por sistema | **Informativo** - sem acoes, poderia ser secao do dashboard |
| **Relatorios** | `/reports` | 3 cards placeholder com botoes CSV/PDF | **Placeholder** - nenhum export funciona |
| **Sincronizacao** | `/sync` | Historico de syncs + botao manual | **Operacional** - ok para admin |
| **Configuracoes** | `/settings` | Toggle tema + config sync | **Operacional** - ok |

### A.2) Problemas de UX Identificados

#### Criticos

1. **Dashboard nao e acionavel** - Usuario entra, ve numeros, nao sabe o que fazer
2. **Governanca sem priorizacao** - Issues aparecem sem ordem de urgencia, dificil saber por onde comecar
3. **Duplicados e tela morta** - Tipo de issue que deveria estar na governanca
4. **Filtros nao persistem na URL** - Perde contexto ao navegar/atualizar
5. **Sem indicador de "atrasados"** - Campo dueDate existe mas nao ha destaque visual

#### Moderados

6. **Telas demais no menu** - 9 itens, usuario nao sabe por onde comecar
7. **Responsaveis isolado** - Poderia ser atalho ou secao
8. **Sistemas sem acao** - Mostra qualidade mas nao conecta com issues
9. **Reports placeholder** - Tela existe mas nao funciona

#### Leves

10. **Loading inconsistente** - Alguns usam skeleton, outros nao
11. **Empty states sem CTA** - "Nenhum dado" sem sugestao de acao
12. **Paginacao basica** - Funciona mas poderia ter "ir para pagina"

### A.3) Minimo para "Produto Confiavel"

| # | Requisito | Estado Atual |
|---|-----------|--------------|
| 1 | Zero telas brancas (loading/error/empty) | 80% ok |
| 2 | Filtros refletindo na URL | 0% |
| 3 | Dashboard orienta proxima acao | 0% |
| 4 | Governanca = fila de trabalho ordenada | 30% |
| 5 | Duplicados integrado | 0% |
| 6 | Toasts em todas as acoes | 90% ok |
| 7 | Skeletons em todas as listas | 80% ok |

---

## B) WIREFLOW TEXTUAL — NOVA NAVEGACAO

### B.1) Navegacao Simplificada (9 -> 6 itens)

```
ANTES (9 itens):                    DEPOIS (6 itens):
├── Dashboard                       ├── Dashboard (redesenhado)
├── Manuais                         ├── Manuais (mantem)
├── Governanca                      ├── Governanca (fila executiva)
├── Responsaveis                    ├── Sincronizacao
├── Duplicados                      ├── Relatorios (funcional)
├── Relatorios                      └── Configuracoes
├── Sistemas
├── Sincronizacao
└── Configuracoes

REMOVIDOS/FUNDIDOS:
- Responsaveis -> secao do Dashboard + filtro na Governanca
- Duplicados -> filtro type=DUPLICATE_CONTENT na Governanca
- Sistemas -> secao do Dashboard
```

### B.2) Fluxo Principal: Dashboard -> Governanca

```
┌─────────────────────────────────────────────────────────────────┐
│                         DASHBOARD                                │
│                   "Onde doi + O que fazer agora"                 │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │ Criticas │ │ Atrasadas│ │Sem Dono  │ │Resolvidas│            │
│ │    12    │ │    5     │ │    8     │ │  +23 7d  │            │
│ │ [click]──┼─┼──[click]─┼─┼─[click]──┼─┤          │            │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│                      │         │             │                   │
│              ┌───────┴─────────┴─────────────┘                  │
│              ▼                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                    PRIORIZE AGORA (top 5)                   │ │
│ │  1. [CRITICAL] Manual X - Sistema Y - SLA 2d - [Resolver]   │ │
│ │  2. [HIGH] Manual Z - Sistema W - SLA 3d - [Atribuir]       │ │
│ │  ...                                                         │ │
│ │                          [Ver fila completa →]               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                    SAUDE POR SISTEMA                        │ │
│ │  Sistema    │ Manuais │ Issues │ Criticas │ Qualidade      │ │
│ │  CONSISAERP │   150   │   12   │    3     │ 85% ████▓░    │ │
│ │  FOLHA      │    45   │    5   │    1     │ 72% ███▓░░    │ │
│ │  [click linha → Governanca filtrada por sistema]            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                  RESPONSAVEIS COM MAIS CARGA                │ │
│ │  Nome         │ Abertas │ Atrasadas │ [Ver backlog]         │ │
│ │  Joao Silva   │   15    │     3     │ [→]                   │ │
│ │  Maria Santos │   12    │     1     │ [→]                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### B.3) Nova Tela Governanca

```
┌─────────────────────────────────────────────────────────────────┐
│                         GOVERNANCA                               │
│              URL: /governance?severity=CRITICAL&overdue=true     │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ FILTROS RAPIDOS                                              │ │
│ │ [Sistema ▼] [Status ▼] [Severidade ▼] [Tipo ▼]              │ │
│ │                                                              │ │
│ │ TOGGLES:  ☑ So atrasadas   ☑ Sem responsavel   [Buscar...] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Ordenado por: Severidade ↓, SLA ↑          23 issues            │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ▪ [CRITICAL] Conteudo Desatualizado                         │ │
│ │   Manual: Cadastro de Clientes | Sistema: CONSISAERP        │ │
│ │   SLA: 2 dias (vence 04/02) | Responsavel: —                │ │
│ │   [Atribuir] [Marcar Em Progresso] [Resolver] [Historico]   │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ ▪ [HIGH] Conteudo Duplicado                                 │ │
│ │   Manual: Emissao de NF | Sistema: FISCAL                   │ │
│ │   SLA: 5 dias | Responsavel: Joao Silva                     │ │
│ │   [Mudar Responsavel] [Resolver] [Ver Duplicatas] [Ignorar] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ← Anterior    Pagina 1 de 3    Proxima →                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## C) LISTA DE COMPONENTES/TELAS A MODIFICAR

### C.1) Telas a REDESENHAR

| Tela | Arquivo | Mudancas |
|------|---------|----------|
| **Dashboard** | `src/pages/Dashboard.tsx` | Redesenho completo: novos cards, secao "Priorize agora", tabela sistemas, tabela responsaveis |
| **Governanca** | `src/pages/Governance.tsx` | Adicionar toggles overdue/unassigned, ordenacao SLA, integrar duplicados, persistir filtros na URL |

### C.2) Telas a REMOVER

| Tela | Arquivo | Destino |
|------|---------|---------|
| **Duplicados** | `src/pages/Duplicates.tsx` | Mover logica para componente `DuplicateExpander` usado na Governanca quando `type=DUPLICATE_CONTENT` |
| **Responsaveis** | `src/pages/Responsibles.tsx` | Mover para secao do Dashboard + query param na Governanca |

### C.3) Telas a MANTER (ajustes menores)

| Tela | Arquivo | Ajustes |
|------|---------|---------|
| **Manuais** | `src/pages/Articles.tsx` | Adicionar link para issues relacionadas |
| **Sistemas** | `src/pages/Systems.tsx` | Manter mas reduzir no menu (ou mover para dashboard) |
| **Relatorios** | `src/pages/Reports.tsx` | Implementar exports ou remover |
| **Sync** | `src/pages/Sync.tsx` | Manter como esta |
| **Settings** | `src/pages/Settings.tsx` | Manter como esta |

### C.4) Componentes NOVOS a Criar

| Componente | Local | Proposito |
|------------|-------|-----------|
| `PriorityQueue` | `src/components/dashboard/PriorityQueue.tsx` | Lista top 5 issues para "Priorize agora" |
| `SystemHealthTable` | `src/components/dashboard/SystemHealthTable.tsx` | Tabela de saude por sistema |
| `ResponsiblesWorkload` | `src/components/dashboard/ResponsiblesWorkload.tsx` | Tabela de carga por responsavel |
| `IssueCard` | `src/components/governance/IssueCard.tsx` | Item de issue na lista (substituir table row) |
| `QuickFilters` | `src/components/governance/QuickFilters.tsx` | Toggles + selects de filtro |
| `DuplicateExpander` | `src/components/governance/DuplicateExpander.tsx` | Expansao inline para issues de duplicados |
| `ResolveDialog` | `src/components/governance/ResolveDialog.tsx` | Modal de confirmacao de resolucao |

### C.5) Componentes a MODIFICAR

| Componente | Arquivo | Mudancas |
|------------|---------|----------|
| `Sidebar` | `src/components/layout/Sidebar.tsx` | Remover Duplicados e Responsaveis do menu |
| `MetricCard` | `src/components/shared/MetricCard.tsx` | Adicionar prop `onClick` e estilo clicavel |
| `EmptyState` | `src/components/shared/EmptyState.tsx` | Garantir que sempre tem CTA |
| `StatusBadge` | `src/components/shared/StatusBadge.tsx` | Adicionar estilo para "OVERDUE" |

---

## D) MICROCOPY SUGERIDA

### D.1) Dashboard

**TITULO DA PAGINA:**
- "Dashboard" → "Visao Executiva"
- DESCRICAO: "Saude da base de conhecimento em tempo real"

**CARDS:**

| Card | Titulo | Subtitulo | Tooltip | Click |
|------|--------|-----------|---------|-------|
| Criticas | "Criticas" | "Requerem acao imediata" | "Issues com severidade CRITICAL ou HIGH" | `/governance?severity=CRITICAL,HIGH` |
| Atrasadas | "Atrasadas" | "Passaram do prazo" | "Issues com dueDate < hoje" | `/governance?overdue=true` |
| Sem Dono | "Sem dono" | "Precisam ser atribuidas" | "Issues sem responsible definido" | `/governance?unassigned=true` |
| Evolucao | "Resolvidas (7d)" | "+23 vs semana anterior" | - | - |

**SECAO PRIORIZE AGORA:**
- Titulo: "Priorize agora"
- Subtitulo: "As 5 issues mais urgentes da sua fila"
- Empty state: "Parabens! Nao ha issues criticas pendentes."
- CTA: "Ver fila completa →"

**SECAO SISTEMAS:**
- Titulo: "Saude por sistema"
- Colunas: Sistema | Manuais | Issues | Criticas | Qualidade
- Empty state: "Nenhum sistema cadastrado ainda."

**SECAO RESPONSAVEIS:**
- Titulo: "Carga por responsavel"
- Subtitulo: "Quem esta com mais trabalho"
- Colunas: Responsavel | Abertas | Atrasadas | Acoes
- Empty state: "Nenhuma issue atribuida ainda."

### D.2) Governanca

**FILTROS:**
- Label Sistema: "Sistema" | Placeholder: "Todos os sistemas"
- Label Status: "Status" | Placeholder: "Todos os status"
- Label Severidade: "Severidade" | Placeholder: "Todas"
- Label Tipo: "Tipo de issue" | Placeholder: "Todos os tipos"

**TOGGLES:**
- "So atrasadas" (overdue)
- "Sem responsavel" (unassigned)

**BUSCA:**
- Placeholder: "Buscar por titulo ou sistema..."

**LISTA:**
- Header: "{total} issues | Ordenado por urgencia"
- Quando filtrado: "{total} issues encontradas | Limpar filtros"

**EMPTY STATES:**
- Com filtros: "Nenhuma issue encontrada com esses filtros." CTA: "Limpar filtros"
- Sem filtros: "Nenhuma issue pendente. A base esta saudavel!" (sem CTA)

### D.3) Modais e Toasts

**MODAL ATRIBUIR:**
- Titulo: "Atribuir responsavel"
- Subtitulo: "{Titulo do manual}"
- Label sugestao: "Sugestao automatica"
- Botao sugestao: "Atribuir para {nome}"
- Label alternativas: "Outras opcoes"
- Label manual: "Ou digite manualmente"
- Label prazo: "Prazo"
- Presets: "Hoje" | "+3 dias" | "+7 dias"
- Botoes: "Cancelar" | "Atribuir" | "Atribuir + Criar ticket"

**MODAL RESOLVER:**
- Titulo: "Resolver issue"
- Texto: "Confirma que esta issue foi resolvida?"
- Label nota: "Nota (opcional)"
- Placeholder nota: "Ex: Corrigido na versao 2.1"
- Botoes: "Cancelar" | "Confirmar"

**TOASTS:**
- Sucesso atribuir: "Atribuido para {nome}. Prazo: {data}"
- Sucesso resolver: "Issue marcada como resolvida"
- Sucesso status: "Status atualizado para {status}"
- Erro generico: "Erro ao processar. Tente novamente."
- Erro conexao: "Sem conexao. Verifique sua internet."

---

## E) PADROES DE ESTADO (QUALIDADE)

### E.1) Loading Skeleton

```
// Padrao: sempre mostrar skeleton no loading inicial
// Para lista de cards
<LoadingSkeleton variant="card" /> (repetir 4x)

// Para tabela
<LoadingSkeleton variant="table" rows={5} />

// Para grafico
<LoadingSkeleton variant="chart" />
```

### E.2) Empty State

```
// Com CTA (quando ha acao possivel)
<EmptyState
  icon={AlertTriangle}
  title="Nenhuma issue encontrada"
  description="Ajuste os filtros para ver outras issues."
  action={{ label: "Limpar filtros", onClick: handleClear }}
/>

// Sem CTA (estado positivo)
<EmptyState
  icon={CheckCircle}
  title="Tudo certo por aqui!"
  description="Nao ha issues pendentes neste momento."
/>
```

### E.3) Error State

```
// Padrao: icone erro + titulo + mensagem + retry
<ErrorState>
  <AlertCircle />
  <h3>Erro ao carregar dados</h3>
  <p>{errorMessage}</p>
  <Button onClick={handleRetry}>Tentar novamente</Button>
</ErrorState>
```

### E.4) Filtros na URL (Query String)

```
// Beneficios:
// - Compartilhar link filtrado
// - Voltar com mesmo contexto
// - Refresh mantem filtros

// Exemplo de URL:
/governance?system=CONSISAERP&severity=CRITICAL&overdue=true&page=1
```

### E.5) Acessibilidade Minima

1. Labels em todos os inputs
2. Botoes com texto ou aria-label
3. Navegacao por teclado (Tab funciona)
4. Feedback de acoes (Toast apos sucesso/erro)
5. Contraste de cores adequado

---

## F) CHECKLIST FINAL — CRITERIOS DE ACEITACAO

### F.1) Dashboard (Obrigatorio)

- [ ] Card "Criticas" mostra count de severity HIGH + CRITICAL
- [ ] Card "Atrasadas" mostra count de dueDate < hoje
- [ ] Card "Sem dono" mostra count de responsible === null
- [ ] Card "Resolvidas 7d" mostra count de resolvedLast7Days
- [ ] Click em cada card navega para Governanca com filtro correto na URL
- [ ] Secao "Priorize agora" mostra top 5 issues por severidade + SLA
- [ ] Secao "Por sistema" mostra tabela com click navegando filtrado
- [ ] Secao "Por responsavel" mostra tabela com carga
- [ ] Loading skeleton em todas as secoes
- [ ] Error state com retry em todas as secoes

### F.2) Governanca (Obrigatorio)

- [ ] Filtros: Sistema, Status, Severidade, Tipo (selects)
- [ ] Toggle "So atrasadas" funciona
- [ ] Toggle "Sem responsavel" funciona
- [ ] Busca por texto funciona
- [ ] Ordenacao padrao: Severidade DESC, SLA ASC
- [ ] Filtros persistem na URL (querystring)
- [ ] Atualizar pagina mantem filtros
- [ ] Link compartilhavel abre com filtros
- [ ] Item de issue mostra: tipo, severidade, titulo, sistema, SLA, responsavel, status
- [ ] Badge "Atrasado" aparece quando dueDate < hoje
- [ ] Acao "Atribuir" abre modal com sugestao
- [ ] Acao "Resolver" abre confirm dialog
- [ ] Acao "Historico" abre modal com timeline
- [ ] Issues tipo DUPLICATE_CONTENT tem botao "Ver duplicatas"
- [ ] Toast de sucesso/erro em todas as acoes
- [ ] Empty state com CTA "Limpar filtros"
- [ ] Paginacao funcionando

### F.3) Remocao/Fusao (Obrigatorio)

- [ ] Menu lateral nao tem mais "Duplicados"
- [ ] Menu lateral nao tem mais "Responsaveis"
- [ ] Rota `/duplicates` redireciona para `/governance?type=DUPLICATE_CONTENT`
- [ ] Rota `/responsibles` redireciona para `/governance` ou remove
- [ ] Logica de duplicados (definir principal, mesclar, ignorar) esta na Governanca

### F.4) Qualidade UX (Obrigatorio)

- [ ] Nenhuma tela fica branca durante loading
- [ ] Nenhum empty state sem mensagem explicativa
- [ ] Todos os erros tem botao retry
- [ ] Todos os toasts tem timeout (5s)
- [ ] Todos os modais tem botao cancelar/fechar
- [ ] Todos os inputs tem labels visiveis
- [ ] Tab navigation funciona em toda a app
- [ ] Tema dark/light funciona em todas as telas

### F.5) Tecnico (Obrigatorio)

- [ ] TypeScript sem erros
- [ ] Build sem warnings
- [ ] Sem console.log em producao
- [ ] Sem chamadas API duplicadas
- [ ] useEffect com cleanup adequado
- [ ] Keys unicas em listas

---

## G) ORDEM DE IMPLEMENTACAO SUGERIDA

### Sprint 4 — Fase 1 (Core)
1. Criar hook `useFiltersFromUrl`
2. Refatorar filtros da Governanca para usar URL
3. Adicionar toggles overdue/unassigned na Governanca
4. Implementar ordenacao por severidade + SLA

### Sprint 4 — Fase 2 (Dashboard)
5. Criar endpoint/mock para metricas executivas (criticals, overdue, unassigned)
6. Criar novos cards clicaveis no Dashboard
7. Criar secao "Priorize agora"
8. Criar secao "Por sistema"
9. Criar secao "Por responsavel"

### Sprint 4 — Fase 3 (Integracao Duplicados)
10. Criar componente `DuplicateExpander`
11. Integrar na Governanca para type=DUPLICATE_CONTENT
12. Criar redirect de `/duplicates` para governanca filtrada
13. Remover do menu

### Sprint 4 — Fase 4 (Cleanup)
14. Remover `/responsibles` do menu
15. Revisar empty states e CTAs
16. Testes manuais de todos os fluxos
17. Ajustes de microcopy

---

**FIM DO DOCUMENTO**

Este plano define claramente:
- O que existe e seus problemas
- O que deve virar o produto
- Como navegar entre telas
- Qual copy usar
- O que aceitar como pronto
