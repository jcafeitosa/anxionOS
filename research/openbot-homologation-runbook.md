---
type: research
title: OpenBot — runbook homologação sandbox (sem credenciais institucionais)
description: Procedimento smoke CK-OpenBot e probes MEET-OpenBot para CI/local isolado; ANX-125 follow-up.
status: draft
decision_status: proposed
owner: Research
created: 2026-09-10
version: "1.0"
issue: ANX-125
tags:
  - ANX-125
  - homologation
  - openbot
  - sandbox
sources:
  - type: url
    title: CopilotKit openbot package.json scripts
    resource: https://github.com/CopilotKit/openbot/blob/main/package.json
    accessed: 2026-09-10
---
# Runbook — homologação OpenBot (sandbox)

**Issue:** ANX-125 · **Escopo:** procedimento reproduzível **fora** do core anxionOS; **proibido** credenciais institucionais ou capital real.

## Princípios

1. Clone temporário em `/tmp` — nunca commitar `node_modules` nem `.env` com chaves.
2. `INTELLIGENCE_*` e provider keys **somente** via secret store local do operador; CI usa skip ou fixtures.
3. Evidência = logs + exit code; capturas de erro UI **não** contam como homologação PASS.

## CK-OpenBot — smoke upstream (referência)

Repositório: `CopilotKit/openbot` · Script canônico upstream: `OPENBOT_SMOKE=1 bun test tests/smoke`

### Pré-requisitos locais (operador humano)

- Docker + Bun 1.3+
- `.env` com `INTELLIGENCE_API_KEY`, `OPENAI_API_KEY`, `KEY_ENCRYPTION_KEY` (gerar via `openssl rand -base64 32`)
- `bash scripts/start.sh` no clone

### Oráculos mínimos (sem Intelligence = esperado FAIL startup)

```bash
# Metadado repo
gh api repos/CopilotKit/openbot --jq '{full_name,license:.license.spdx_id}'

# No clone temporário — após bun install
bun run generate:app-config   # exit 0
bun run typecheck             # exit 0 quando deps ok
OPENBOT_SMOKE=1 bun test tests/smoke   # exit 0 quando stack completa
```

**Disposição anxionOS:** wrapper futuro em `backend/scripts/` (ANX-144) deve espelhar estes comandos com `SKIP_OPENBOT_E2E=1` default em CI.

## MEET-OpenBot — probes sem inferência

```bash
# Clone + install (lock divergente documentado em verification-runtime)
# Start com HOST=127.0.0.1 e dirs temp

curl -fsS http://127.0.0.1:<port>/api/health | jq .status   # ok

curl -fsS -X POST http://127.0.0.1:<port>/api/publish \
  -H 'content-type: application/json' \
  -d '{"type":"agent:invoke","data":{"role":"user","content":"ping"}}' \
  # esperado 4xx sem API key — não é falha de homologação de harness
```

Oracle cancelamento (módulo puro, já reproduzido ANX-125): ver `openbot-verification-runtime.md` § Cancelamento meetopenbot.

## Integração anxionOS (placeholder env)

`backend/.env.example` declara `INTELLIGENCE_API_URL`, `INTELLIGENCE_GATEWAY_WS_URL`, `INTELLIGENCE_API_KEY` — **não usados** pelo core API hoje. ANX-144 implementa ports; até então `npm run taskboard:ensure` + `bun test` backend permanece oráculo de regressão.

## O que este runbook NÃO prova

- Paridade UI Astro P07
- Multi-tenant agency_id + RLS
- Graph Kernel institucional
- Homologação produção Intelligence

## Referências

- [Matriz capacidades](./openbot-capability-matrix.md)
- [Traceability ANX-144](./openbot-anx144-acceptance-traceability.md)
- [Runtime evidências](./openbot-verification-runtime.md)
