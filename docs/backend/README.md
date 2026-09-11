---
type: guide
---

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

- `modules/` — **23 módulos do baseline (ADR0002)** com código presente em `src/` (journal/outbox/migrations), incluindo `agents`. O diretório `adapter-gateway/` existe no tree como resquício pré-migração: o **baseline permanece 23 módulos** e o gateway externo é **distribuído nos donos executores/de dados** (execution + market-data) conforme [ADR0006](../../brain/project-docs/decisions/0006-distribute-external-gateways-within-baseline.md) e [ANX-345]. Detalhes: `brain/notes/anxionos-backend-conformance-2026-09-08.md` (local).

## Pré-requisitos

- [Bun](https://bun.sh) ≥ 1.1
- Docker (Colima ou Docker Desktop) para infra local

## Comandos

```bash
cd backend
bun install
bun run dev          # API em http://localhost:3000 (hotswap — ver abaixo)
bun test             # smoke tests
bun run lint         # Biome
bun run typecheck    # TypeScript project references
bun run boundaries   # dependency-cruiser (AR01)
```

### Banco de dados novo: bootstrap e oráculo (ANX-463)

O verde histórico da suíte dependia do banco `anxionos` de desenvolvimento, migrado quando as migrations ainda funcionavam; um banco criado do zero falhava (journal Drizzle compartilhado entre módulos, colunas monetárias `TEXT` onde o código agrega em SQL, GRANTs ausentes). O caminho suportado para provisionar um banco limpo é:

```bash
cd backend
bun run db:bootstrap          # extensões ADR0004 + roles/GRANTs + migrations de todos os módulos
bun run test:pg:fresh         # oráculo: banco do zero -> bootstrap -> suíte completa (exige 0 fail / 0 skip)
```

- `db:bootstrap` é idempotente e faz o que o deploy precisa em um banco vazio: `CREATE EXTENSION timescaledb/vector`, provisiona `anxion_app`/`anxion_service`/`anxion_migrator` (com `GRANT CONNECT` no banco conectado) e aplica o journal/DDL de cada módulo. Módulos cujo `ensureXSchema` ainda não tem pasta `migrations/` são reportados como **GAP** (hoje: `audit`, `billing`, `connections`, `knowledge`, `orchestration`) e o script sai com código 1 — nenhum módulo é ignorado em silêncio.
- `test:pg:fresh` cria um banco descartável (`anxionos_oracle` por padrão, `--database` para trocar), recusa-se a tocar em `anxionos` e nos bancos reservados (`anxionos_g2r`, `_g3r`, `_g3r2`, `_g4r`, `_g5r`, `_g5r2`, `_org`), roda a suíte com `RUN_PG_INTEGRATION_TESTS=true` e falha se a contagem não for **0 fail e 0 skip**. O log completo fica em `$TMPDIR`.
- O job `backend-pg-fresh` do CI roda exatamente esse oráculo com um Postgres novo, para que o defeito não volte a ficar invisível.


### Desenvolvimento com hotswap

`bun run dev` delega para `apps/api` com `bun --env-file=../../.env --watch src/index.ts` — carrega `backend/.env` (Postgres, NATS, Neo4j, Better Auth) mesmo com cwd em `apps/api`. O runtime Bun recarrega automaticamente ao salvar arquivos `.ts`. Logs de boot incluem `DATABASE_URL loaded — identity and auth schema ready` e `API listening` na porta `3000` (ou `PORT` do `.env`). Better Auth monta em `/api/auth/*` quando `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` estão definidos.

### Observabilidade e erros (P02)

- **Logging:** `@anxionos/observability` com pino — JSON em produção, colorido em dev. Ver [docs/observability/README.md](../observability/README.md).
- **Request logging:** middleware `request-context` registra método, path, status, `durationMs` e propaga `X-Request-Id`.
- **Erros institucionais:** `@anxionos/contracts` exporta `AppError`, `ErrorCode`, `toErrorResponse`. Handler global em `apps/api/src/plugins/error-handler.ts`.
- **Envelope de erro:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "requestId": "uuid",
    "timestamp": "2026-09-08T01:51:22.170Z"
  }
}
```

- **Produção:** sem stack trace na resposta; log completo server-side com nível `error`.
- **Dev:** `EXPOSE_ERROR_DETAILS=true` inclui `stack` opcional na resposta.
- Em ambiente não-produção, respostas incluem header `Server-Timing` com duração total da requisição.
- Export OpenTelemetry completo permanece backlog.

### authPlugin

Macro `requireSession` extraída para `apps/api/src/plugins/auth.ts` — reutilizável via `.use(authPlugin)` em rotas protegidas (`GET /api/me`).

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
  "timestamp": "2026-09-07T21:00:00.000Z",
  "deps": {
    "postgres": "ok",
    "nats": "ok",
    "neo4j": "ok"
  }
}
```

