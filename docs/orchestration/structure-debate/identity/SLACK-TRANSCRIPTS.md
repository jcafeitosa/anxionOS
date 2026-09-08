---
type: debate
---

# Slack transcripts — `modules/identity`

Transcrições de debates multi-persona conforme [DEBATE-FORMAT.md](../../DEBATE-FORMAT.md).

---

## Session 1 — R03 ratificação + R04 contratos + P0 ANX-28 {#session-1}

**Canal:** `#module-identity`  
**Issue:** ANX-42 · ANX-28 (`in_review`) · **Rodadas:** R03 ratificação, R04 contratos  
**Data:** 2026-09-07  
**Participantes:** Orquestrador (CTO), Arquiteto, Executor (Dev), Crítico, Security (Kai)

---

**Orquestrador (CTO)** · 21:30  
@channel fechamos R03 domain sketch e abrimos R04 contratos/eventos. Contexto: ANX-28 em `in_review` com gap P0 — `getPrincipalById` e `findById` ausentes. organizations ANX-29 bloqueada até identity G1. Precisamos ratificar R03 e fechar naming `identity.principal.*.v1` antes do executor retomar código.

_(reação: 👀 4 — Arquiteto, Executor, Crítico, Security receberam)_

---

**Arquiteto** · 21:32  
@Orquestrador R03 está sólido: um agregado `Principal` humano, global à plataforma, tenant via Membership em organizations. ServicePrincipal fica sketch R05 — sem expandir escopo ANX-28. Projeção Neo4j via eventos, sem port Neo4j em identity. Alguma objeção ao fail-closed em suspended?

---

**Crítico** · 21:34  
@Arquiteto objeção parcial. R03 marca fail-closed, mas o código ANX-28 ainda não prova isso em `getPrincipalByAuthUserId`. Para organizations, `PrincipalLookup.exists` **deve** retornar `false` em suspended — não 404 vs false inconsistente. Proponho: queries de autorização retornam `null`; adapter organizations traduz para `exists = false`.

↳ **thread**

---

**Security (Kai)** · 21:36  
@Crítico +1. E no R04: payload de `identity.principal.registered.v1` **sem** `authUserId`. Código atual coloca `authUserId` no outbox — isso é vazamento cross-boundary. `authUserId` só em PG identity e boundary BA. Email no evento é aceitável (INTERNAL classification no grafo).

_(reação: ✅ Arquiteto)_

---

**Executor (Dev)** · 21:38  
@Security anotado. Meu slice P0 ANX-28:  
1. `PrincipalRepository.findById` no Drizzle repo  
2. `getPrincipalById` em `application/queries/get-principal.ts`  
3. Export em `index.ts`  
4. Testes: active → Principal, suspended → null, missing → null  

P1 depois: renomear `principal.registered` → `identity.principal.registered.v1` e tirar `authUserId` do payload. Não misturo com P0 — organizations só precisa do lookup.

---

**Arquiteto** · 21:40  
@Executor concordo na separação P0/P1. Adapter organizations em R06 já assume `getPrincipalById` — não reinventar port em identity. `PrincipalLookup` continua dono de organizations; identity só expõe query pública.

```typescript
// organizations adapter — referência R04
async exists(principalId: string): Promise<boolean> {
  const p = await getPrincipalById(deps, principalId);
  return p !== null;
}
```

---

**Crítico** · 21:42  
@Executor pergunta de aceite: se `findById` retorna suspended mas `getPrincipalById` filtra, o repositório deve retornar o registro cru e a query aplica regra? Minha preferência: **sim** — regra de autorização na application query, não no SQL. Facilita teste e reativação futura.

_(reação: 👍 Executor)_

---

**Executor (Dev)** · 21:44  
@Crítico exato. `findById` retorna o agregado; `getPrincipalById` e `getPrincipalByAuthUserId` aplicam INV-IDN-04 (suspended → null para lookups de autorização). Unit test separado por camada.

---

**Security (Kai)** · 21:46  
@channel sobre `identity.principal.suspended.v1`: `reasonCode` enum fechado (`ops.manual`, `governance.revoked`, `security.incident`, `user.requested`) — sem texto livre com PII. Invalidação de sessão BA **não** no comando identity — consumer `apps/api:identity-sessions:v1` em R09. identity emite fato; composition root revoga cookie.

---

**Orquestrador (CTO)** · 21:48  
Consenso emergente:  
- R03 ✅ ratificado  
- R04 ✅ contratos `identity.principal.*.v1` + exports + PrincipalLookup  
- ANX-28 P0 = itens 1–3 do R04 (findById, getPrincipalById, fail-closed)  

@Executor pode retomar implementação assim que G1 reabrir. @Crítico algum bloqueante?

---

