# Observabilidade — logging estruturado (P02)

Pacote: `@anxionos/observability` (`backend/packages/observability`).

## Categorias (`LogCategory`)

| Categoria   | Uso típico                                      |
| ----------- | ----------------------------------------------- |
| `auth`      | Better Auth, sessões, e-mails de verificação    |
| `api`       | Erros institucionais, handlers globais           |
| `realtime`  | SSE, WebSocket, NATS bridge, broadcast          |
| `database`  | Conexões PostgreSQL, queries de infra           |
| `email`     | Envio Resend/SMTP/console                       |
| `security`  | Rate limit, headers, eventos de segurança       |
| `http`      | Request logging (método, path, status, duração) |
| `system`    | Boot, shutdown, timers de sistema               |
| `dev`       | Rotas e seeds de desenvolvimento                |

## Níveis

`trace` · `debug` · `info` · `warn` · `error` · `fatal`

## Campos do log

| Campo        | Descrição                                      |
| ------------ | ---------------------------------------------- |
| `timestamp`  | ISO 8601 (pino)                                |
| `level`      | Nível numérico + label                         |
| `category`   | Domínio operacional                            |
| `message`    | Mensagem humana                                |
| `requestId`  | Correlação por requisição (quando aplicável)   |
| `tenantId`   | Tenant derivado da sessão (opcional)           |
| `userId`     | Usuário autenticado (opcional)                 |
| `durationMs` | Duração de operação HTTP (opcional)            |
| `error`      | Erro serializado de forma segura (opcional)    |
| `meta`       | Campos adicionais redigidos                    |

## Variáveis de ambiente

| Variável      | Valores              | Default                          |
| ------------- | -------------------- | -------------------------------- |
| `LOG_LEVEL`   | trace…fatal          | `info`                           |
| `LOG_FORMAT`  | `json` \| `pretty`   | `json` em produção; `pretty` em TTY dev |
| `NODE_ENV`    | `development` \| `production` \| `test` | influencia formato e stack |

## Uso

```typescript
import { createLogger, redactSecrets } from "@anxionos/observability";

const logger = createLogger({ category: "auth", service: "auth" });

logger.info("Verification email dispatched", { email: user.email });

const child = logger.child({ requestId: "req-abc", userId: "u-1" });
child.warn("Suspicious login attempt", { meta: redactSecrets({ ip: "127.0.0.1" }) });
```

### Exemplo — dev (pretty/colorido)

```
[2026-09-08 01:51:22] INFO (auth): Verification email dispatched
    category: "auth"
    email: "user@example.com"
```

### Exemplo — produção (JSON)

```json
{"level":30,"time":"2026-09-08T01:51:22.170Z","category":"http","requestId":"abc-123","method":"GET","path":"/health","status":200,"durationMs":4,"msg":"HTTP request completed"}
```

## Redação de segredos

Chaves que contêm `password`, `token`, `secret`, `authorization`, `cookie`, `apiKey`, `credential` são substituídas por `[REDACTED]` via `redactSecrets()` e paths do pino.

## Dependências

- `pino` ^9.14.0 — logging estruturado
- `pino-pretty` ^13.1.3 — saída colorida em desenvolvimento

OpenTelemetry completo permanece backlog (pacote já inclui stubs OTel).