Drill de backup/restore (ANX-169, destino isolado): [backup-restore-drill.md](./backup-restore-drill.md).

### Infra local (Docker)

Subir Postgres, NATS (JetStream) e Neo4j:

```bash
cp backend/deploy/docker/.env.example backend/deploy/docker/.env
docker-compose -f backend/deploy/docker/docker-compose.yml up -d
docker-compose -f backend/deploy/docker/docker-compose.yml --profile graph-sandbox up -d
npm run anx162:engine-isolation-homologation
```

#### Profile `app-workers` (ANX-453 — outbox-relay)

O compose ANX-162 sobe só Postgres/NATS/engines. Sem relay, o outbox acumula `pending`. Overlay separado (não edita o sandbox de engines):

```bash
docker compose -f backend/deploy/docker/docker-compose.yml \
  -f backend/deploy/docker/docker-compose.workers.yml \
  --profile app-workers up -d --build outbox-relay
```

No host, o equivalente continua `cd backend && bun run workers:outbox-relay`. Não rode os dois contra o mesmo banco se quiser um único dispatcher; o lease do outbox tolera corrida, mas o processo Docker é o caminho durável.

#### Profile `engines-sandbox` (ANX-162 S3 + S4)

Containers de engine externo em modo **SIMULATED** — sem credenciais live:

| Serviço | Porta | Issue / slice |
| --- | --- | --- |
| `gocryptotrader-sandbox` | `9053` | ANX-175 (GoCryptoTrader REAL) |
| `hummingbot-sandbox` | `9054` | ANX-176 (Hummingbot REAL) |
| `freqtrade-sandbox` | `9055` | ANX-177 (Freqtrade REAL) |
| `xchange-sandbox` | `9056` | ANX-178 (XChange REAL) |

```bash
cp backend/deploy/docker/.env.example backend/deploy/docker/.env
docker-compose -f backend/deploy/docker/docker-compose.yml --profile engines-sandbox build
docker-compose -f backend/deploy/docker/docker-compose.yml --profile engines-sandbox up -d
docker exec docker-gocryptotrader-sandbox-1 wget -qO- http://localhost:9053/health | jq .
docker exec docker-hummingbot-sandbox-1 wget -qO- http://localhost:9054/health | jq .
docker exec docker-freqtrade-sandbox-1 wget -qO- http://localhost:9055/health | jq .
docker exec docker-xchange-sandbox-1 wget -qO- http://localhost:9056/health | jq .
npm run anx162:s3-engines-homologation
npm run anx162:s4-egress-auth-audit-homologation
```

Isolamento aplicado a todos os serviços do quartet (`gocryptotrader-sandbox`, `hummingbot-sandbox`, `freqtrade-sandbox`, `xchange-sandbox`):

| Controle | Valor |
| --- | --- |
| Rede | `anxion-engines-sandbox` (`internal: true` — egress deny; sem `anxion-control`/`anxion-data`) |
| Service auth | `ENGINE_SANDBOX_AUTH_TOKEN` — Bearer em rotas API; `/health` público |
| Usuário | `10001` (non-root) |
| Root FS | `read_only: true` + `tmpfs` em `/tmp` |
| Capabilities | `cap_drop: [ALL]`, `no-new-privileges` |
| Docker socket | proibido (verificado pelos oracles S3/S4) |
| Audit manifest | `backend/deploy/docker/audit/engine-sandbox-manifest.json` |

Detalhes S4: [backend/deploy/docker/EGRESS-AUTH-AUDIT.md](../../backend/deploy/docker/EGRESS-AUTH-AUDIT.md).

> Os containers são **stubs sandbox** com superfície compatível (`/health`, `/v1/getinfo`, `/v1/status`, `/api/v1/ping`, `/api/v1/health`). ANX-175/176/177/178 substituem pelos terminais reais mantendo o mesmo profile e oráculos.

> **Migração Timescale (ADR0004):** se o volume `pgdata` foi criado com imagem Postgres plain (pré-ANX-162), remova o volume antes de subir `timescale/timescaledb` — extensões `timescaledb` e `vector` são aplicadas via `initdb/001-adr0004-extensions.sql` apenas em cluster novo:
>
> ```bash
> docker-compose -f backend/deploy/docker/docker-compose.yml down -v
> docker-compose -f backend/deploy/docker/docker-compose.yml up -d postgres nats
> ```

