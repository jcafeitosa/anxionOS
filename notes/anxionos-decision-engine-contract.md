---
type: research
title: Decision Engine — contrato decision-record.v1
description: Schemas versionados, invariantes e mapeamento código para ANX-265.
status: stable
issue: ANX-265
---
# Decision Engine — contrato decision-record.v1

## Escopo e limites

Issue **ANX-265**. Contrato versionado para decisões institucionais — **sem efeitos financeiros ou operacionais habilitados** neste slice. Donos de domínio: `decisions` (propostas/intents) e `governance` (autoridade/grants). O envelope `decision-record.v1` vive em `packages/contracts` e é consumido por módulos via import público.

## Artefatos de código

| Artefato | Caminho |
| --- | --- |
| Envelope principal | `backend/packages/contracts/src/decisions/decision-record.ts` |
| Tipos base (ids, scope, status) | `backend/packages/contracts/src/decisions/types.ts` |
| Export público | `backend/packages/contracts/src/decisions/index.ts` |
| Testes de contrato | `backend/tests/contracts/decision-engine.test.ts` |

## Schema versionado

- **Versão:** `decision-record.v1` (literal em `schemaVersion`)
- **Validação:** Zod (`decisionRecordSchema`)

### Tipos compostos

| Tipo | Propósito |
| --- | --- |
| `DecisionProposal` (via `alternativeProposalSchema`) | Alternativas consideradas e rejeitadas |
| `DecisionApproval` (`approvalSchema`) | Sign-off executivo/manager/system |
| `DecisionDisposition` (`dispositionSchema`) | Resultado final (UPHELD, OVERTURNED, MODIFIED, EXPIRED) |
| `AuthorityReference` (`authorityReferenceSchema`) | Quem/o quê autoriza a decisão |
| `DecisionEvidence` (`decisionEvidenceSchema`) | Evidência com claim rastreável |

### Invariantes

1. **Evidência:** cada item exige `uri` **ou** `checksum`; rejeita claims com padrões de secret/token (`api_key`, `token`, `secret`, `password`, `bearer`).
2. **Escopo:** `product` ou `engineering` apenas (`decisionScopeSchema`) — distinto de `governanceScopeKind`.
3. **Status:** `decisionEngineStatusSchema` é superset do legado `decisionStatusSchema` (PROPOSED, AUTHORITY_CHECKED, SUBMITTED + EXECUTING, COMPLETED, CANCELLED).
4. **Identificadores:** `dc_dec_*` e `dc_prp_*` preservam formato existente.
5. **Autoridade:** `authorityRequirement.level` L0–L6 com `reason` obrigatório.
6. **Entidades afetadas:** mínimo 1; `authorityReferences` mínimo 1; `evidence` mínimo 1.

## Separação types vs decision-record

Schemas de envelope (`evidenceReference`, `authorityReference`, `approval`, `disposition`, etc.) residem **somente** em `decision-record.ts`. `types.ts` mantém ids, enums de execução e status base — sem duplicação.

## Verificação

```bash
cd backend
bun test tests/contracts/decision-engine.test.ts
npx tsc --project packages/contracts/tsconfig.json --noEmit
```

Resultado esperado (2026-09-10): **8/8 testes pass**, typecheck pass.

## Gates

| Gate | Status | Evidência |
| --- | --- | --- |
| G0 | ✅ | Issue claimada, pacote contexto, fontes brain/ |
| G1 | ✅ | Crítico backend — 8/8 testes, escopo contracts-only |
| G2+ | ⏳ | Code review, QA, security, red team pendentes |

## Referências

- Estrutura do backend — `brain/notes/anxionos-backend-structure.md` (módulos `decisions` e `governance`)
- Contrato institucional v1 — `brain/project-docs/specs/001-institutional-contract/spec.md`
- Evolução institucional — `brain/project-docs/specs/004-institutional-evolution/spec.md` (níveis L0–L6)
