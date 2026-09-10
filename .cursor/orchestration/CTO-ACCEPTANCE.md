# Aceite G7 baseado em evidências — CTO (Renata Oliveira)

Extensão de [CTO-AUTHORITY.md](./CTO-AUTHORITY.md). Protocolo operacional para o gate **G7** quando o pacote de evidências está completo. Complementa [AGENTS.md](../../AGENTS.md) e [PIPELINE.md](./PIPELINE.md); reconciliação com AGENTS.md em [COMPLIANCE.md](./COMPLIANCE.md).

**Responsável:** Renata Oliveira · persona `orchestrator` · CTO virtual

---

## Princípio

O CTO **aceita** issues de rotina (slices P01–P09, tooling, orquestração) quando o pacote de evidências satisfaz o checklist abaixo — **sem** esperar frase explícita do Owner em todo G7.

O Owner permanece autoridade final para **exceções** (risco alto, conflito ADR, escopo fora da issue, gates bloqueados).

---

## Pacote de evidências obrigatório

Antes de aceitar, Renata confirma **todos** os itens:

| # | Item | Onde verificar |
| --- | --- | --- |
| 1 | Comentário na issue com referência doc (`brain/…`, ADR, AGENTS.md) | `taskctl comment list ANX-N` |
| 2 | Arquivos alterados listados ou manifest de commit | Comentário G6 / handoff |
| 3 | Comandos de teste + saída (oráculos verdes) | Comentário com `bun test`, `boundaries`, etc. |
| 4 | Crítico G1 **PASS** | Dialogue `verdict` gate G1 + comentário issue |
| 5 | Gates G2–G6 **PASS** (nenhum **BLOCKED**; **PASS_WITH_CONDITIONS** só se condição já resolvida no diff) | Comentários EXECUTED por gate |
| 6 | Dialogue: `handoff` + `verdict` PASS na issue | `.cursor/orchestration-runtime/dialogue/dialogue.jsonl` |
| 7 | Rastreabilidade AGENTS.md + `brain/` no pacote G0 | Comentário G0 ou DELEGATION-PACKAGE |
| 8 | Issue em `in_review` (não `in_progress` órfã) | Taskboard |
| 9 | Critérios de aceite da issue satisfeitos | Descrição / checklist |
| 10 | Zero violações tolerância zero no diff candidato | Grep + parecer crítico |
| 11 | **Zero ressalvas** — nenhum gap de escopo aberto; filhos bloqueadores resolvidos | [ZERO-RESERVATIONS-DONE.md](./ZERO-RESERVATIONS-DONE.md) + `cto-decide` |

---

## Ações do CTO ao aceitar

1. **Dialogue** — post `approve` gate G7 com resumo de evidências:

```bash
npm run orchestration:broadcast -- \
  --from-persona orchestrator \
  --issue ANX-N \
  --gate G7 \
  --type approve \
  --body "@Owner — G7 aceite CTO (evidências completas). Resumo: …" \
  --evidence issue:ANX-N \
  --evidence file:AGENTS.md \
  --evidence command:npm run orchestration:cto-accept -- --issue ANX-N
```

2. **Taskboard** — comentário espelhando aceite + refs aos comentários de gate.

3. **Move** — `in_review` → `done` com thread binding:

```bash
export CURSOR_THREAD_ID="${CURSOR_THREAD_ID:-cursor-cto-g7-$(date +%Y%m%d)}"
node scripts/taskboard.mjs get ANX-N
taskctl comment add ANX-N --body "G7 aceite CTO — evidências completas (CTO-ACCEPTANCE.md)" --thread-id "$CURSOR_THREAD_ID"
node scripts/taskboard.mjs move ANX-N done
```

4. **Pipeline** — se desbloqueia cadeia (ex.: ANX-221 → ANX-222):

```bash
export CTO_EVIDENCE_ACCEPT=1
./.cursor/orchestration/launch-pipeline.sh
```

---

