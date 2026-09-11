---
type: guide
---

# Precedência documental (ANX-455)

Este repositório mantém **duas árvores documentais ativas**:

- **`brain/`** — OKF **local** (gitignored, não publicado). Canônico para o domínio institucional.
- **Versionado** (`docs/`, `notes/`, `project-docs/`) — publicado no GitHub. Parte do conteúdo **não existe em `brain/`** e é canônica no próprio caminho.

**Não há vencedor genérico entre as árvores.** A precedência é **por documento, por assunto**: vale o artefato aceito para aquele assunto. Como a numeração **colide** entre as árvores, um ADR/spec identifica-se por **caminho + título**, nunca só pelo número.

| Situação | Disposição |
| --- | --- |
| Duas cópias do **mesmo assunto**, uma canônica | A cópia versionada fica `superseded` apontando para a canônica |
| Dois documentos de **assuntos distintos** com o **mesmo número** | **Ambos válidos.** Nenhum é legado; identificar por caminho + título |
| Documento **sem contraparte** em `brain/` | Permanece válido no seu status próprio |

> **Correção de 2026-09-11 (auditoria ANX-455).** Uma primeira versão deste registro declarava `project-docs/` e `docs/decisions/` inteiramente **legado** e, com base nisso, marcou como `superseded` artefatos **aceitos pelo Owner no greenlight ANX-276** — o ADR0005 Product Graph, a spec 006 Product/Agent Graph, a spec 007 Products/Marketplace e o ADR do realtime gateway — apontando para documentos **draft de assuntos diferentes**. O status original foi restaurado. Regra: **um draft nunca substitui um artefato aceito**, e colisão de número não é motivo de rebaixamento.

## ADRs

| Nº | Caminho | Assunto | Status | Precedência |
| --- | --- | --- | --- | --- |
| 0001 | `brain/project-docs/decisions/0001-graph-operational-domain-authority.md` | Grafo operacional por domínio | draft | única |
| 0002 | `brain/project-docs/decisions/0002-adopt-modular-backend-layout.md` | Layout modular do backend | stable | canônica |
| 0003 | `brain/project-docs/decisions/0003-tool-gateway-module-placement.md` | Tool gateway no módulo `tools` | draft | única |
| 0004 | `brain/project-docs/decisions/0004-postgresql-timescaledb-pgvector.md` | PostgreSQL / Timescale / pgvector / Neo4j | stable | canônica |
| **0010** | `brain/project-docs/decisions/0010-agent-hierarchy-modes-triangular-circular.md` | **Hierarquia de agentes** TREE/CIRCULAR | draft | renumerado de 0005 (ANX-456) |
| 0005 | `project-docs/decisions/0005-product-graph-neo4j-projection.md` | **Product Graph** como projeção Neo4j | **accepted** (ANX-276) | vale para Product Graph |
| **0011** | `docs/decisions/0011-realtime-gateway-elysia-nats.md` | **Realtime gateway** (Elysia + NATS) | proposed | renumerado de 0005 (ANX-456) |
| 0006 | `brain/project-docs/decisions/0006-distribute-external-gateways-within-baseline.md` | Gateways externos nos 23 módulos | stable | canônica |
| 0007 | `brain/project-docs/decisions/0007-multi-tenancy-strategy.md` | Estratégia multi-tenancy | stable | canônica |

## Specs