| Serviço   | Porta(s)     | Imagem (pin)                        | Uso                                      |
| --------- | ------------ | ----------------------------------- | ---------------------------------------- |
| Postgres  | 5432         | `timescale/timescaledb:2.30.0-pg16` | OLTP + TimescaleDB + pgvector (ADR0004)  |
| NATS      | 4222, 8222   | `nats:2.10.12-alpine`               | Eventos / JetStream                      |
| Neo4j     | 7474, 7687   | `neo4j:5.26.2-community`            | Grafo institucional (`--profile graph-sandbox`) |
| GoCryptoTrader (sandbox) | 9053 | `anxionos/gocryptotrader-sandbox:0.1.0-anx162-s4` | Engine SIMULATED (`--profile engines-sandbox`) |
| Hummingbot (sandbox) | 9054 | `anxionos/hummingbot-sandbox:0.1.0-anx162-s4` | Engine SIMULATED (`--profile engines-sandbox`) |
| Freqtrade (sandbox) | 9055 | `anxionos/freqtrade-sandbox:0.1.0-anx162-s4` | Engine SIMULATED (`--profile engines-sandbox`) |
| XChange (sandbox) | 9056 | `anxionos/xchange-sandbox:0.1.0-anx162-s4` | Engine SIMULATED (`--profile engines-sandbox`) |
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

### Autenticação (Better Auth)

Better Auth está montado em `/api/auth/*` (mesmo `basePath` do frontend). Requer PostgreSQL com schema aplicado.

```bash
# 1. Subir infra (Postgres)
docker-compose -f deploy/docker/docker-compose.yml up -d

# 2. Copiar env e ajustar segredo (mín. 32 caracteres em produção)
cp .env.example .env

# 3. Aplicar schema Better Auth (tabelas user, session, account, verification, twoFactor)
cd apps/api
bun x auth@latest migrate --config ./src/auth.ts --yes

# 4. Iniciar API
cd ../..
bun run dev
```

| Variável             | Valor padrão (dev)                                      |
| -------------------- | ------------------------------------------------------- |
| `BETTER_AUTH_SECRET` | `dev-only-secret-replace-in-production-32chars-min`     |
| `BETTER_AUTH_URL`    | `http://localhost:3000` (URL pública da API)            |
| `FRONTEND_URL`       | `http://localhost:4321` (origem CORS/cookies Astro)     |
| `AUTH_RATE_LIMIT_MAX`| `20` (opcional; smoke tests usam limite alto em `NODE_ENV=test`) |
| `ENABLE_HSTS`        | `false` (defina `true` só com TLS em produção)          |

Endpoints habilitados: email/senha (sign-up, sign-in, forgot/reset password), verificação de email, 2FA/TOTP (`twoFactor` plugin).

### 2FA TOTP setup

| Endpoint | Uso |
| --- | --- |
| `POST /api/auth/two-factor/enable` | Inicia enrollment TOTP (requer sessão + senha). Retorna `totpURI` e `backupCodes`. |
| `POST /api/auth/two-factor/verify-totp` | Verifica código de 6 dígitos (setup ou login). |
| `POST /api/auth/two-factor/get-totp-uri` | Reobtém URI TOTP (sessão + senha). |

Issuer no autenticador: `anxionOS` (`appName` + `twoFactor({ issuer: "anxionOS" })`). O frontend em `/mfa/setup` renderiza QR a partir de `totpURI`.

#### E-mail transacional

Provedor primário: **Resend** (SDK oficial, integração simples com Better Auth). Alternativa documentada: **SMTP genérico** via Nodemailer (qualquer servidor SMTP).

| Variável | Descrição | Padrão (dev) |
| --- | --- | --- |
| `EMAIL_PROVIDER` | `console` \| `resend` \| `smtp` | `console` |
| `EMAIL_FROM` | Remetente (domínio verificado no Resend em produção) | `noreply@anxionos.dev` |
| `RESEND_API_KEY` | Chave da API Resend | *(vazio)* |
| `SMTP_HOST` | Host SMTP (alternativa) | *(vazio)* |
| `SMTP_PORT` | Porta SMTP | `587` |
| `SMTP_USER` | Usuário SMTP | *(vazio)* |
| `SMTP_PASSWORD` | Senha SMTP | *(vazio)* |
| `SMTP_SECURE` | TLS direto (`true` para porta 465) | `false` |

**Dev (padrão):** sem `RESEND_API_KEY` nem `SMTP_HOST`, `EMAIL_PROVIDER=console` — links e corpo dos e-mails aparecem nos logs da API (`service: email`). Não quebra o fluxo local.

