# anxionOS backend (P01)

Workspace Bun/TypeScript do backend anxionOS — composition root separado conforme [ADR0002](../../brain/project-docs/decisions/0002-adopt-modular-backend-layout.md).

## Escopo P01

- `apps/api` — API Bun + Elysia (`GET /health`)
- `packages/contracts` — schemas versionados (`schemaVersion`)
- `packages/eventing` — ports journal/outbox (sem implementação)
- `packages/database` — stub de conexão (Drizzle preparado)
- `packages/observability` — logger estruturado
- `tests/contracts` — smoke tests
- `deploy/docker` — Postgres + NATS para dev local

**Não** inclui os 23 módulos de domínio — chegam em P02+.

## Pré-requisitos

- [Bun](https://bun.sh) ≥ 1.1

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

### Infra local (opcional)

```bash
docker compose -f deploy/docker/docker-compose.yml up -d
```

Variáveis sugeridas: `DATABASE_URL=postgres://anxionos:anxionos@localhost:5432/anxionos`, `NATS_URL=nats://localhost:4222`.

## Boundaries (AR01)

`bun run boundaries` valida:

- `packages/*` não importam `apps/*`
- `packages/contracts` não importam `modules/*`
- (futuro) `modules/*/domain` não importam apps/infra

Regras em `.dependency-cruiser.cjs`.
