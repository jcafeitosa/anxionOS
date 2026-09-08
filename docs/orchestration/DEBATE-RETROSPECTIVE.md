---
type: guide
---

# DEBATE-RETROSPECTIVE — revisão pós-roster ANX-44

**Status:** ativo  
**Issue:** ANX-44 (roster obrigatório) · follow-up retrospectiva  
**Data:** 2026-09-07  
**Roster de referência:** [DEBATE-ROSTER.md](./DEBATE-ROSTER.md)  
**Transcripts retrospectivos:** [SLACK-RETROSPECTIVE.md](./SLACK-RETROSPECTIVE.md)

## Objetivo

Revisar debates **já concluídos ou avançados** com o roster completo de 8 personas (Orquestrador, Executor, Crítico, Code Review, QA, Security, Red Team, Arquiteto) e emitir disposição G2–G5 por decisão material, gaps de sessões pré-ANX-44 e itens a ratificar ou reabrir antes de G1.

## Escopo revisado

| Módulo / trilha | Estado debate | Artefatos | Sessões Slack |
| --- | --- | --- | --- |
| **organizations** | R01–R10 ✅ · `g0_ready` | R08, R10, 44× `D-ORG-*` | Sessions 1–5 (parcial roster até S4) |
| **identity** | structure-debate R01–R05 | R05-storage, ANX-28 P0 | Sessions 1–2 (S1 pré-roster) |
| **graph** | R01–R02 (+ Session D) | GK-R02-01..05, R02-boundaries | Session D (roster ✅), Session E (roster ✅) |
| **system-capabilities** | Sessions A/B/C | CAP-A/B/C*, RB-* | **PRE-roster** — gaps |

---

## Matriz de revisão — organizations (top 10 decisões)

Revisão retrospectiva Session R1 (`#retro-organizations`). Disposição por gate independente sobre o **pacote documental** — não substitui G1–G7 na implementação.

| Decisão | Resumo | G2 (Code Review) | G3 (QA) | G4 (Security) | G5 (Red Team) | Disposição |
| --- | --- | --- | --- | --- | --- | --- |
| **D-ORG-001** | PG dono Agency/Owner/Membership | Contratos + schema alinhados ADR0002 | Fixtures por tenant cobertos G3-02 | Tenancy explícito em mutações | Cross-tenant enumeração G5 | **PASS** |
| **D-ORG-002** | identity dono sessão; org recebe `principalId` | Port `PrincipalLookup` sem FK cross-module | Mock S1–S3; integração real S4+ | Sem credencial BA em org | Body tampering `principalId` | **PASS** (G1 bloqueado PC-G0-04) |
| **D-ORG-010** | Idempotency-Key → command journal | Journal mesma transação outbox (P-R5-06) | Replay key → sem segundo INSERT | — | Replay paralelo invite | **PASS** |
| **D-ORG-015** | `ORG_CROSS_TENANT` 403 | Repositórios exigem `agencyId` | G3-02 obrigatório | Defense-in-depth v1 | Rotas A→agency B | **PASS** |
| **D-ORG-018/019** | HMAC token; sem token em eventos/logs | Adapter hasher isolado | G3-07 expirado, G3-08 mismatch | Pepper fail-fast; dual-pepper 24h | Brute-force accept + log PII | **PASS** |
| **D-ORG-026** | RLS adiado P09; application-only v1 | AR01 + assinaturas repo | G3/G5 compensam | **CHANGES_REQUIRED** aceito com condições G5 | Cross-tenant sem RLS | **CHANGES_REQUIRED** — G5 obrigatório antes G4 PASS |
| **D-ORG-034** | Email match accept-invite | Erro `ORG_INVITE_EMAIL_MISMATCH` em contracts S1 | G3-08; token não consumido | Fecha P-R7-01 | Token vazado + sessão errada | **PASS** |
| **D-ORG-033** | ANX-29 bloqueada até identity G7 | Slice 4+ sem merge sem `getPrincipalById` | Fixture suspended antes wiring | Fail-closed 503 identity down | — | **PASS** (bloqueio upstream documentado) |
| **D-ORG-035** | Quota `maxCompanies` → billing P07 | Org v1 sem quota local | G3-10 dupla key = esperado | — | Dupla Agency abuse | **PASS** com risco residual aceito v1 |
| **D-ORG-021** | Consumer `graph:organizations:v1` | Eventos only; sem Neo4j em org | Replay `eventId` (graph QA) | — | — | **PASS** (impl graph P03 downstream) |