**Produção (Resend):**

```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@seudominio.com
```

**Alternativa SMTP** (ex.: Mailgun, SendGrid SMTP, servidor próprio):

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=secret
SMTP_SECURE=false
EMAIL_FROM=noreply@seudominio.com
```

Links nos e-mails apontam para o frontend (`FRONTEND_URL`):

- Verificação: `/verify-email?token=...`
- Reset de senha: `/reset-password?token=...`

**2FA:** o plugin `twoFactor` usa TOTP (app autenticador) por padrão. O callback `sendOTP` envia e-mail apenas quando o fluxo OTP por e-mail é acionado — não é necessário para TOTP puro.


### Desenvolvimento local: usuário de teste

Para login automatizado (E2E, `/app` com gráficos) sem fluxo de verificação de e-mail:

```bash
# Subir Postgres + API, depois:
cd backend
bun run seed:dev
```

| Variável | Descrição | Padrão (dev) |
| --- | --- | --- |
| `DEV_SEED_PASSWORD` | Senha do usuário `dev@anxionos.local` | `anxionos-dev-pass` |
| `ALLOW_DEV_SEED` | Permite seed fora de `NODE_ENV=development` | `false` |
| `ENABLE_DEV_ROUTES` | Habilita `POST /api/dev/verify-email` | `false` |

O script é **idempotente** (upsert): cria ou atualiza senha e marca `emailVerified=true`.

**Segurança:** nunca habilitar `ALLOW_DEV_SEED` nem `ENABLE_DEV_ROUTES` em produção. A rota `/api/dev/verify-email` só responde com `ENABLE_DEV_ROUTES=true` e `NODE_ENV !== production`.

Smoke test:

```bash
curl http://localhost:3000/api/auth/ok
curl http://localhost:3000/openapi
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"testpass12","name":"You"}'
```


### Realtime gateway (P02/P07)

Gateway mínimo em `apps/api/src/realtime/` — WS → SSE → long poll. Auth via cookie Better Auth; `tenantId` da sessão.

| Endpoint | Método | Descrição |
| --- | --- | --- |
| `/api/realtime/ws` | WebSocket | Subscribe/unsubscribe/ping (`{ op, channels }`) |
| `/api/realtime/events` | GET (SSE) | `?channels=health.deps,dashboard.metrics` — heartbeat 30s |
| `/api/realtime/poll` | GET | Long poll 25s; header `Last-Event-ID` |

Canais allowlist: `health.deps`, `dashboard.metrics`, `notifications`, `session.revoked`.

NATS (`NATS_URL`): bridge server-side em `anxionos.tenant.*.events` e `anxionos.broadcast` — degrada se offline.

Contrato: `RealtimeEnvelope` em `@anxionos/contracts`. Docs: [realtime-connection-strategy.md](../research/realtime-connection-strategy.md), [ADR0005](../decisions/0005-realtime-gateway-elysia-nats.md).

### OpenAPI / Scalar

Documentação interativa em **`http://localhost:3000/openapi`** (plugin `@elysia/openapi` + [Scalar API Reference](https://scalar.com/products/api-references/configuration)). Spec JSON em **`/openapi/json`**. Tema Kepler, cookie Better Auth (`cookieAuth`), servers a partir de `BETTER_AUTH_URL`/`PORT`, telemetry e Agent desligados. CDN Scalar pinada (`@scalar/api-reference@1.68.0`).

Operações agrupadas pelos **23 módulos** do baseline (ADR0002) mais Health/Realtime (`x-tagGroups`). Identity documenta sign-in/sign-up/get-session/sign-out; o catch-all `/api/auth/*` fica oculto no Scalar. Módulos ainda sem HTTP em `apps/api` aparecem como `GET /v1/<módulo>` no spec (501 catalog) — não são handlers reais.

### Segurança (P02)

| Controle | Detalhe |
| --- | --- |
| Rate limit | `20 req/min/IP` em `/api/auth/*` (ajustável via `AUTH_RATE_LIMIT_MAX`) |
| Security headers | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` |
| HSTS | Somente com `ENABLE_HSTS=true` (produção TLS) |
| Erros | Validação sem detalhes em `NODE_ENV=production` |

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

Inventário de pacotes npm: [library-inventory.md](../library-inventory.md).

## Boundaries (AR01)

`bun run boundaries` valida:

- `packages/*` não importam `apps/*`
- `packages/contracts` não importam `modules/*`
- (futuro) `modules/*/domain` não importam apps/infra

Regras em `.dependency-cruiser.cjs`.
