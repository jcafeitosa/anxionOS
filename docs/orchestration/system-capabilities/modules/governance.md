---
type: guide
---

# Funcionalidades — `modules/governance` (P02)

**Issue mapa:** ANX-43 · **Debate backlog:** ANX-40 · **Implementação:** ANX-30  
**Fontes:** [governance R01](../../structure-debate/governance/R01-context.md) · `brain/project-docs/specs/001-institutional-contract/spec.md` · `brain/project-docs/specs/003-investment-lifecycle/spec.md`

## Responsabilidade

Grants, delegação, mandatos, aprovações, ChangeProposal, `authorityEpoch` — **não** RiskPolicy/kill switch (risk), **não** execução de ordens.

## Histórias humanas

| Papel | Jornada | Command |
| --- | --- | --- |
| **Owner** | Conceder/revogar grant a membro ou agente | `IssueGrant`, `RevokeGrant` |
| **Owner** | Aprovar ChangeProposal (estratégia, software OP06) | `ResolveApproval` |
| **Owner** | Ver "por que negado" no console | `ExplainAuthority` via graph |
| **Operator** | Delegar tarefa com escopo limitado | `CreateDelegation` |
| **Platform** | Grants de engenharia PLATFORM (repo, deploy) | Policy PLATFORM — spec 004 |

## Histórias de agente

| Agente | Capacidade | Restrição |
| --- | --- | --- |
| **Brain AGENCY** | Listar grants próprios, solicitar delegação | Não auto-expandir grant |
| **Orchestration worker** | Verificar pré-condição grant antes de Run | Port `GrantLookup` |
| **Audit agent** | Trace grant chain em investigação | PLATFORM scope |

## Commands (sketch)

| Command | Efeito | Evento |
| --- | --- | --- |
| `IssueGrant` | Grant versionado + epoch++ | `governance.grant.issued.v1` |
| `RevokeGrant` | Fecha intervalo temporal | `governance.grant.revoked.v1` |
| `ResolveApproval` | APPROVED/REJECTED com reason | `governance.approval.resolved.v1` |
| `SubmitChangeProposal` | SOFTWARE ou INSTITUTIONAL kind | `governance.change_proposal.submitted.v1` |

## Queries (sketch)

| Query | Uso |
| --- | --- |
| `GetGrantById` | Admin UI |
| `ListEffectiveGrants` | Filtrado por principal + scope |
| `CanPerform` | Wrapper local; canônico em graph `authorization.can` |

## Integração

| Consumidor | Relação |
| --- | --- |
| **organizations** | Consome `membership.activated` → grant baseline Owner (CAP-B01) |
| **graph** | Projeção caminhos GRANT/MANDATE; `authorization.explain` |
| **risk** | PolicyVersion kind=RISK referenciada — dono estado em risk |
| **decisions/execution** | Revalidação epoch antes de permit |
| **simulation** | ChangeProposal aprova promoção twin → comandos donos |

## Eventos consumidos

- `organizations.membership.activated.v1`
- `organizations.membership.revoked.v1` → revogar grants derivados
- `risk.policy.updated.v1` → invalidar mandatos dependentes (R-debate)

## Gap código

**Ausente** — ANX-40 debate R1–R4 em [modules/governance/](../../modules/governance/); depende identity + organizations G0
