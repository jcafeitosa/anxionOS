# Owner Greenlight — Produto anxionOS

**Política Owner (2026-09-09):** *"só trabalhe no anxionOS quando eu autorizar"* — product work **somente** com autorização explícita do @Owner.

---

## Escopos

| Escopo | Paths / issues | Status | Condição para retomar |
| --- | --- | --- | --- |
| **Produto** | `backend/`, `frontend/`, docs de produto (`docs/backend/`, `docs/frontend/`, etc.), issues `ANX-*` de módulo/slice (ex. ANX-135, ANX-134 produto) | **ACTIVE** | Owner diz explicitamente **"autorizo anxionOS"** ou equivalente inequívoco |

```yaml
authorized: true
authorizedAt: 2026-09-09T17:00:00Z
authorizedBy: @Owner
authorizationPhrase: "autorizo anxionOS"
recordedOn: ANX-237
```
| **Framework** | `.cursor/orchestration/`, `.cursor/rules/`, `.cursor/hooks/`, `.cursor/commands/`, issues **ANX-230**, **ANX-237** | **ALLOWED** | Claim + compliance normal; não altera `backend/`/`frontend/` |

---

## O que agentes devem fazer

1. **Sem greenlight de produto:** não editar `backend/`, `frontend/` nem docs públicas de produto; mover issues de produto em `in_progress` para `blocked` com comentário explicativo.
2. **Com greenlight explícito:** registrar comentário na issue citando a frase do Owner; retomar claim e pipeline G0→G7 normalmente.
3. **Framework:** continua com issues ANX-230/237 e demais políticas de orquestração (AGENTS.md, taskboard, verify).

---

## Frases que contam como greenlight (produto)

- "autorizo anxionOS"
- "pode trabalhar no produto anxionOS"
- "greenlight para backend/frontend"
- Comentário estruturado em issue citando escopo (ver [OWNER-AUTHORIZATION.md](../../OWNER-AUTHORIZATION.md) para templates de commit)

**Não conta:** silêncio, "continua", trabalho inferido de contexto anterior sem menção explícita ao produto.

---

## Referências

- [GOAL-STATUS.md](../../GOAL-STATUS.md) — status framework vs produto
- [OWNER-AUTHORIZATION.md](../../OWNER-AUTHORIZATION.md) — templates Tier 1/2 (commits)
- [examples/project-anxionos/delegation-queue/DEV-KICKOFF.md](./examples/project-anxionos/delegation-queue/DEV-KICKOFF.md) — kickoff produto (pausado até greenlight)
- [AGENTS.md](../../../../AGENTS.md) — política zero-trabalho-fora-do-board

---

**Registrado:** 2026-09-09 · issue framework **ANX-237** · produto **ANX-135** **ACTIVE** (`in_progress`, greenlight Owner 2026-09-09)