**Disposição geral organizations (debate):** **PASS** com **CHANGES_REQUIRED** em D-ORG-026 (compensação G5 documental → execução obrigatória em S6).

---

## Matriz de revisão — identity (R05 + ANX-28 P0)

Revisão retrospectiva Session R2 (`#retro-identity`).

| Decisão / item | Resumo | G2 | G3 | G4 | G5 | Disposição |
| --- | --- | --- | --- | --- | --- | --- |
| **P0-1** `findById` | Repo retorna agregado cru | Regra não no SQL | Fixture active/suspended | — | — | **CHANGES_REQUIRED** — código ausente |
| **P0-2** `getPrincipalById` export | Bloqueia organizations wiring | Export público `index.ts` | Testes query layer | — | Enumeração futura | **CHANGES_REQUIRED** — código ausente |
| **P0-3** fail-closed suspended | INV-IDN-04 na application | Não filtrar suspended no SQL | `principal_suspended` → null | AuthZ fail-closed | Replay evento com `authUserId` | **CHANGES_REQUIRED** |
| **R05 norma eventos** | Sem `authUserId` em outbox | Dois PRs P0/P1 | Idempotência signup | **CHANGES_REQUIRED** código atual viola | Correlacionar BA em SIEM | **CHANGES_REQUIRED** |
| **Defer 0001 suspend** | Colunas com `suspendPrincipal` | Minimal diff | — | — | — | **PASS** |
| **Defer command journal** | Sem HTTP Idempotency-Key identity | — | Corrida signup paralela | — | 10× register paralelo | **PASS** com teste G3 anotado |

**Disposição geral identity:** **CHANGES_REQUIRED** — debate R05 **PASS** documental; ANX-28 P0 **não** pronto para G7 até evidência de testes.

---

## Matriz de revisão — graph (GK-R02)

Revisão retrospectiva Session R3 (`#retro-cross-cutting`).

| Decisão | Resumo | G2 | G3 | G4 | G5 | Disposição |
| --- | --- | --- | --- | --- | --- | --- |
| **GK-R02-01** | Registry único; T01–T03 kernel puro | AR01 sem import cross-repo | F0 oracles após RB-D04 | Scope injection | Cypher injection via prompt | **PASS** |
| **GK-R02-02** | Neo4j adapter isolado | Dependency test build | — | Credencial só graph worker | connections "debug" import | **PASS** |
| **GK-R02-03** | Dispatcher → ownerDomain | GK02 tipos registrados | — | — | Falsa `node.update` Grant | **PASS** |
| **GK-R02-04** | `graph:organizations:v1` | Idempotência inbox | Replay eventId | — | — | **PASS** |
| **GK-R02-05** | `projectionPending` async default | Contrato HTTP em R04 | Poll checkpoint | TOCTOU falsa visibilidade | stale ALLOW → PG DENY | **CHANGES_REQUIRED** — aberto R04 |

**Disposição geral graph R02:** **PASS** parcial — RB-D01 resolvido exceto GK-R02-05 → R04.

---

## Matriz de revisão — system-capabilities (CAP-A/B/C)

Sessões **anteriores ao roster ANX-44**. Revisão retrospectiva Session R3.

