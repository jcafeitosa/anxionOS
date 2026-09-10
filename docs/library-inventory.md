# Inventário de bibliotecas — anxionOS

Versões resolvidas nos lockfiles em **2026-09-07**. Política: latest estável no momento da instalação, fixado no lockfile.

## Decisões de stack (frontend)

| Decisão | Escolha | Status |
| ------- | ------- | ------ |
| Framework web (P07+) | **Astro** + React islands | Aceito — ver [docs/frontend/README.md](frontend/README.md) |
| Alternativas excluídas | Next.js, Vite SPA standalone, React Native | — |

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
| `pino`                   | 9.14.0        |
| `pino-pretty`            | 13.1.3        |
| `@elysia/opentelemetry`  | 1.4.12        |
| `@opentelemetry/api`     | 1.9.1         |
| `@opentelemetry/sdk-node`| 0.222.0       |

### Raiz `@anxionos/backend` (dev)

| Pacote              | Versão (lock) |
| ------------------- | ------------- |
| `@biomejs/biome`    | 1.9.4         |
| `typescript`        | 7.0.2         |
| `dependency-cruiser`| 16.9.x        |

### `@anxionos/frontend` (P07 — `frontend/package-lock.json`)

| Pacote              | Versão (lock) | Classificação |
| ------------------- | ------------- | ------------- |
| `astro`             | 7.3.1         | Framework (decisão de projeto) |
| `@astrojs/react`    | 6.0.5         | Integração oficial |
| `react`             | 19.2.8        | Islands interativas |
| `react-dom`         | 19.2.8        | Islands interativas |
| `tailwindcss`       | 4.3.3         | Estilo |
| `@tailwindcss/vite` | 4.3.3         | Plugin Vite (via Astro) |
| `lucide-react`      | 1.42.0        | Ícones |
| `better-auth`       | 1.7.3         | Cliente auth (React) |
| `typescript`        | 7.0.2         | Compilador (pin estável; `baseUrl` removido do tsconfig) |

## Atualizar

### Backend

```bash
cd backend
bun update          # latest dentro dos ranges do package.json
bun test && bun run typecheck && bun run boundaries
```

### Frontend

```bash
cd frontend
npm update          # latest dentro dos ranges do package.json
npm run build
```

Registrar data e versões resolvidas neste arquivo após mudanças materiais.
