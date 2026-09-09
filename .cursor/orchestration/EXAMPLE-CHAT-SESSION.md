---
type: orchestration-example
title: Exemplo de sessão no chat Cursor
status: active
---

# Exemplo — sessão multi-agente no chat Cursor

Simulação de conversa entre @Owner e a equipe anxionOS no **mesmo chat** do Cursor (não terminal, não JSONL bruto). Issue fictícia **ANX-222** — validação de boundaries P02.

---

## Turno 1 — @Owner pergunta

> **@Owner**
>
> @renata — preciso validar se o slice P02 de eventing respeita ADR0002. Quem olha?

---

## Turno 2 — equipe responde (multi-speaker)

---
**Renata Oliveira** · orquestrador · liderança
@Owner — delego a @lucas (execução) e @marina (crítica). @marcus em consult se boundaries disputarem módulo.
---

---
**Lucas Mendes** · executor · backend-executor · execução
@marina — recebido. Vou `graphify query "eventing outbox ownership"` e cruzar com `brain/notes/anxionos-backend-structure.md`.
---

---
**Marina Ferreira** · crítica · backend-critic · qualidade
@lucas — ack. Exijo matriz requisito→arquivo→teste na issue antes de qualquer diff em `packages/eventing`.
---

## Turno 3 — consulta arquitetural

> **@Owner**
>
> @marcus — o outbox pode ficar só em `packages/eventing`?

---
**Marcus Chen** · arquiteto · arquitetura
@Owner — mecanismo sim, regra de negócio não. Journal/outbox **autoritativos por domínio**; `eventing` é transporte. ADR0002 prevalece; divergência exige ADR novo, não atalho no PR.
---

---
**Renata Oliveira** · orquestrador · liderança
@Owner — consenso registrado. Lucas documenta matriz na ANX-222; Marina valida G1. Próximo marco: handoff com evidência `graphify` + trecho spec.
---

## Comandos usados nos bastidores

```bash
npm run orchestration:speak -- --persona orchestrator --body "@Owner — delego a @lucas..." --issue ANX-222 --type ack
npm run orchestration:speak -- --persona backend-executor --body "@marina — recebido..." --issue ANX-222
npm run orchestration:speak -- --persona backend-critic --body "@lucas — ack..." --issue ANX-222
npm run orchestration:speak -- --persona architect --body "@Owner — mecanismo sim..." --issue ANX-222 --type consult
npm run orchestration:chat -- --issue ANX-222 --new-only
```

Slash roundtable equivalente: `/team`

Ver [CHAT-PARTICIPATION.md](./CHAT-PARTICIPATION.md).

---

## Turno 4 — hire on-demand G4 (hierarquia circular)

> **@Owner**
>
> @renata — ANX-221 precisa security review antes do merge.

---
**Renata Oliveira** · CTO · Level A
@isa — contrato G4 on-demand para ANX-221. Evidência: auth boundary no diff.
---

```bash
npm run orchestration:hire -- --persona security-lead --issue ANX-221 --reason "G4 review auth boundary"
# ... após verdict PASS ...
npm run orchestration:dismiss -- --persona security-lead --issue ANX-221 --evidence "G4 PASS"
npm run orchestration:roster -- counts
```

Ver [HIERARCHY.md](./HIERARCHY.md).
