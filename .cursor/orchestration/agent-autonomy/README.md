# Agent Autonomy Layer

Ferramentas para personas gerenciarem **hooks**, **loops**, **crons** e **goals** dentro dos limites do pipeline G0–G7 e da política zero-trabalho-fora-do-board.

## Comandos npm

```bash
npm run orchestration:autonomy -- list
npm run orchestration:hooks -- list
npm run orchestration:loops -- list
npm run orchestration:cron -- list
npm run orchestration:goals -- protocol
```

## Setup rápido (executor)

```bash
# 1. Claim issue
npm run taskboard:ensure
node scripts/taskboard.mjs move ANX-N in_progress

# 2. Registrar goal multi-turn
npm run orchestration:goals -- register \
  --persona backend-executor \
  --id anx-n-impl \
  --issue ANX-N \
  --objective "Implementar X com testes verificáveis"

# 3. Na sessão Cursor: CreateGoal com o mesmo objetivo

# 4. Loop de verificação (opcional)
npm run orchestration:loops -- register \
  --persona backend-executor \
  --id anx-n-test-loop \
  --every 10m \
  --prompt "Rodar testes da ANX-N e reportar status" \
  --issue ANX-N

# 5. Handoff automático no fim do turno
cat > .cursor/orchestration-runtime/autonomy/pending-broadcast.json << 'EOF'
{
  "type": "handoff",
  "fromPersona": "backend-executor",
  "toPersona": "backend-critic",
  "issueId": "ANX-N",
  "gate": "G1",
  "body": "@marina, candidato pronto para G1."
}
EOF
```

## Artefatos

| Artefato | Caminho |
| --- | --- |
| Registry | `.cursor/orchestration-runtime/autonomy/registry.json` |
| Audit log | `.cursor/orchestration-runtime/autonomy/autonomy.jsonl` |
| Hooks Cursor | `.cursor/hooks.json` |
| Estado cron | `.cursor/orchestration-runtime/autonomy/cron-state.json` |
| PIDs de loops | `.cursor/orchestration-runtime/autonomy/loops/*.pid` |

## Módulos

| Arquivo | Função |
| --- | --- |
| `registry.mjs` | Listar/validar/auditar registry |
| `hooks-manager.mjs` | CRUD hooks por persona |
| `loops-manager.mjs` | Registrar/iniciar/parar loops |
| `cron-manager.mjs` | Agendar tarefas periódicas |
| `goals-manager.mjs` | Protocolo + metadados de goals |
| `autonomy-log.mjs` | Audit trail JSONL |
| `lib.mjs` | Validação e paths compartilhados |

## Crons padrão (orchestrator)

| ID | Intervalo | Comando |
| --- | --- | --- |
| `taskboard-health` | 5m | `npm run taskboard:ensure` |
| `dialogue-sync` | 1m | `dialogue-sync.mjs` |
| `pipeline-stale-check` | 1d | `pipeline-stale-check.mjs` |

Iniciar daemon: `npm run orchestration:cron -- start`

## Documentação

- [AUTONOMY.md](../AUTONOMY.md) — princípios e matriz por papel
- [GOALS-PROTOCOL.md](../GOALS-PROTOCOL.md) — CreateGoal/UpdateGoal
- [RUNBOOK.md](../RUNBOOK.md) — comandos operacionais
