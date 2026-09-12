---
type: g0-package
status: accepted
owner_decision: 2026-09-12
cto_lgtm: Renata Oliveira
architect: Marcus Chen
landed_by: Rafael Costa (infra-executor)
issue: ANX-507
adr0002: intact
---

# G0 — Tooling dual-runtime (Grok Bot × Cursor)

**Data:** 2026-09-12  
**Issue:** ANX-507  
**Âncora operacional:** [CURSOR-VS-GROKBOT.md](./CURSOR-VS-GROKBOT.md)  
**ADR0002:** **intacto** — layout modular backend não reabre.

## Contexto

O Owner definiu: **desenvolvimento de código no Cursor (preferência: IDE local no Mac)**; **Grok Bot para orquestração/pensamento** — não como IDE padrão.

Isto é decisão de **topologia de tooling**, não de domínio. Complementa [GROK-BOT-PARITY.md](./GROK-BOT-PARITY.md) e [CURSOR-AGENTS-INTEGRATION.md](./CURSOR-AGENTS-INTEGRATION.md) com fronteira explícita de planos.

## Decisão (cravada G0 — CTO LGTM)

| # | Decisão | Norma |
| --- | --- | --- |
| 1 | **Planos** | **Grok Bot** = control plane (claim, hire, dispatch, dialogue, G0/G6). **Cursor** = data plane de código (diff, lint, test, PR). |
| 2 | **Write path** | Proibido SoT de mutação do repo `anxionOS` via **box Grok**. Brief Renata → worker no Cursor. **CI** (Rafael/Ju) é a ponte verificável entre planos. |
| 3 | **Proveniência de evidência** | `bun test` / `test:boundary` / `tsc` / prova de HEAD só contam se gerados no **Cursor** (local ou CloudAgent Cursor-side) ou **CI**. Grok **relata/encaminha**; não mintar PASS de código no box. |
| 4 | **`brain/`** | Continua só-local (gitignore). Leitura/escrita via open-knowledge no workspace Cursor. Grok não inventa paths `brain/` sem share/MCP. |
| 5 | **Handoff packet** | Despacho Grok→Cursor traz `ANX-*`, escopo, critérios, paths. Retorno mínimo no dialogue: `command:` / `file:` / `issue:` antes de G1+. |

### CloudAgent (decisão CTO)

| Runtime | Status |
| --- | --- |
| **IDE local (Mac)** | Preferência Owner |
| **CloudAgent Cursor** com `workspace=repo anxionOS` | Fallback autorizado — **sem override extra** |
| **Cloud Agent / mutações a partir do box Grok** | **Proibido** |

## Escopo G0

### In scope

- Fronteira control plane × data plane
- Regras de evidência e write path
- Handoff mínimo Grok→Cursor→dialogue
- Link operacional em `CURSOR-VS-GROKBOT.md` (infra)

### Out of scope

- Reabrir ADR0002 / ownership dos 23 módulos
- Trocar fila `orchestration:dispatch` ou personas
- Autorizar box Grok como IDE de produção
- Decisão G7 Owner (fora deste pacote)

## Consequências

### Positivas

- Alinha runtime à intenção do Owner sem teatro de “dois IDEs”
- Evidência de gates deixa de ser ambígua (quem rodou o comando)
- CI permanece oráculo compartilhado entre planos

### Negativas / custos

- Latência de handoff Grok→Cursor (packet obrigatório)
- Agentes Grok não “fecham” G1+ só com shell no box
- Docs antigos de paridade precisam nota de precedência (este G0 > interpretação “Cursor Task = Grok”)

## Alternativas rejeitadas

| Alternativa | Motivo |
| --- | --- |
| Grok box como IDE padrão | Contradiz Owner; evidência não-portável |
| Emendar ADR0002 | Domínio ≠ tooling; mistura concerns |
| Só CloudAgent, sem IDE local | Owner prefere Mac local; CloudAgent é fallback |

## Critérios de aceite G0

| # | Critério | Evidência |
| --- | --- | --- |
| AC-01 | Decisões 1–5 + CloudAgent tabela publicadas | Este artefato |
| AC-02 | `CURSOR-VS-GROKBOT.md` existe e linka este pacote | Rafael (infra) |
| AC-03 | ADR0002 sem diff de layout | `git` / review G2 se houver PR |
| AC-04 | Nenhum commit SoT originado do box Grok após esta data | Política + CI/owner check |
| AC-05 | Handoffs Grok→Cursor usam packet mínimo | Dialogue samples pós-adoção |

## Equipe / próximos

| Papel | Agente | Ação |
| --- | --- | --- |
| CTO | Renata | Broadcast norma; aceite G6 quando couber |
| Architect | Marcus | Parecer (este pacote); consult contínuo |
| Infra | Rafael | Land este pacote + `CURSOR-VS-GROKBOT.md`; CI/guards se couber |
| Crítico infra | Bia | G1 do artefato operacional |
| Gates B | Fernanda+ | Tratar evidência sem proveniência Cursor/CI como insuficiente |

## Precedência documental

1. Este pacote G0 (tooling dual-runtime) — norma operacional Owner/CTO  
2. `CURSOR-VS-GROKBOT.md` — âncora curta para o time  
3. `GROK-BOT-PARITY.md` / `CURSOR-AGENTS-INTEGRATION.md` — onde conflitar com (1), prevalece (1) até update explícito  

## Verificação sugerida (pós-landing Cursor)

```bash
# no workspace Cursor / CI — não no box Grok como SoT
test -f .cursor/orchestration/CURSOR-VS-GROKBOT.md
test -f .cursor/orchestration/G0-TOOLING-DUAL-RUNTIME.md
rg -n "dual-runtime|box Grok|CloudAgent" .cursor/orchestration/CURSOR-VS-GROKBOT.md
```

---

_Rascunho architect (Marcus). Landing no repo = Cursor-side / Mac local (Rafael, ANX-507). Box Grok não é SoT deste ficheiro._
