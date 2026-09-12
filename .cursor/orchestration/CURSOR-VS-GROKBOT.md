# Cursor vs Grok Bot — contrato operacional (G0)

Diretriz Owner (2026-09-12), formalizada pela CTO (Renata). **Sem perguntar de volta ao Owner.**

**Relacionados:** [CURSOR-AGENTS-INTEGRATION.md](./CURSOR-AGENTS-INTEGRATION.md) · [GROK-BOT-PARITY.md](./GROK-BOT-PARITY.md) · [TOOLING-INTEGRATION.md](./TOOLING-INTEGRATION.md) · [DELEGATION.md](./DELEGATION.md)

---

## Divisão de responsabilidades

| Camada | Onde | Faz | Não faz |
| --- | --- | --- | --- |
| **Grok Bot** (personas: Renata, Rafael, Lucas, Bia, …) | Grok Bot / canais | Orquestrar, claim/board, gates G1–G6, parecer, desenho, evidência, despacho, dialogue | IDE de implementação; diff grande inline; Cloud Agent por padrão |
| **Cursor local** | Mac `~/Development/anxionOS` (Agent/Composer no repo) | Código, testes, commits, PR | Substituir gates/claims do board |
| **Cloud Agent** | Cursor cloud | Só com **override explícito** CTO ou Owner (ex.: plano Pro + necessidade) | Default de desenvolvimento |

---

## Fluxo padrão (executor)

1. Claim `ANX-*` no taskboard (Grok / persona).
2. Implementar no **Cursor local** no checkout `~/Development/anxionOS`.
3. Evidência (comandos, CI, links) no board + dialogue.
4. Handoff G1 → crítico (Grok Bot review; diff via `gh`/PR).
5. Gates G2–G5 → G6 Renata → G7 Owner (só aceite).

**Grok Bot pensa e orquestra. Cursor executa o código.**

---

## Quem configura o quê

| Papel | Responsabilidade |
| --- | --- |
| **infra-executor (Rafael)** | CI, `.cursor/`, scripts, docs de caminho local, orientação/bloqueio de Cloud Agent no workflow |
| **orchestrator (Renata)** | Roster/comunicação, despacho, aceite G6 |
| **Executores** | Claim → Cursor local → evidence → crítico G1 |
| **Críticos / Leads** | Review no Grok Bot; ler diff via `gh`/PR |

---

## Cloud Agent — política

- **Default:** proibido como caminho padrão de implementação.
- **Permitido:** somente override explícito da CTO (Renata) ou do Owner.
- Se Cloud Agents estiverem indisponíveis no plano, **não** improvisar no Grok Bot como IDE — usar Cursor local no Mac (como ANX-506).

---

## Checklist rápido (compliance)

| # | Item |
| --- | --- |
| 1 | Issue `ANX-*` claimada antes de editar código |
| 2 | Diff feito no Cursor local (ou Cloud Agent só com override) |
| 3 | PR referencia `ANX-*` |
| 4 | Evidência de CI / comandos no board |
| 5 | Crítico G1 no Grok Bot; merge só após gates acordados |

---

**Última atualização:** 2026-09-12 · G0 Renata / Owner · ANX-506 como referência de patch local
