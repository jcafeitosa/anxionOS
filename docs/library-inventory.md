# Inventário de bibliotecas — backend anxionOS

Versões resolvidas no `backend/bun.lock` em **2026-09-07**. Política: latest estável no momento da instalação, fixado no lockfile.

## Runtime

| Ferramenta | Versão (host) |
| ---------- | ------------- |
| Bun        | 1.4.0         |
| Node       | 26.8.1        |
| Python     | 3.14.7        |

## Imagens Docker (dev)

| Serviço  | Imagem                   |
| -------- | ------------------------ |
| Postgres | `postgres:16-alpine`     |
| NATS     | `nats:2.10-alpine`       |
| Neo4j    | `neo4j:5.26.2-community` |

## Pacotes por workspace

### `@anxionos/database`

| Pacote        | Versão (lock) |
| ------------- | ------------- |
| `pg`          | 8.23.0        |
| `@types/pg`   | 8.23.1        |
| `drizzle-kit` | 0.31.10       |
| `drizzle-orm` | 0.38.4        |

### `@anxionos/eventing`

| Pacote | Versão (lock) |
| ------ | ------------- |
| `nats` | 2.29.3        |

### `@anxionos/api`

| Pacote                         | Versão (lock) |
| ------------------------------ | ------------- |
| `elysia`                       | 1.4.30        |
| `zod`                          | 3.24.x        |
| `better-auth`                  | 1.7.3         |
| `@better-auth/drizzle-adapter` | 1.7.3         |
| `@elysia/cors`                 | 1.4.2         |
| `@elysia/openapi`              | 1.4.16        |

### `@anxionos/observability`

| Pacote                   | Versão (lock) |
| ------------------------ | ------------- |
| `@elysia/opentelemetry`  | 1.4.12        |
| `@opentelemetry/api`     | 1.9.1         |
| `@opentelemetry/sdk-node`| 0.222.0       |

### Raiz `@anxionos/backend` (dev)

| Pacote              | Versão (lock) |
| ------------------- | ------------- |
| `@biomejs/biome`    | 1.9.4         |
| `typescript`        | 5.7.x         |
| `dependency-cruiser`| 16.9.x        |

## Atualizar

```bash
cd backend
bun update          # latest dentro dos ranges do package.json
bun test && bun run typecheck && bun run boundaries
```

Registrar data e versões resolvidas neste arquivo após mudanças materiais.
