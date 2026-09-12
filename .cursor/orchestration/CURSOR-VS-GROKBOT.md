---
type: policy
status: accepted
issue: ANX-507
---

# Cursor vs Grok Bot — dual-runtime (âncora operacional)

**Norma Owner (2026-09-12)** · CTO LGTM (Renata) · Architect (Marcus) · Land infra (Rafael).

**Pacote G0 completo:** [G0-TOOLING-DUAL-RUNTIME.md](./G0-TOOLING-DUAL-RUNTIME.md) — **este doc é a âncora curta**; o pacote G0 vence em conflito.

**Relacionados:** [CURSOR-AGENTS-INTEGRATION.md](./CURSOR-AGENTS-INTEGRATION.md) · [GROK-BOT-PARITY.md](./GROK-BOT-PARITY.md) · [TOOLING-INTEGRATION.md](./TOOLING-INTEGRATION.md) · [DELEGATION.md](./DELEGATION.md)

---

## Planos

| Plano | Runtime | Faz | Não faz |
| --- | --- | --- | --- |
| **Control** | Grok Bot (personas) | claim, hire, dispatch, dialogue, gates G0–G6, parecer, evidência (encaminhar) | mutar repo SoT; mintar PASS de teste no box |
| **Data (código)** | Cursor local Mac `~/Development/anxionOS` (**preferido**) ou CloudAgent Cursor (`workspace=repo`) | diff, lint, test, commit, PR | orquestrar gates no lugar da Renata |
| **Bridge** | CI (Rafael / Ju) | oráculo compartilhado | substituir G7 |

**Grok Bot pensa e orquestra. Cursor executa o código.**

---

## CloudAgent

| Runtime | Status |
| --- | --- |
| IDE local (Mac) | Preferência Owner |
| CloudAgent **Cursor-side** (`workspace=repo anxionOS`) | Fallback autorizado — **sem override extra** |
| Mutação SoT a partir do **box Grok** | **Proibido** |

---

## Fluxo padrão (executor)

1. Claim `ANX-*` no taskboard (Grok / persona).
2. Implementar no **Cursor** (local Mac ou CloudAgent Cursor-side).
3. Evidência com proveniência Cursor/CI: `command:` / `file:` / `issue:`.
4. Handoff G1 → crítico (review no Grok Bot; diff via `gh`/PR).
5. Gates G2–G5 → G6 Renata → G7 Owner (só aceite).

Handoff Grok→Cursor deve trazer: `ANX-*`, escopo, critérios, paths.

---

## Quem configura o quê

| Papel | Responsabilidade |
| --- | --- |
| **infra-executor (Rafael)** | CI, `.cursor/`, scripts, docs de caminho, guards de write path |
| **orchestrator (Renata)** | Roster/comunicação, despacho, aceite G6 |
| **Executores** | Claim → Cursor → evidence → crítico G1 |
| **Críticos / Leads** | Review no Grok Bot; ler diff via `gh`/PR |

---

## Evidência

Aceite de código exige `command:` / `file:` / `issue:` produzidos no **Cursor** ou **CI**. Grok só encaminha — não mintar PASS no box.

## ADR0002

Intacto. Esta página não altera ownership modular.

## Precedência

1. [G0-TOOLING-DUAL-RUNTIME.md](./G0-TOOLING-DUAL-RUNTIME.md)  
2. Este doc  
3. `GROK-BOT-PARITY.md` / `CURSOR-AGENTS-INTEGRATION.md` (até update explícito)

---

**Última atualização:** 2026-09-12 · ANX-507
