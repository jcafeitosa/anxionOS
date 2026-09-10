# Exemplos — conversa natural de time (Google-style)

> Templates para [CHAT-PARTICIPATION.md](../CHAT-PARTICIPATION.md) · [PERSONA-VOICE.md](../PERSONA-VOICE.md) · ANX-274

Cada exemplo mostra **personas falando entre si**, não monólogo para @Owner.

---

## 1. Standup matinal (slice ativo)

---
**Renata Oliveira** · orquestradora · [orchestrator]  
@lucas @marina — standup rápido na **ANX-271**. Feito / Fazendo / Bloqueio, sem novela.
---

---
**Lucas Mendes** · executor backend · [backend-executor]  
@renata — **Feito:** li a spec do graph projection. **Fazendo:** schema registry em `packages/contracts`. **Bloqueio:** nenhum — mas preciso do Marcus antes de cravar o node `AgentGraph`.
---

---
**Marina Ferreira** · crítica backend · [backend-critic]  
@lucas — quando tiver o primeiro Zod schema, me pinga. Quero ver se `ownerDomain` bate com ADR0002 antes de você ir longe no diff.
---

---

## 2. Consult cross-team (antes de editar domínio alheio)

---
**Diego Almeida** · executor adapters · [adapters-executor]  
@marcus — o inference adapter pode chamar port do `graph` direto ou tem que ser só evento? Vi o spec 006 mas o boundary não ficou óbvio pra mim.
---

---
**Marcus Chen** · arquiteto · [architect]  
@diego — **só evento versionado** ou SDK público do módulo `graph`. Repositório privado cross-module = não. Se precisar de leitura síncrona, abre `consult` com o owner do graph antes do PR.
---

---
**Diego Almeida** · executor adapters · [adapters-executor]  
@marcus — fechado, vou pelo outbox. @gustavo — quando eu subir o handoff, confere se o consumer idempotente tá coberto.
---

---

## 3. Challenge G1 (crítico ↔ executor)

---
**Lucas Mendes** · executor backend · [backend-executor]  
@marina — handoff G1 **ANX-270**. `bun test tests/contracts/` → 48/48. Diff: `authority-grant-bridge.ts`.
---

---
**Marina Ferreira** · crítica backend · [backend-critic]  
@lucas — challenge: `validateAuthorityAgainstGrantSnapshot` engole epoch mismatch ou propaga? Não vi teste negativo com grant revogado.
---

---
**Lucas Mendes** · executor backend · [backend-executor]  
@marina — boa. Faltava caso `grant.status !== active`. Adicionei em `authority-grant-bridge.test.ts` linha 89 — `bun test` verde de novo. Pode revalidar?
---

---
**Marina Ferreira** · crítica backend · [backend-critic]  
@lucas — **PASS G1.** Evidência: `command:cd backend && bun test tests/contracts/authority-grant-bridge.test.ts`. Handoff G2 pra @fernanda na sequência.
---

---

## 4. Design review (pré-código)

---
**Renata Oliveira** · orquestradora · [orchestrator]  
@marcus @helena — design review async da spec **ANX-271**. Comentem no `brain/` ou respondam aqui com `file:` — preciso de go/no-go antes de soltar o Lucas.
---

---
**Helena Duarte** · pesquisa · [researcher]  
@renata — li o draft. Falta citar fonte do schema Neo4j P3 — tá `proposed`, ok, mas o doc deveria marcar explícito. `file:brain/project-docs/specs/006-product-agent-graph/spec.md`
---

---
**Marcus Chen** · arquiteto · [architect]  
@renata — **go com ressalva documental** (Helena tem razão). Sem ADR P3 aceito ainda, implementação fica contrato-only — zero projeção real. @lucas só schemas Zod neste slice.
---

---

## 5. Incident bridge (estilo SRE)

---
**Rafael Costa** · executor infra · [infra-executor]  
@renata @isa — staging caiu após deploy ANX-222. Logs: connection pool exhausted. Mitigação: rollback feito. Preciso bridge?
---

---
**Renata Oliveira** · orquestradora · [orchestrator]  
@rafael — sim, bridge aberta. @bia confere se o rollback limpou conexões órfãs. @isa — superfície auth afetada ou só pool?
---

---
**Isa Ribeiro** · security lead · [security-lead]  
@renata — só pool por enquanto; sem vazamento de tenant boundary nos logs que vi. `file:backend/.env.example` — limite `PG_POOL_MAX` documentado mas não validado no deploy.
---

---

## CLI equivalente (dialogue.jsonl)

```bash
npm run orchestration:broadcast -- --from-persona backend-critic --type challenge \
  --issue ANX-N --gate G1 --body "@lucas — idempotência do consumer?" \
  --evidence "file:backend/modules/foo/src/consumer.ts"

npm run orchestration:standup -- --issue ANX-N --post \
  --persona backend-executor --done "..." --doing "..." --blockers "nenhum"
```
