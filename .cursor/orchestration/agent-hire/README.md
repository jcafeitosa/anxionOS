# Agent Hire — Hierarquia Circular

CLI mínima para roster permanente (Level A/B/C) e contratação on-demand de especialistas/workers por issue.

## Comandos

```bash
# Bootstrap — contrata todos A, B, C permanentemente
npm run orchestration:hire -- bootstrap

# Listar roster
npm run orchestration:roster -- list
npm run orchestration:roster -- counts

# Contratar on-demand (evidência obrigatória)
npm run orchestration:hire -- --persona security-lead --issue ANX-221 --reason "G4 review"
npm run orchestration:hire -- --worker typescript-reviewer --issue ANX-134 --reason "G2 diff backend" --type worker

# Dispensar após entrega
npm run orchestration:dismiss -- --persona security-lead --issue ANX-221 --evidence "G4 PASS"
npm run orchestration:dismiss -- issue-done --issue ANX-221

# Integração taskboard (board → hire)
node .cursor/orchestration/agent-hire/taskboard-sync.mjs delegate --issue ANX-N
node .cursor/orchestration/agent-hire/taskboard-sync.mjs done --issue ANX-N

# Hire → board (automático após orchestration:hire)
# Ver HIRE-TASKBOARD-SYNC.md — comentário + label hired:<slug>
```

## Arquivos de estado

| Arquivo | Conteúdo |
| --- | --- |
| `.cursor/orchestration-runtime/hire/permanent-roster.json` | Level A/B/C — sempre ativos |
| `.cursor/orchestration-runtime/hire/active-on-demand.json` | Contratações por issue |
| `.cursor/orchestration-runtime/hire/hire-log.jsonl` | Auditoria hire/dismiss/CTO |
| `.cursor/orchestration-runtime/hire/active-agents.json` | Espelho permanent + on-demand |

## Política

- **Permanentes:** Renata, Marcus (A); gate leads + Ju/André (B); executores + críticos (C)
- **On-demand:** researcher, subagentes ECC (security-reviewer, e2e-runner, build-error-resolver…)
- **CTO** aprova hire de não-permanentes via `cto-hire-decide.mjs` (registro no log)
- **Dismiss** exige `--evidence` com o que foi entregue

Ver [HIERARCHY.md](../HIERARCHY.md).
