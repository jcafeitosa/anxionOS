---
type: product-decision
issue: ANX-496
status: published
publisher: Marina Okonkwo
source: Draft by Renata Alves (OpenKnowledge)
date: 2026-09-12
---

# ANX-496 — Owner Agents Catalog: Honesty Only

**Status:** Published  
**Issue:** ANX-496  
**Publisher:** Marina Okonkwo  
**Draft:** Renata Alves

## Decisão

**Owner Agents Catalog — honesty only.**

- **Operator Takeover BLOCK outside P07:**  
  Operator Takeover está **bloqueado** fora do escopo P07.

- **Eng parked:**  
  Trabalho de engenharia está **estacionado** até nova autorização.

## Critérios de Honesty (H1–H4)

### H1 — Empty State Honesto
**Quando:** Catálogo vazio (zero agents).  
**Comportamento:** Mostrar mensagem clara de estado vazio, sem simular agentes fake.

### H2 — Loading State Real
**Quando:** Carregando dados.  
**Comportamento:** Spinner ou skeleton screen autêntico, sem dados placeholder.

### H3 — Error State Transparente
**Quando:** Erro ao carregar.  
**Comportamento:** Mensagem de erro clara com contexto, sem ocultar falhas.

### H4 — Data Fidelity
**Quando:** Dados carregados.  
**Comportamento:** Mostrar dados reais do backend, sem enriquecimento de UI fake.

## Critérios Estendidos (HX1–HX6)

### HX1 — No Phantom Actions
**Comportamento:** Botões desabilitados ou ocultos quando ação não está disponível. Não mostrar botões que falham silenciosamente.

### HX2 — Consistent State
**Comportamento:** Estado de UI reflete backend. Nenhuma divergência entre cache de UI e backend sem reconciliação explícita.

### HX3 — Real-Time Feedback
**Comportamento:** Feedback imediato de ações (success/error), não simulado.

### HX4 — Permission Honesty
**Comportamento:** UI mostra apenas recursos/ações que o usuário tem permissão de acessar.

### HX5 — Capability Gates
**Comportamento:** Features não implementadas no backend **não aparecem** na UI, mesmo como "coming soon" sem backend real.

### HX6 — Data Provenance
**Comportamento:** Dados mostrados têm origem clara (backend/cache/local). Nenhum dado "demo" misturado com real sem distinção visual.

## Evidência Matriz

**Quando engenharia retomar:**

| Critério | Teste | Verificação | Status |
| --- | --- | --- | --- |
| H1 | Empty state | `GET /v1/agents` retorna `[]` → UI mostra estado vazio | Pendente |
| H2 | Loading | Carregar com delay → UI mostra spinner | Pendente |
| H3 | Error | Forçar erro 500 → UI mostra mensagem de erro | Pendente |
| H4 | Dados reais | `GET /v1/agents` com fixtures → UI renderiza exatos fixtures | Pendente |
| HX1 | No phantom | Actions desabilitadas quando backend não suporta | Pendente |
| HX2 | Consistent | Verificar reconciliação cache/backend | Pendente |
| HX3 | Real feedback | Ações retornam success/error backend real | Pendente |
| HX4 | Permissions | UI oculta ações sem permissão | Pendente |
| HX5 | Capability gates | Features sem backend não aparecem | Pendente |
| HX6 | Provenance | Dados marcados com origem clara | Pendente |

## Arquivos Frontend (Quando Eng Retomar)

**Paths identificados:**

- `frontend/src/routes/agency-agents-catalog.ts`
- `frontend/src/components/OwnerAgentsCatalog.tsx`

**Teste E2E:**

- `frontend/e2e/auth-routing.spec.ts` — ainda **vazio** de testes de catalog (`.get("")` não encontrado)

**Status no `origin/main`:**

- `origin/main` **sem** implementação de `.get("")` para catalog
- Local WIP uncommitted **não conta** para evidência

## Contexto

Esta decisão define critérios de **honesty UX** para o Owner Agents Catalog, bloqueando Operator Takeover fora de P07 e estacionando engenharia até nova autorização.

Quando engenharia retomar, todos os critérios H1–H4 e HX1–HX6 devem ser verificados antes de `in_review`.

## Próximos Passos

- Aguardar autorização para retomar engenharia
- Implementar critérios de honesty quando autorizado
- Preencher matriz de evidência
- Testes E2E para catalog honesty
