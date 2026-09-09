# Fila de delegação — runtime do projeto

**Não faz parte do framework global.** `install-global` **não** copia pacotes de delegação — apenas este README.

Pacotes de contexto vivem no **projeto** (runtime ou exemplos), não no core portable.

---

## Onde colocar pacotes

| Local | Quando |
| --- | --- |
| `.cursor/orchestration-runtime/delegation/` | Runtime local (gitignored) — recomendado |
| `examples/project-<nome>/delegation-queue/` | Exemplos versionados por instância |
| Issue comments + taskboard | Fonte canônica de status |

---

## Instância anxionOS (exemplo)

Pacotes em [examples/project-anxionos/delegation-queue/](../examples/project-anxionos/delegation-queue/):

| Issue | Arquivo |
| --- | --- |
| ANX-134 | [ANX-134.md](../examples/project-anxionos/delegation-queue/ANX-134.md) |
| ANX-135 | [ANX-135.md](../examples/project-anxionos/delegation-queue/ANX-135.md) |
| ANX-136 | [ANX-136.md](../examples/project-anxionos/delegation-queue/ANX-136.md) |
| Kickoff | [DEV-KICKOFF.md](../examples/project-anxionos/delegation-queue/DEV-KICKOFF.md) |

---

## Como usar (qualquer projeto)

1. `npm run taskboard:ensure` + `node scripts/taskboard.mjs get PREFIX-N`
2. Confirmar dependências no pacote da issue
3. Claim só quando critérios satisfeitos
4. G0: pacote na issue + `orchestration:session start`
5. Primeiro broadcast: `ack` ([INTERACTIONS.md](../INTERACTIONS.md))

---

**Relacionados:** [DELEGATION.md](../DELEGATION.md) · [START-WORK.md](../START-WORK.md)
