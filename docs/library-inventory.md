---
type: reference
---

# Inventário de bibliotecas — anxionOS

Versões resolvidas nos lockfiles em **2026-09-10** (ANX-383 + TypeScript 7.0.2 — ANX-341). Política: latest estável no momento da instalação, pin exact no `package.json` + lockfile.

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
| `drizzle-orm` | 0.45.2        |

### `@anxionos/eventing`

| Pacote | Versão (lock) |
| ------ | ------------- |
| `nats` | 2.29.3        |

### `@anxionos/api`

| Pacote                         | Versão (lock) |
| ------------------------------ | ------------- |
| `elysia`                       | 1.4.30        |
| `zod`                          | 4.6.2         |
| `better-auth`                  | 1.7.4         |
| `@better-auth/drizzle-adapter` | 1.7.4         |
| `@elysia/cors`                 | 1.4.2         |
| `@elysia/openapi`              | 1.4.16        |

### `@anxionos/observability`

| Pacote                    | Versão (lock) |
| ------------------------- | ------------- |
| `@elysia/opentelemetry`    | 1.4.12        |
| `@opentelemetry/api`       | 1.9.1         |
| `@opentelemetry/sdk-node` | 0.222.0       |

`pino` não é dependência deste pacote (removido do inventário).

### Raiz `@anxionos/backend` (dev)

| Pacote               | Versão (lock) | Notas |
| -------------------- | ------------- | ----- |
| `@biomejs/biome`     | 2.5.13        | `preset: "none"` no `biome.json`; **não** rodar `biome check --write` na árvore até follow-up de format |
| `typescript`         | 7.0.2         | Native compiler |
| `dependency-cruiser` | 16.10.4       | 18.x exige API TypeScript `<7`; cruise exclui `dist/` |

### `@anxionos/frontend` (P07 — `frontend/package-lock.json`)

| Pacote              | Versão (lock) | Classificação |
| ------------------- | ------------- | ------------- |
| `astro`             | 7.3.2         | Framework (decisão de projeto) |
| `@astrojs/react`    | 6.0.5         | Integração oficial |
| `@astrojs/node`     | 11.1.5        | Adapter Node |
| `react`             | 19.3.0        | Islands interativas |
| `react-dom`        | 19.3.0        | Islands interativas |
| `tailwindcss`       | 4.3.3         | Estilo |
| `@tailwindcss/vite` | 4.3.3         | Plugin Vite (via Astro) |
| `lucide-react`      | 1.44.0        | Ícones |
| `better-auth`       | 1.7.4         | Cliente auth (React) |
| `zod`               | 4.6.2         | Validação |
| `typescript`        | 7.0.2         | Compilador (`tsc --noEmit`; `astro check` = ANX-381) |
| `@types/node`       | 26.5.0        | Alinhado ao host Node 26 |

## Riscos conscientemente adiados

| Item | Motivo | Rollback / gate |
| ----- | ------ | --------------- |
| `dependency-cruiser` 18.2.0 | Sem compiler API do TypeScript 7 (`typescript >=2 <7`); cruzava `dist/` e falhava AR01 | Permanecer 16.10.4 + `exclude dist/` |
| Biome `recommended` + format em massa | `biome migrate` gerou `preset: "none"`; `--write` reescreve o tree | Issue de format isolada; não misturar com ANX-383 |
| `@astrojs/check` | Peer TypeScript 5/6; TS 7 nativo sem API programática | ANX-381 |
| `vendor/` (goclaw) | Fora do produto anxionOS | Não pinado |

Zod 4: `z.string().uuid()` exige UUID RFC (versão 1–8, variante 8–b). Fixtures de teste que usavam nibble `c` foram corrigidas; o schema de produção não foi afrouxado.

## Atualizar

### Backend

```bash
cd backend
bun update
bun test && bun run typecheck && bun run boundaries
```

### Frontend

```bash
cd frontend
npm update
npm run typecheck && npm run test:unit && npm run build
```

Registrar data e versões resolvidas neste arquivo após mudanças materiais.
