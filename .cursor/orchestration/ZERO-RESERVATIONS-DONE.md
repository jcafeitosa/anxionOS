# Política zero ressalvas para `done`

**Status:** obrigatório (Owner directive 2026-09-09)  
**Escopo:** Dashi `ANX-*`, Cursor goals de framework, aceite G7 (Renata/Cláudia/@Owner)

---

## Princípio

**Proibido:** `done` com ressalvas, `done COM RESSALVAS`, follow-ups MEDIUM adiados, ou aceite G7 com itens abertos no escopo da issue.

**Obrigatório:** Todo gap conhecido no escopo da issue **deve estar corrigido** (ou rastreado como issue filha **resolvida**) antes de `in_review` → `done`.

---

## Regras

| Regra | Detalhe |
| --- | --- |
| ZR-01 | Nenhum comentário de gate/aceite pode mencionar `ressalvas`, `COM RESSALVAS`, `MEDIUM pendente` ou follow-up aberto no escopo |
| ZR-02 | Issues filhas bloqueadoras (ex.: ANX-243/244/247 para ANX-135) devem estar `done` ou escopo incorporado na issue pai |
| ZR-03 | `cto-decide` / `cto-accept` retornam `CHANGES_REQUIRED` se houver ressalvas ou filhos abertos |
| ZR-04 | Cláudia (`cto-critic`) só emite **RECOMENDA done** quando zero itens abertos no escopo + oráculos verdes |
| ZR-05 | Renata só move `done` via G7 quando CLI `ACCEPT` e política ZR-01–ZR-04 satisfeitas |

---

## Compliance

`npm run orchestration:compliance` emite:

- **Violation** `DONE_WITH_RESERVATIONS` — comentário da issue menciona ressalvas/MEDIUM pendente ao mover para `done`
- **Warning** `OPEN_SCOPE_FOLLOWUPS` — issues filhas relacionadas ainda `todo`/`in_progress`/`blocked`

Implementação: [agent-proactive/cto-evidence.mjs](./agent-proactive/cto-evidence.mjs), [agent-compliance/compliance-lib.mjs](./agent-compliance/compliance-lib.mjs)

---

## Template CTO (Cláudia) — re-veredito G7

```markdown
## CTO re-veredito — ANX-N

**Decisão:** RECOMENDA `done` | NÃO RECOMENDA `done`

### Pré-condições (todas obrigatórias)
- [ ] Filhos bloqueadores resolvidos (listar ANX-*)
- [ ] Zero ressalvas MEDIUM/BAIXO no escopo
- [ ] Oráculos organizations + governance verdes
- [ ] Gates G1–G6 PASS (sem PASS_WITH_CONDITIONS com pendência)

### Evidência
- `bun test backend/tests/organizations …`
- `bun test backend/tests/governance …`
- `npm run orchestration:cto-decide -- --issue ANX-N` → ACCEPT

### Itens abertos
Nenhum — ou listar bloqueio explícito.
```

---

## Referências

- [CTO-ACCEPTANCE.md](./CTO-ACCEPTANCE.md)
- [AGENTS.md](../../AGENTS.md) — pipeline G7
- [PIPELINE.md](./PIPELINE.md)
