# Parecer Legal/Privacy — ANX-480 / ANX-481

**Status:** published  
**DRI:** Beatriz Campos · **Draft:** Marcelo Tavares · **Crítico técnico:** Diego Martins (CHANGES incorporados)  
**Publisher:** Marina Okonkwo  
**Data:** 2026-09-12 · Customer & Legal · **Sem GO de REAL**

## Gates

| Plano | Decisão |
|-------|---------|
| **A** — REAL / produção / claim de tenancy completa | **BLOCK** |
| **B** — remediação rastreada no board | **APPROVE** |

**REAL / L3–L4: não autorizado.**

## Prioridade

- **481 + 483 (+ siblings de oráculo):** P0 lógico
- **480:** P1
- **465:** contexto sistêmico apenas (não checkbox deste parecer)

## Fato

### ANX-480 (board LOW)

- `organizations_command_journal` sem `tenant_id`/RLS.
- **Residual explícito:** existência de Idempotency-Key / acoplamento cross-tenant (409).
- **Sem result leak** (G5 confirmed: valida commandName+aggregateId+requestHash antes de replay).

### ANX-481 (board LOW) + oráculos vivos

- PrincipalLookup / `identity_principals` sem escopo de tenant (sem `applyTenantContext` / sem RLS).
- **Mitigação ANX-460 / D-ORG-047 = somente `ownership/transfer`.** Não tratar como "já mitigado" em geral.
- **Rotas vivas com oráculo (inventário):**
  - `issue-grant` (**ANX-483**)
  - `create-delegation`
  - `activate-break-glass`
  - `submit-change-proposal`
  - **ANX-492** não fecha o problema de existência (infra→404 ainda confunde sinal).

## Risco LGPD / contratual

- **480:** baixo em confidencialidade de conteúdo; residual em integridade/disponibilidade do namespace e confirmação de existência da key.
- **481:** residual médio; **sistêmico alto** enquanto oráculos vivos (483 + siblings). Inferência de presença na plataforma = dado pessoal / sinal de identidade.

## Aceite para levantar BLOCK de produção/REAL

| Item | O que desbloqueia | O que NÃO desbloqueia |
|------|-------------------|------------------------|
| **480** | Só `tenant_id`+RLS (+ teste anti-acoplamento) | **ADR não basta** |
| **481** | Preferência técnica Diego: **ADR A (global) + opacidade P0 no inventário com testes**; alternativa **B** tenant-scope/RLS | Sem evidência de opacidade/escopo que mate o oráculo (cobrindo 483+siblings) |

ADR/opacidade **sem** testes no inventário = no máximo controle **interino** de engenharia; **REAL permanece BLOCK** até evidência.

## Próximo

Engenharia: APPROVE remediação (P0 oráculos; P1 journal). Launch/REAL: BLOCK até controles efetivos acima. Críticos: handoff 1:1.

*Published from Legal/Privacy v3 final (Diego CHANGES incorporated). Does not authorize production or REAL.*