| Nº | Caminho | Assunto | Status | Precedência |
| --- | --- | --- | --- | --- |
| 001 | `brain/project-docs/specs/001-institutional-contract/` | SDD institucional | accepted | canônica |
| 002 | `brain/project-docs/specs/002-agents-knowledge/spec.md` | Agents, Brain, orquestração | accepted (G7 2026-09-11) | canônica |
| 002 | `project-docs/specs/002-agents-knowledge/spec.md` | Anexo de completude P1 | superseded | anexo do **mesmo** assunto |
| 003 | `brain/project-docs/specs/003-investment-lifecycle/` | Ciclo de investimento | accepted | canônica |
| 003 | `project-docs/specs/003-investment-lifecycle/` | Anexo de completude P1 | superseded | anexo do **mesmo** assunto |
| 004 | `brain/project-docs/specs/004-institutional-evolution/` | Evolução institucional | accepted | canônica |
| 004 | `project-docs/specs/004-institutional-evolution/` | Anexo de completude P1 | superseded | anexo do **mesmo** assunto |
| 005 | `brain/project-docs/specs/005-connections-integration/` | Connections | accepted | canônica |
| 005 | `project-docs/specs/005-connections-integration/` | Anexo de completude P1 | superseded | anexo do **mesmo** assunto |
| **010** | `brain/project-docs/specs/010-agent-hierarchy-orchestration/` | **Hierarquia de agentes** | draft | renumerado de 006 (ANX-456) |
| 006 | `project-docs/specs/006-product-agent-graph/spec.md` | **Product Graph / Agent Graph** | accepted (ANX-276) | vale para Product Graph |
| 007 | `project-docs/specs/007-products-marketplace-capability/spec.md` | Products / Marketplace | draft | **única**, sem contraparte |
| 008 | `brain/project-docs/specs/008-multi-tenant-isolation/` | Isolamento multi-tenant | stable | canônica |
| — | `project-docs/specs/anx-governance-decision-engine/` | Decision engine | sem `status` | única; regularizar frontmatter |

## Pendência estrutural — RESOLVIDA (ANX-456)

A colisão em 0005 e 006 foi **eliminada na origem**. Numeração final:

| Antes | Depois | Onde |
| --- | --- | --- |
| ADR 0005 hierarquia de agentes | **ADR 0010** | `brain/` (renumerado; era o lado `draft`) |
| spec 006 hierarquia de agentes | **spec 010** | `brain/` (renumerado; era o lado `draft`) |
| ADR 0005 realtime gateway | **ADR 0011** | `docs/decisions/` (renumerado; era `proposed`) |

Os dois artefatos **aceitos** mantiveram o número: `project-docs/decisions/0005-product-graph-neo4j-projection.md` (accepted, ANX-276) e `project-docs/specs/006-product-agent-graph/` (accepted, ANX-276). Regra aplicada: **nunca renumerar artefato aceito** — renumera-se o `draft`/`proposed`.

> **Extensão de escopo registrada (ANX-456).** O enunciado pedia renumerar só o lado `brain/`, mas o próprio critério de aceite exige que "ADR0005 e spec 006 existam em um **único** caminho cada (raiz)". Renumerar apenas `brain/` deixaria 0005 em **dois** caminhos versionados (`project-docs/decisions/` e `docs/decisions/`), porque o ADR do gateway (então numerado 0005) também vive em `docs/decisions/`. Para satisfazer o critério, o ADR `proposed` do gateway foi renumerado para **0011** — mesma regra de precedência (o aceito prevalece).

## Verificação

```bash
# Colisão eliminada: nao deve sobrar nenhuma referencia as numeracoes antigas
# Padrao em alternacao regex para o comando NAO casar consigo mesmo.
grep -rnE "0(005|06)-agent-hierarchy|0(005)-realtime-gateway" . \
  --include="*.md" 2>/dev/null | grep -v node_modules || echo "ok: sem referencia as numeracoes antigas"
# Um unico artefato por numero reivindicado
ls brain/project-docs/decisions/ | grep -E "^0010"; ls docs/decisions/ | grep -E "^0011"
# Colisões conhecidas
grep -rl "^status: superseded" project-docs/decision* docs/decisions 2>/dev/null
# Nenhum artefato aceito deve estar superseded
grep -rn "status: accepted" project-docs/decisions/0005-product-graph-neo4j-projection.md \
  project-docs/specs/006-product-agent-graph/spec.md
# Estado factual do repositório
grep -n "esqueleto parcial" AGENTS.md || echo "ok: estado atual sem 'esqueleto parcial'"
```
