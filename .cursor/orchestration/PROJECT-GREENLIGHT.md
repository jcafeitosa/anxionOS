# Project Greenlight — gate produto vs framework

Política **por projeto**: trabalho de produto (código da aplicação) exige autorização explícita do @Owner ou stakeholder definido no `orchestration.config.json`. O **framework** de orquestração Cursor permanece permitido sem greenlight de produto.

> **Framework agnóstico:** este documento descreve o padrão. Cada instância preenche paths, prefixo de issues e exemplos em `.cursor/orchestration.config.json`. Ver instância anxionOS em [examples/project-anxionos/](./examples/project-anxionos/).

---

## Escopos (template)

| Escopo | Paths típicos | Status default | Condição para retomar |
| --- | --- | --- | --- |
| **Produto** | `codeRoots` do config (ex. `backend/`, `frontend/`), docs de produto, issues de slice | **BLOCKED** até greenlight | Owner autoriza explicitamente o escopo de produto |
| **Framework** | `.cursor/orchestration/`, `.cursor/rules/`, hooks, issues de framework | **ALLOWED** | Claim + compliance normal; não altera `codeRoots` |

---

## O que agentes devem fazer

1. **Sem greenlight de produto:** não editar paths em `codeRoots` nem docs públicas de produto; mover issues de produto `in_progress` → `blocked` com comentário.
2. **Com greenlight explícito:** registrar comentário na issue citando a autorização; retomar pipeline G0→G7.
3. **Framework:** continua com issues de framework e políticas de orquestração (AGENTS.md, taskboard, verify).

---

## Frases que contam como greenlight (produto)

Defina no README/AGENTS.md do projeto. Exemplos:

- "autorizo trabalho no produto"
- "greenlight para backend/frontend"
- Comentário estruturado na issue citando escopo

**Não conta:** silêncio, "continua", inferência de contexto anterior.

---

## Instância anxionOS

Ver [examples/project-anxionos/delegation-queue/DEV-KICKOFF.md](./examples/project-anxionos/delegation-queue/DEV-KICKOFF.md) e [OWNER-GREENLIGHT.anxionos.md](./examples/project-anxionos/OWNER-GREENLIGHT.anxionos.md).

---

**Relacionados:** [GOAL-STATUS.md](./GOAL-STATUS.md) · [OWNER-AUTHORIZATION.md](./OWNER-AUTHORIZATION.md) · [AGNOSTIC-DESIGN.md](./AGNOSTIC-DESIGN.md)
