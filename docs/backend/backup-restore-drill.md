---
type: runbook
title: Backup, restore e rollback (sandbox ANX-169)
issue: ANX-169
---

# Backup, restore e rollback — sandbox PostgreSQL / Neo4j

Contrato: [P08 §§5–6](../orchestration/system-capabilities/p08-operations-slos-recovery-contract.md) (shutdown/leases + backup/restore/reconstrução). Este runbook **não** duplica `brain/` e **não** afirma SLO de produção.

## Classes de dado e RPO/RTO (sandbox)

| Classe | Owner | RPO (objetivo sandbox) | RTO (medido no drill) | Como prova |
| --- | --- | --- | --- | --- |
| PostgreSQL / Timescale / ledger | accounting + deploy | último dump lógico consistente | `rtoMs` = `backupMs + verifyMs + restoreMs` no JSON do drill | `bun backend/deploy/docker/backup/backup-restore.mjs drill` |
| Grafo institucional (Neo4j) | graph | replay de eventos autorizados | tempo do homologation quando `RUN_NEO4J_INTEGRATION_TESTS=true` | `bun test backend/tests/graph/neo4j-rebuild-homologation.integration.test.ts` |
| Outbox / inbox | eventing | último commit atômico com journal | replay idempotente após restore | P08 §5 — não é este script |

Números de produção (WAL contínuo, réplica, PITR) permanecem **não comprometidos** até medição + aceite do owner (P08 §11).

## Ordem de restore (isolado)

```mermaid
flowchart TD
  A[Dump custom -Fc da origem] --> B[Verificar magia PGDMP + pg_restore --list]
  B --> C[CREATE DATABASE destino isolado]
  C --> D[pg_restore no destino ≠ origem]
  D --> E[Contar tabelas ledger nomeadas]
  E --> F[DROP destino salvo --keep-target]
  G[Neo4j rebuild] --> H[Replay eventos → T01 grants]
```

1. Nunca restaurar sobre o database de origem nem sobre nomes `production` / `prod`.
2. Destino padrão: `{source}_restore_drill` (override `BACKUP_DRILL_TARGET_DB` ou `--db-name`).
3. Dump em formato **custom** (`pg_dump -Fc`). TOC (`pg_restore --list`) não deve conter `DATABASE_URL` nem senha.
4. Ledger: presença + `count(*)` de `accounting_chart_accounts`, `accounting_journal_entries`, `accounting_ledger_postings`, `accounting_command_journal` — não “file count”.
5. Autorização de retomada: operador confirma JSON `isolated: true` e `ledger.missing: []` **ou** registra missing com causa (schema ainda não migrado no sandbox).

## Rollback

| Falha | Ação |
| --- | --- |
| Drill no destino isolado | `DROP DATABASE` do destino; origem intacta |
| Restore aplicado por engano na origem | **incidente** — não é o caminho do script; restaurar de dump anterior em clone e cortar tráfego (P08 §7) |
| Neo4j divergente após replay | rebuild de geração nova a partir de eventos; não tratar dump do sandbox como autoridade do grafo |
| Secret no listing do dump | abortar; rotacionar credencial; dump custom não é SQL texto com `.env` |

## Comandos

```bash
# Postgres (host CLI). Destino isolado; origem intocada.
export DATABASE_URL=postgres://anxionos:anxionos@localhost:5432/anxionos
bun backend/deploy/docker/backup/backup-restore.mjs drill --out /tmp/anx169-backups

# Postgres via docker exec + docker cp (arquivo nasce no container e copia para o host)
export BACKUP_USE_DOCKER=true
export BACKUP_DOCKER_CONTAINER=docker-postgres-1
bun backend/deploy/docker/backup/backup-restore.mjs drill

# Neo4j homologation — só PASS com URI/senha e flag; senão o teste no-op (não é PASS de rebuild)
RUN_NEO4J_INTEGRATION_TESTS=true NEO4J_URI=bolt://localhost:7687 NEO4J_PASSWORD=anxionos \
  bun test backend/tests/graph/neo4j-rebuild-homologation.integration.test.ts
```

JSON do drill deve incluir: `backupMs`, `verifyMs`, `restoreMs`, `rtoMs`, `tableCount`, `dataset`, `hardware`, `ledger`.