| Decisão | Resumo | G2 | G3 | G4 | G5 | Disposição |
| --- | --- | --- | --- | --- | --- | --- |
| **CAP-A01** | CAPABILITY-MAP fonte R-debate | Manifests antes G1 | — | Paridade stale/epoch | Agente sem Neo4j | **PASS** — **ratificar** |
| **CAP-A02** | CapabilityManifest P02+ | AR07 CI | — | — | — | **PASS** — **ratificar** |
| **CAP-A03** | WAITING_HUMAN_INPUT | Run checkpoint | E2E resume | Segredo fora transcript | Simular consentimento | **PASS** — **ratificar** |
| **CAP-B01** | Grant baseline via governance | Event-driven | — | Sem grant em org | — | **PASS** — **ratificar** |
| **CAP-B02** | Email match sem exceção agente | — | — | Alinhado D-ORG-034 | — | **PASS** — já consolidado |
| **CAP-C01** | TradeIntent imutável pós submit | Novo intent referenciado | — | intentHash permit | Tampering quantity | **PASS** — debate only |
| **CAP-C02** | Permit amarra intentHash+epochs | — | — | — | Pós-RiskCheck swap | **PASS** — debate only |
| **CAP-D01..04** | Graph kernel (Session D) | Roster ✅ Session D | F0 gate | Neo4j isolation | Adversariais T01/T09 | **PASS** |

**Disposição geral system-capabilities:** **CHANGES_REQUIRED** — decisões **ratificáveis**, mas Sessions A/B/C **inválidas como artefato de gate** por roster incompleto (ver gaps).

---

## Gaps — sessões pré-ANX-44 (roster incompleto)

| Sessão | Canal | Participantes registrados | Faltantes vs roster 8 | Severidade | Ação |
| --- | --- | --- | --- | --- | --- |
| **CAP Session A** | `#platform-vision` | Orq, Arq, Exec, Crít | Code Review, QA, Security, Red Team | Alta | Ratificar via Session R3; não reexecutar debate inteiro |
| **CAP Session B** | `#module-p02-foundation` | Orq, Arq, Exec, Crít, Sec | Code Review, QA, Red Team | Alta | Ratificar CAP-B* em R3 |
| **CAP Session C** | `#module-p06-investment` | Orq, Arq, Exec, Crít, Sec | Code Review, QA, Red Team | Média | Documental P06; código ausente |
| **identity Session 1** | `#module-identity` | Orq, Arq, Exec, Crít, Sec | Code Review, QA, Red Team | Média | R03/R04 substancialmente cobertos em Session 2 roster completo |
| **organizations Session 1** | `#module-organizations` | 8 personas | — | OK | Modelo pré-R10 |
| **organizations Session 3** | `#module-organizations` | Verificar artefato | Possível gap em mensagens | Baixa | Session 5 + R1 retro cobrem |
| **graph** | Session D, E | 8 personas | — | OK | Referência pós-ANX-44 |

**Regra aplicada:** ausência de persona invalida transcript como evidência de gate G1–G7 ([DEBATE-ROSTER.md](./DEBATE-ROSTER.md)). Decisões CAP-A/B/C permanecem **propostas ratificáveis**, não **aprovadas por gate**.

---

## Tabela resumo — disposição por módulo

| Módulo | Debate | Disposição geral gates G2–G5 (documental) | Must-fix antes G1 |
| --- | --- | --- | --- |
| **organizations** | R01–R10 `g0_ready` | **PASS** (1× CHANGES_REQUIRED compensação RLS) | Executar G5 R07 em S6; PC-G0-04 identity; erros ORG_* em contracts S1 |
| **identity** | R01–R05 | **CHANGES_REQUIRED** | P0 `findById` + `getPrincipalById` + testes suspended; P1 eventos antes outbox relay |
| **graph** | R01–R02 | **PASS** parcial | Fechar GK-R02-05 em R04; RB-D04 governance grants |
| **system-capabilities** | A/B/C + D | **CHANGES_REQUIRED** (roster) | Ratificar CAP-A/B/C via R3; não bloqueia org G1 |

---

## Action items — ratificar ou reabrir