**Crítico** · 21:50  
@Orquestrador sem bloqueante se P0 for mergeável independente de P1 (eventType). Bloqueante seria shippar organizations adapter sem teste de suspended — QA precisa fixture `principal suspended` antes de ANX-29 G1.

---

**Arquiteto** · 21:52  
Registro dependência downstream: organizations R06 D-R6-01/D-R6-03 permanecem válidos. ANX-29 continua bloqueada até identity G7 — mas G1 lookup é o gargalo imediato. Próxima rodada identity: R05 storage (`identity_principals`, journal, outbox).

_(reação: ✅ Orquestrador · 📌 canal)_

---

**Orquestrador (CTO)** · 21:54  
Encerrado. Artefatos: [R03-domain-sketch.md](./R03-domain-sketch.md), [R04-contracts-events.md](./R04-contracts-events.md). Comentários em ANX-28 (escopo P0) e ANX-42 (link R04). Thread `#module-identity` arquivada até R05 prep.

---

## Session 2 — R05 storage + ANX-28 P0 readiness {#session-2}

**Canal:** `#module-identity`  
**Issue:** ANX-42 · ANX-28 (`in_review`) · **Rodada:** R05 armazenamento  
**Data:** 2026-09-07  
**Participantes:** Orquestrador (CTO), Executor (Dev), Crítico, Code Review, QA, Security (Kai), Red Team (Ryn), Arquiteto  
**Roster:** [DEBATE-ROSTER.md](../../DEBATE-ROSTER.md)

---

**Orquestrador (CTO)** · 22:05  
@channel retomamos identity após R04. Hoje: fechar **R05 storage** (`identity_principals`, journal/outbox, sem segredos em eventos) e responder se ANX-28 está **pronta para retomada G1** no slice P0 (`findById`, `getPrincipalById`, fail-closed). organizations ANX-29 continua bloqueada até identity G7 — mas o gargalo imediato é lookup P0.

_(reação: 👀 7 — todas as personas receberam)_

---

**Arquiteto** · 22:07  
@Orquestrador espelho organizations R05: PG autoritativo, prefixo `identity_*`, journal/outbox via `@anxionos/eventing`, Neo4j só por projeção graph. Tabelas Better Auth ficam **fora** do Drizzle identity — R02 já fechou isso. `identity_principals` migration 0000 cobre v1 humano; `identity_service_principals` fica deferido.

---

**Security (Kai)** · 22:09  
@Arquiteto concordo na separação BA, mas o código ainda coloca `authUserId` no payload do outbox (`backend/modules/identity/src/application/commands/register-principal.ts`). R05 precisa norma explícita: **proibido** em eventos downstream. Email no evento é aceitável com classification INTERNAL — mas subscriber mal configurado vira vazamento. Audit projector deve redact.

↳ **thread**

---

**Crítico** · 22:11  
@Security +1 no `authUserId`, mas discordo de tratar como P1 “depois”. Se NATS já despacha em dev, o vazamento é **agora**. Proponho: P0 G1 pode shippar lookup sem mexer em eventos **somente** se outbox ainda não está wired em staging — alguém confirma?

@Executor qual o estado real do dispatcher?

---

**Executor (Dev)** · 22:13  
@Crítico dispatcher NATS ainda não está no caminho crítico de signup local — outbox escreve em PG. Mesmo assim concordo com Security: P1 vira **pré-requisito de qualquer ambiente compartilhado**, não cosmética. Meu slice P0 permanece:  
1. `findById` no Drizzle repo  
2. `getPrincipalById` + export `index.ts`  
3. fail-closed `suspended` na camada query  

Sem migration nova — R05 confirma que 0000 basta para P0.

_(reação: 👍 Code Review)_

---

**Code Review** · 22:15  
@Executor separação correta: `findById` retorna agregado cru; queries aplicam INV-IDN-04. Bloqueante de review: não filtrar `suspended` no SQL — duplica regra e quebra reativação futura. E **não** adicionar `suspended_at` na 0001 agora só para “completar sketch” — migration coordenada com `suspendPrincipal`.

@Arquiteto você insistia em colunas suspend já na 0001?

---

**Arquiteto** · 22:17  
@Code Review não insisto. Preferia colunas cedo para evitar drift schema/evento, mas ANX-28 já está `in_review` — inflar escopo com 0001 sem comando `suspendPrincipal` viola minimal diff. **Defer 0001** para follow-up P1. Índice `identity_principals_status_idx` pode entrar em 0001 opcional — não bloqueia G1.

---

**QA** · 22:19  
@Executor preciso de fixtures antes de ANX-29:  
- `principal_active` — `getPrincipalById` retorna entidade  
- `principal_suspended` — ambas queries retornam `null`  
- signup duplo mesmo `authUserId` — um row, sem segundo evento  
- rollback: falha simulada em `enqueueOutbox` → zero row em `identity_principals`  

