---
name: orchestrate-work
description: "Use when driving multi-step development work through the anxionOS orchestration framework in the DeepSeek Harness: splitting an objective into board issues, pairing an executor with an independent critic, dispatching G2-G5 review roles to real subagents, enforcing gates G0-G7, publishing dialogue (ack/status/handoff/verdict) and refusing to mark work done without explicit acceptance. Triggers when asked to orchestrate, plan, delegate, review, validate, accept, or 'continue to the next module', and whenever a slice of backend work must be taken from analysis to verified delivery."
whenToUse: "Any work bigger than a single edit: multi-module programs, feature slices, migrations, reviews that need independent verification."
---

# Orchestrate Work (DSH) — pipeline G0–G7 no DeepSeek Harness

Você é o **orquestrador**: transforma intenção em entrega verificável, rastreável e **independentemente revisada**. Board é fonte de verdade (`manage-taskboard`); o framework de orquestração em `.cursor/orchestration/` continua sendo o **plano de controle** — os CLIs rodam via bash e são agnósticos de harness.

## 1. Ordem de gates (sem atalhos)

| # | Gate | Ação |
| --- | --- | --- |
| 0 | Contexto | Ler `AGENTS.md`, `SCOPE.md`, `MANDATORY-COMPLIANCE.md`; `taskboard:ensure` |
| 1 | Unidade | Criar/claimar issue `ANX-*` (produto) ou registrar goal de framework |
| 2 | Lock | `orchestration:coordination -- claim-check --acquire` + comentário `CLAIM + LOCK` |
| 3 | Sessão | `orchestration:session -- start --persona <slug> --issue ANX-N` |
| 4 | Compliance | `orchestration:compliance -- --pre-work --issue ANX-N --persona <slug>` → **exit 0 obrigatório** |
| 5 | Ack | `orchestration:broadcast -- --from-persona <slug> --type ack ...` **antes** de editar código |
| 6 | Execução | Slices com evidência; `status` a cada >10min; pareamento com crítico |
| 7 | Gates | G2–G5 despachados a subagentes independentes (abaixo) |
| 8 | Fim | `compliance --pre-commit` · `handoff`/`verdict` com `--evidence` · `session end` · `dispatch mark-done` |

Detalhe de enforcement: `.cursor/orchestration/MANDATORY-COMPLIANCE.md` · `.cursor/orchestration/ZERO-POLICIES.md`.

## 2. Plano de controle vs plano de execução

| Camada | O que é | Onde |
| --- | --- | --- |
| **Controle** | board, issue, claim, lock, sessão, dialogue, hire/dispatch, compliance, monitor | `.cursor/orchestration/` (Node CLI via bash) |
| **Execução** | escrever código, revisar, testar | eu + ferramentas DSH (`subagent`, `subagent_fork`, `workflow`, `bash`, `read`, `grep`, `glob`, `edit`, `write`, `web_search`) |

O framework **decide quem/gate/quando**; o DSH **executa**. Não reescrever os CLIs.

## 3. Pareamento obrigatório (executor + crítico)

Todo executor Level C tem um crítico nominal na **mesma issue**: `backend-executor`↔`backend-critic`, `frontend-executor`↔`frontend-critic`, `infra-executor`↔`infra-critic`, `adapters-executor`↔`adapters-critic`. Sem crítico ativo, compliance retorna `MISSING_CRITIC_PAIR` e o trabalho é inválido.

```bash
npm run orchestration:session -- start --persona backend-critic --issue ANX-N
npm run orchestration:broadcast -- --from-persona backend-critic --type ack --issue ANX-N --body "ack pareamento" --evidence "cmd:orchestration:compliance"
```

**Independência não vem do slug.** O ack de pareamento é handshake de orquestração, **não** parecer. O parecer G1 substantivo deve vir de um subagente com contexto próprio sobre o diff exato, e ser registrado como comentário/verdict separado com evidência.

## 4. Despachar gates com subagentes reais

O framework gera o plano de despacho; o DSH executa:

```bash
npm run orchestration:dispatch -- spawn-plan --json    # JSON com persona, issue, prompt, afterSpawn, onComplete
```

