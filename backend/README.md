# anxionOS backend (P01–P02)

Workspace Bun/TypeScript do backend anxionOS — composition root separado conforme [ADR0002](../../brain/project-docs/decisions/0002-adopt-modular-backend-layout.md).

## Escopo

- `apps/api` — API Bun + Elysia (`GET /health`); deps P02: Better Auth, CORS, OpenAPI
- `packages/contracts` — schemas versionados (`schemaVersion`)
- `packages/eventing` — ports journal/outbox + cliente NATS
- `packages/database` — conexão PostgreSQL (Drizzle + `pg`)
- `packages/observability` — logger estruturado + OpenTelemetry (mínimo)
- `tests/contracts` — smoke tests
- `deploy/docker` — Postgres, NATS JetStream e Neo4j para dev local

**Não** inclui os 23 módulos de domínio — chegam em P02+.

## Pré-requisitos

- [Bun](https://bun.sh) ≥ 1.1
- Docker (Colima ou Docker Desktop) para infra local

## Comandos

```bash
cd backend
bun install
bun run dev          # API em http://localhost:3000
bun test             # smoke tests
bun run lint         # Biome
bun run typecheck    # TypeScript project references
bun run boundaries   # dependency-cruiser (AR01)
```

### Health check

```bash
curl http://localhost:3000/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "schemaVersion": "0.1.0",
  "service": "api",
  "timestamp": "2026-09-07T21:00:00.000Z"
}
```

### Infra local (Docker)

Subir Postgres, NATS (JetStream) e Neo4j:

```bash
docker-compose -f deploy/docker/docker-compose.yml up -d
```

| Serviço   | Porta(s)     | Imagem (pin)              | Uso                          |
| --------- | ------------ | ------------------------- | ---------------------------- |
| Postgres  | 5432         | `postgres:16-alpine`      | Transações / Drizzle         |
| NATS      | 4222, 8222   | `nats:2.10-alpine`        | Eventos / JetStream          |
| Neo4j     | 7474, 7687   | `neo4j:5.26.2-community`  | Grafo institucional (P03+)   |
| Taskboard | 47823        | (host, não compose)       | Dashi/Codex Taskboard        |

Copie `.env.example` para `.env` e ajuste se necessário:

```bash
cp .env.example .env
```

| Variável         | Valor padrão (dev)                                      |
| ---------------- | ------------------------------------------------------- |
| `PORT`           | `3000`                                                  |
| `DATABASE_URL`   | `postgres://anxionos:anxionos@localhost:5432/anxionos` |
| `NATS_URL`       | `nats://localhost:4222`                                 |
| `NEO4J_URI`      | `bolt://localhost:7687`                                 |
| `NEO4J_USER`     | `neo4j`                                                 |
| `NEO4J_PASSWORD` | `anxionos`                                              |
| `LOG_LEVEL`      | `info`                                                  |

### Verificar serviços

```bash
# Postgres
docker exec docker-postgres-1 pg_isready -U anxionos

# NATS JetStream
curl http://localhost:8222/healthz

# Neo4j HTTP + Bolt
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:7474
docker exec docker-neo4j-1 cypher-shell -u neo4j -p anxionos "RETURN 1"
```

Inventário de pacotes npm: [docs/library-inventory.md](../docs/library-inventory.md).

## Boundaries (AR01)

`bun run boundaries` valida:

- `packages/*` não importam `apps/*`
- `packages/contracts` não importam `modules/*`
- (futuro) `modules/*/domain` não importam apps/infra

Regras em `.dependency-cruiser.cjs`.
