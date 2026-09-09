# Playbook Proativo por Persona

Comportamentos concretos e mensagens de exemplo. Nomes conforme [PERSONAS.md](./PERSONAS.md).

---

## Renata Oliveira — Orquestradora (CTO)

**Manhã (cron `proactive-board-scan`):**

```bash
npm run orchestration:proactive -- check --persona orchestrator
```

**Mensagem dialogue (status):**

> Board: 0 in_progress, 6 in_review. Prioridade G7: **ANX-221** (desbloqueia ANX-222→134→136). @lucas @rafael em standby até aceite Owner.

**Chase G7 (escalate):**

```bash
npm run orchestration:broadcast -- \
  --from-persona orchestrator \
  --to-mention @Owner \
  --issue ANX-221 --gate G7 --type escalate \
  --body "@Owner — ANX-221 aguarda aceite G7. Pacote G0–G6 documentado na issue. Sem done não iniciamos ANX-222." \
  --mirror-taskboard
```

**Delegar desbloqueada:**

> @lucas — ANX-134 todo desbloqueada após G7. Pesquisar pacote G0 na issue antes de claim.

---

## Executores (Lucas, Camila, Rafael, Diego)

**Pré-claim (suggest, sem move):**

> @renata — Li ANX-134 (identity lifecycle). Pacote G0 mapeado. Pronto para claim quando autorizar.

**Handoff sem esperar ping:**

```bash
npm run orchestration:broadcast -- \
  --from-persona backend-executor \
  --to-persona backend-critic \
  --issue ANX-134 --gate G1 --type handoff \
  --body "@marina — candidato r1. Oráculos: bun test 26/26." \
  --mirror-taskboard
```

---

## Críticos (Marina, Paulo, Bia, Gustavo)

**Challenge cedo (in_progress silencioso):**

> @lucas — ANX-134 sem status há 24h. Qual evidência parcial? Timeout-before-ack coberto?

**Não esperar fim da sessão** — trigger `in-progress-silent` dispara suggest para o par.

---

## Equipes especialistas (Fernanda, Edu, Isa, Thiago)

**Voluntariar em in_review:**

> @renata — Vi ANX-221 em in_review. G2 ainda sem parecer formal desta thread — posso revisar diff digest sha:…?

---

## Juliana Pereira — GitHub/CI Lead

**CI fail:**

```bash
npm run orchestration:broadcast -- \
  --from-persona github-lead \
  --type verdict --verdict CHANGES_REQUIRED \
  --body "CI boundaries falhou em PR #N — job link …"
```

---

## Matriz rápida

| Persona | Trigger principal | Comando |
| --- | --- | --- |
| Renata | zero-in-progress, g7-aceite-pending | `proactive check --persona orchestrator` |
| Lucas | issue-unblocked (backend) | `proactive suggest --persona backend-executor` |
| Marina | in-progress-silent | `proactive suggest --persona backend-critic` |
| Ju | ci-fail-branch | env `CI_FAIL_BRANCH` + `act --persona github-lead` |
| Qualquer | dialogue-mention | `proactive suggest --persona <slug>` |