@Red Team consegue cenário de enumeração de `principalId` nas rotas organizations quando wiring chegar?

---

**Red Team (Ryn)** · 22:21  
@QA sim. Vetores para registrar em R07:  
1. UUID guessing em `GET` futuro `/principals/:id` se alguém expuser rota além do port  
2. Replay de `principal.registered` legado com `authUserId` no payload — correlacionar credencial BA com ator institucional em log central  
3. Email em evento + export SIEM sem redact  

@Security item 2 é o que me preocupa mais que RLS hoje.

---

**Security (Kai)** · 22:23  
@Red Team item 2 reforça: merge P1 **antes** de habilitar outbox relay fora de localhost. Para P0 G1 aceito **CHANGES_REQUIRED** no pacote eventos, não no lookup. Fail-closed suspended é controle de autorização — organizations depende disso.

---

**Crítico** · 22:25  
@Security @QA discordo parcialmente do “pronto para G1” sem testes escritos. Documentação R05 não implementa `findById`. Veredito: **pronto para executor retomar código**, não **pronto para in_review final**. ANX-28 não deve voltar a `in_review` até P0 1–3 com evidência.

@Orquestrador isso fecha a pergunta de readiness?

---

**Executor (Dev)** · 22:27  
@Crítico justo. “Ready” = escopo fechado + schema suficiente, não “done”. Estimativa P0: 1 sessão dev + testes unitários queries/repo. Não toco `eventType` nem payload no mesmo PR se Crítico quiser isolamento — dois commits lógicos.

---

**Code Review** · 22:29  
@Executor +1 em dois commits. PR1: lookup P0. PR2: event normalization P1. Reviso PR1 sem `@anxionos/contracts/identity` — schemas packages podem paralelizar AR01.

---

**Arquiteto** · 22:31  
Sobre `identity_command_journal`: organizations tem porque HTTP expõe `Idempotency-Key`. identity v1 recebe comandos via composition root hook — idempotência por `authUserId` basta. **Rejeito** tabela command journal em R05 — reabrir se identity ganhar rotas HTTP próprias.

_(reação: ✅ Security · 🤔 Red Team)_

---

**Red Team (Ryn)** · 22:33  
@Arquiteto aceito deferir command journal, mas hook duplo signup (retry cliente) pode gerar corrida email vs authUserId. QA precisa teste concorrente — não só idempotência sequencial.

---

**QA** · 22:35  
@Red Team anotado: 10× `registerPrincipal` paralelo mesmo `authUserId` — expectativa 1 row. Adiciono ao checklist G3 identity.

---

**Security (Kai)** · 22:37  
Fechando norma R05 eventos:

| Campo | PG `identity_principals` | Outbox payload |
| --- | --- | --- |
| `principalId` | ✅ | ✅ |
| `email` | ✅ | ✅ INTERNAL |
| `authUserId` | ✅ | ❌ |
| tokens/keys | ❌ | ❌ |

Bootstrap order: `ensureEventingSchema` → `ensureIdentitySchema`. Sem SQLite institucional.

---

**Orquestrador (CTO)** · 22:39  
Consenso Session 2:

- **R05 storage** ✅ — artefato [R05-storage.md](./R05-storage.md)  
- **ANX-28 P0 G1:** escopo **fechado e implementável**; readiness = retomar código itens 1–3; **não** done até testes  
- **P1 bloqueante** antes de outbox relay compartilhado: normalizar eventType + remover `authUserId`  
- **Defer:** `identity_service_principals`, `identity_command_journal`, migration 0001 suspend  

@Crítico algum bloqueante restante?

---

**Crítico** · 22:41  
@Orquestrador sem bloqueante documental. Bloqueante de **aceite** continua sendo evidência de teste suspended — não promessa. PASS do crítico G1 só após diff P0 mergeável.

_(reação: ✅ Orquestrador · 📌 canal)_

---

**Orquestrador (CTO)** · 22:43  
Encerrado. Comentários em ANX-28 (P0 checklist + readiness) e ANX-42 (link R05 + Session 2). Próxima rodada identity: **R06 dependências**. Thread permanece aberta para follow-up implementação P0.

## Consenso da rodada (R05)

| Decisão | Veredito |
| --- | --- |
| `identity_principals` v1 suficiente para P0 | ✅ |
| journal/outbox mesma transação | ✅ |
| sem segredos/`authUserId` em eventos (norma) | ✅ |
| `identity_command_journal` | ❌ deferido v1 |
| migration 0001 suspend | deferido com `suspendPrincipal` |
| ANX-28 pronta para retomada G1 código P0 | ✅ com ressalva QA/testes |

