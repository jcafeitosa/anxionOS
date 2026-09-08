---
type: guide
---

# DEBATE-ROSTER — personas obrigatórias

**Status:** ativo  
**Issue de referência:** ANX-42, ANX-39  
**Protocolo:** [DEBATE-FORMAT.md](./DEBATE-FORMAT.md)  
**Fonte de personas:** `brain/notes/anxionos-team-personas.md`

## Mandato do usuário (2026-09-07)

**Todo debate formal** — rodadas R01–R10, structure-debate, system-capabilities — deve incluir **todas** as personas abaixo com parecer independente. Ausência de qualquer papel invalida o transcript como artefato de gate.

## Roster obrigatório (8 personas)

| # | Papel | DisplayName | Responsabilidade | Gate alinhado |
| ---: | --- | --- | --- | --- |
| 1 | Orquestrador | **Orquestrador (CTO)** | Abre/fecha sessão, consolida consenso, handoff taskboard | G0, G6, G7 |
| 2 | Executor | **Executor (Dev)** | Implementabilidade, ports, wiring, estimativa | G1 |
| 3 | Crítico | **Crítico** | Premissas frágeis, escopo creep, evidência | G1 (crítico independente) |
| 4 | Code Review | **Code Review** | Contratos, manutenção, idempotência, diff | G2 |
| 5 | QA | **QA** | Cenários reproduzíveis, critérios G3, fixtures | G3 |
| 6 | Security | **Security (Kai)** | Tenancy, secrets, fail-closed, eventos | G4 |
| 7 | Red Team | **Red Team (Ryn)** | Cenários adversariais, bypass, abuso | G5 |
| 8 | Arquiteto | **Arquiteto** | Boundaries ADR0002, dependências, storage | G0, G2 |

## Regras de participação

| Regra | Detalhe |
| --- | --- |
| Volume mínimo | ≥12 mensagens por sessão; debates de rodada R05+ exigem **≥18 mensagens** quando há implementação bloqueada |
| Discordância | Pelo menos um eixo contestado com resolução explícita |
| Independência | Nenhuma persona aprova alteração que ela mesma escreveu como Executor |
| Reações | `(reação: ✅)` não equivale a PASS de gate G1–G7 |
| Idioma | PT-BR no corpo; identificadores de código em inglês |

## Mapeamento por rodada (participantes típicos + obrigatórios)

Todas as rodadas incluem o roster completo. A coluna "foco" indica quem lidera o debate — não quem pode omitir parecer.

| Rodada | Foco principal | Artefato |
| --- | --- | --- |
| R01 | Orquestrador, Arquiteto | `R01-context.md` |
| R02 | Arquiteto, Crítico, Security | `R02-boundaries.md` |
| R03 | Executor, Arquiteto, Crítico | `R03-domain-sketch.md` |
| R04 | Executor, Code Review, Arquiteto | `R04-contracts*.md` |
| R05 | Executor, Arquiteto, Security | `R05-storage.md` |
| R06 | Arquiteto, Executor, Security | `R06-dependencies.md` |
| R07 | Security, Crítico, Red Team | `R07-risks.md` |
| R08 | Orquestrador, Crítico | `R08-decision-log.md` |
| R09 | Executor, QA, Code Review | `R09-dev-plan.md` |
| R10 | Orquestrador, todas | `R10-g0-package.md` |

## Onde registrar transcripts

| Trilha | Arquivo |
| --- | --- |
| Módulo (ex.: organizations) | `docs/orchestration/modules/<module>/SLACK-TRANSCRIPTS.md` |
| Structure-debate (ex.: identity) | `docs/orchestration/structure-debate/<component>/SLACK-TRANSCRIPTS.md` |
| System-capabilities | `docs/orchestration/system-capabilities/SLACK-TRANSCRIPTS.md` |

## Histórico

| Data | Mudança |
| --- | --- |
| 2026-09-07 | Roster criado — mandato 8 personas obrigatórias (follow-up 229bc510, identity R04 46d86f86) |