## Quando o CTO **NÃO** aceita — escalar para @Owner

| Condição | Decisão CLI | Ação |
| --- | --- | --- |
| Security ou Red Team **BLOCKED** | `ESCALATE_TO_OWNER` | Owner decide risco residual |
| Conflito com ADR **accepted** em `brain/` | `ESCALATE_TO_OWNER` | ADR ou Owner |
| Alterações fora do escopo da issue | `ESCALATE_TO_OWNER` | Reescopo ou nova issue |
| Crítico G1 sem **PASS** | `CHANGES_REQUIRED` | Executor + crítico fecham G1 |
| Gate G2–G6 **BLOCKED** | `CHANGES_REQUIRED` | Revalidar gate afetado |
| Oráculos ausentes ou falhos | `CHANGES_REQUIRED` | Executar e documentar |
| Deliverable não commitado quando aceite exige commit | `CHANGES_REQUIRED` | Commit autorizado ou ajustar escopo |
| Violação tolerância zero no diff | `ESCALATE_TO_OWNER` | Correção + revalidação |
| Ressalvas / `done COM RESSALVAS` / MEDIUM pendente no escopo | `CHANGES_REQUIRED` | Corrigir ou fechar issue filha antes de G7 |
| Filhos bloqueadores abertos (ex. ANX-243/244/247) | `CHANGES_REQUIRED` | Resolver filhos; revalidar oráculos |

---

## Template de aceite (Renata)

```markdown
---
**Renata Oliveira** · Orquestradora · [orchestrator] · leadership
@Owner — G7 aceite CTO para **ANX-N** — *{título curto}*.

**Evidências verificadas:**
- Doc: {brain/… ou ADR}
- Oráculos: {comandos + resultados}
- Gates: G1 PASS · G2–G6 {PASS|PASS_WITH_CONDITIONS}
- Dialogue: handoff + verdict PASS
- CLI: `npm run orchestration:cto-accept -- --issue ANX-N` → ACCEPT

**Ações executadas:** comentário taskboard · move done · {desbloqueio ANX-M se aplicável}

Exceções escaladas: nenhuma.
---
```

---

## CLI de avaliação

```bash
npm run orchestration:cto-accept -- --issue ANX-221
npm run orchestration:cto-accept -- --issue ANX-221 --json
npm run orchestration:cto-accept -- --issue ANX-221 --apply
```

Variáveis:

| Env | Efeito |
| --- | --- |
| `CTO_EVIDENCE_ACCEPT=1` | `launch-pipeline.sh` aceita aceite CTO (sem `OWNER_ACCEPTED_ANX221`) |
| `CTO_EVIDENCE_ACCEPT=auto` | Script avalia via `cto-accept.mjs` antes de mover |

Implementação: [agent-proactive/cto-accept.mjs](./agent-proactive/cto-accept.mjs)

---

## Relação com AGENTS.md

[AGENTS.md](../../AGENTS.md) exige aceite explícito para `done`. Este protocolo **delega** ao CTO a autoridade G7 para slices de rotina com evidências completas — aceite explícito do CTO (Renata) conta como aceite autorizado, registrado em dialogue + taskboard. Owner retém veto via exceções acima.

Ver nota em [COMPLIANCE.md](./COMPLIANCE.md#g7-aceite-delegado-cto).

---

## Referências

- [PIPELINE.md](./PIPELINE.md) — gate G7
- [DELEGATION.md](./DELEGATION.md) — cadeia ANX-221→222
- [START-WORK.md](./START-WORK.md) — launch pós-aceite
- [VALIDATION-REPORT.md](./VALIDATION-REPORT.md) — smoke de orquestração


## Zero ressalvas (obrigatório)

Ver [ZERO-RESERVATIONS-DONE.md](./ZERO-RESERVATIONS-DONE.md). **Proibido** mover para `done` com ressalvas, follow-ups MEDIUM adiados ou filhos bloqueadores abertos no escopo.