| ID | Ação | Tipo | Responsável | Issue / artefato |
| --- | --- | --- | --- | --- |
| **RET-01** | Ratificar CAP-A01..A03, CAP-B01..B03, CAP-C01..C03 via Session R3 | Ratificar | Orquestrador | [SLACK-RETROSPECTIVE.md §R3](./SLACK-RETROSPECTIVE.md#session-r3--retro-cross-cutting) |
| **RET-02** | Marcar Sessions A/B/C como `superseded_by: R3` no cabeçalho SLACK-TRANSCRIPTS | Documentação | Executor | `system-capabilities/SLACK-TRANSCRIPTS.md` — **feito** (pós-retrospectiva) |
| **RET-03** | **Não reabrir** D-ORG-034/035 — consolidados R08 | Ratificar | — | R08 |
| **RET-04** | Reabrir **R04 graph** para GK-R02-05 `projectionPending` HTTP | Reabrir rodada | Arquiteto | graph structure-debate |
| **RET-05** | ANX-28: implementar P0 1–3 antes de organizations slice 4+ | ~~Bloqueante G1~~ **Resolvido** (P0 verificado `2d869a83`/`a7d9b222`, 5 testes pass) | Executor identity | ANX-28 (`in_review` → G7 aceite) |
| **RET-06** | organizations S6: G5 checklist R07 **obrigatório** antes G4 sign-off (D-ORG-026) | Executar | Executor org | ANX-29 |
| **RET-07** | Adicionar nota `PRE-ROSTER` em identity Session 1 header | Documentação | Executor | identity/SLACK-TRANSCRIPTS.md |
| **RET-08** | Atualizar DEBATE-FORMAT com link a este retrospectivo | Documentação | Orquestrador | DEBATE-FORMAT.md |

---

## Veredito retrospectivo ANX-44

| Pergunta | Resposta |
| --- | --- |
| Debates organizations prontos para claim ANX-29? | **Sim** — G0 PASS; G1 bloqueado PC-G0-04 |
| identity pronta para G7? | **P0 implementado** (`in_review`) — G7 pendente aceite usuário; P1 eventos/outbox ainda CHANGES_REQUIRED |
| graph R02 suficiente para P03 scaffold? | **Sim** — com R04 pendente GK-R02-05 |
| CAP sessions válidas como gate? | **Não** — ratificar via R3 |
| Roster ANX-44 aplicável retroativamente? | **Revisão sim; aprovação gate não** — Sessions R1–R3 fecham gap documental |

**Próximo passo:** comentário em ANX-44 com link a este artefato + transcripts R1–R3.

---

## Atualização pós-retrospectiva

**Data:** 2026-09-07 · **Follow-up:** Session R2 veredito P0 superseded por verificação de código

| Item | Estado anterior (Session R2) | Estado atual | Evidência |
| --- | --- | --- | --- |
| **ANX-28 P0** (`findById`, `getPrincipalById`, fail-closed) | **CHANGES_REQUIRED** — código ausente | **IMPLEMENTADO** (`in_review`) | Verificação `2d869a83` / `a7d9b222` — 5 testes pass |
| **organizations S1** | Planejado (contracts + erros ORG_*) | **DONE** | Commit `29e6f280` |
| **RET-05** | Bloqueante G1 — implementar P0 1–3 | **Resolvido** | P0 verificado em código + testes |

**Veredito Session R2 (P0 código):** superseded para o escopo P0 — a disposição **CHANGES_REQUIRED** da matriz identity (linhas P0-1..P0-3) refletia o estado pré-implementação; permanece válida apenas para itens **não** cobertos pelo P0 (ex.: P1 eventos/outbox).

### Bloqueios remanescentes

| Bloqueio | Tipo | Notas |
| --- | --- | --- |
| **ANX-28 G7** | Aceite usuário | P0 implementado; `done` exige aceite explícito |
| **organizations S2–S6** | Implementação | S1 concluído; slices 2–6 pendentes |
| **G5 S6 antes G4 sign-off** | Condição D-ORG-026 | Checklist R07 obrigatório em S6 antes de PASS G4 em código |

**RET-02:** Sessions A/B/C em `system-capabilities/SLACK-TRANSCRIPTS.md` marcadas `superseded_by: Session R3`.