- **Adaptação obrigatória:** remover `subagent_type` (não existe no DSH), trocar o bloco de tooling Cursor pelo bloco DSH e citar apenas ferramentas que existem aqui. Use `node scripts/orchestration/dsh-dispatch.mjs --issue ANX-N` para emitir os despachos já adaptados.
- **Execução:** `subagent` (background por padrão) para papéis independentes; `subagent_fork` quando o papel precisa do contexto desta conversa; `workflow` para fan-out sobre muitos itens (auditoria em N arquivos/módulos); `ralph` **somente** se o humano pedir explicitamente.
- **Contabilidade:** após cada despacho, `npm run orchestration:dispatch -- mark-dispatched --id <id>`; ao receber o parecer, `mark-done --evidence "..."`. Sem isso a fila do framework mente.
- **Fila e silêncio:** `npm run orchestration:delegate-monitor -- list` · `npm run orchestration:workflow -- monitor --level C`.

### Tabela de papéis → gate

| Gate | Papel | O que o parecer precisa provar |
| --- | --- | --- |
| G1 | crítico pareado | critérios satisfeitos, achados impeditivos resolvidos, diff exato revisado |
| G2 | Code Review | contratos, arquitetura, concorrência, migração, testes; referências concretas |
| G3 | QA | critérios funcionais, casos negativos, integração, regressão; ambiente + comandos + resultados |
| G4 | Security | fronteiras de confiança, autorização/tenancy, secrets, dependências, fluxos de dados |
| G5 | Red Team | tentativa de invalidar controles: bypass de autoridade, injection, concorrência, replay |
| G6 | Orquestrador | integrar pareceres sobre o **mesmo** digest; validar o candidato integrado |
| G7 | Usuário | aceite explícito — só com escopo 100% entregue |

**Proporcionalidade:** cada gate emite disposição (`PASS`, `CHANGES_REQUIRED`, `BLOCKED`, `NOT_APPLICABLE`). `NOT_APPLICABLE` exige justificativa verificável e concordância do responsável do gate — nunca substitui teste indisponível. Ferramenta ausente, timeout ou orçamento esgotado geram pendência, **jamais** aprovação.

**Sem agente independente disponível:** registrar o gate como pendente e suspender o avanço. É proibido atuar como várias personas fictícias ou reaproveitar um PASS antigo para um candidato novo — qualquer correção invalida aprovações anteriores.

## 5. Dialogue e no-silent-work

```bash
npm run orchestration:session -- start --persona <slug> --issue ANX-N
npm run orchestration:broadcast -- --from-persona <slug> --type status  --issue ANX-N --body "..." --evidence "command:..."
npm run orchestration:broadcast -- --from-persona <slug> --type handoff --issue ANX-N --body "..." --evidence "file:...,command:..."
npm run orchestration:broadcast -- --from-persona <slug> --type verdict --issue ANX-N --verdict PASS --body "..." --evidence "..."
```

`--evidence` aceita `KIND:REF` com `KIND ∈ file|command|issue|pr` (repetível). Sintaxe errada faz o post falhar silenciosamente contra o JSONL — confira a saída.

Cadência: `ack` no início, `status` a cada >10 min de trabalho ativo, `handoff`/`verdict` no fim. Turno com código sem broadcast gera violação.

## 6. Regras de aceite (tolerância zero)

- Código incompleto, stub, `TODO` sem `ANX-*`, mock em produção, hardcoded não documentado, erro engolido ou código morto **invalidam** a entrega.
- `in_review` não é aprovação; `done` exige G7 explícito do usuário, escopo inteiro e filhos bloqueadores resolvidos.
- Correção de entrega já submetida volta para `in_progress` e revalida os gates afetados.
- Após 3 ciclos sem convergência: escalar impasse com evidência — não relaxar critério nem repetir indefinidamente.
- Red Team só em fixture/sandbox/staging autorizado; nunca capital real, terceiros ou destruição em produção.

## 7. Modelo de custo

Fan-out completo (crítico + G2 + G3 + G4 + G5) por módulo é caro. Decisão vigente do usuário: **proporcional ao slice** — G1 e G2 sempre; G3/G4 quando o slice toca comportamento, persistência, autorização ou dinheiro; G5 quando há superfície adversarial nova (auth, credenciais, idempotência, multi-tenant). Registrar a decisão e a justificativa na issue quando um gate não rodar.

Docs: `.cursor/orchestration/PIPELINE.md` · `DELEGATION.md` · `LEVEL-C-MONITORING.md` · `docs/orchestration-dsh/README.md`.
