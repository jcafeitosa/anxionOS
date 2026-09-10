---
type: research
title: Google Team Playbook — framework orquestração
description: Análise de como times Google trabalham e mapeamento para personas, rituais e dialogue types.
status: stable
issue: ANX-274
---
# Google Team Playbook (ANX-274)

## Artefatos

- `.cursor/orchestration/GOOGLE-TEAM-PLAYBOOK.md` — playbook canônico
- `.cursor/orchestration/templates/GOOGLE-NATURAL-TEAM-EXAMPLES.md` — exemplos de conversa
- `.cursor/orchestration/agent-dialogue/google-team-rituals.mjs` — CLI rituais
- `.cursor/rules/google-team-collaboration.mdc` — regra alwaysApply

## CLI

```bash
npm run orchestration:google-team -- list
npm run orchestration:google-team -- check --issue ANX-N
npm run orchestration:standup -- --issue ANX-N --post
```

## Compliance

Warning `GOOGLE_TEAM_NO_PEER_CHAT` quando issue `in_progress` sem interação peer-to-peer no dialogue.
