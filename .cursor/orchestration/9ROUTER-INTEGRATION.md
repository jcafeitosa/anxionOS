# Integração 9Router — API OpenAI-compatible

Política: agentes Cursor e scripts de orquestração que precisam de um endpoint **OpenAI-compatible** local devem apontar para o [9Router](https://github.com/decolua/9router) (gateway com fallback multi-provider), não para `api.openai.com` direto.

Relacionados: [TOOLING-INTEGRATION.md](./TOOLING-INTEGRATION.md) · [AGENT-CAPABILITIES.md](./AGENT-CAPABILITIES.md) · `agent-config/llm-router.mjs` · issue **ANX-254**

---

## O que é o 9Router

O **9Router** é um gateway local (npm: `9router`) que expõe uma API **OpenAI-compatible** em `http://localhost:20128/v1`. Ele roteia requisições para 60+ provedores (Claude Code, Codex, Gemini, OpenRouter, Ollama, etc.) com fallback em 3 tiers (assinatura → barato → gratuito). Modelos usam prefixo de provider (`kr/claude-sonnet-4.5`, `cc/claude-opus-4-7`, `gh/...`). Dashboard: `http://localhost:20128/dashboard` — a API key é gerada/copiada no dashboard.

> **Nota produto:** o módulo `connections` do anxionOS trata import/migração de credenciais 9Router como operação governada (decisão D-CX-010) — isso é escopo futuro de produto, não desta integração de framework.

---

## Escopo desta integração (framework)

| Camada | O que foi integrado |
| --- | --- |
| **Cursor / orquestração** | Env vars documentadas + resolver `llm-router.mjs` |
| **graphify / ferramentas OpenAI-compat** | `OPENAI_BASE_URL` + `OPENAI_API_KEY` |
| **Backend anxionOS** | Fora do escopo ANX-254 — usar `connections` quando slice autorizado |

---

## Variáveis de ambiente

Adicione ao `.env` na raiz do repositório (copie de `.env.example`):

| Variável | Obrigatório | Descrição |
| --- | --- | --- |
| `NINEROUTER_BASE_URL` | Não | Base URL do 9Router (preferencial no projeto). Default: `http://localhost:20128/v1` |
| `OPENAI_BASE_URL` | Não | Alias amplamente suportado (Cursor, graphify). Mesmo valor que acima |
| `OPENAI_API_KEY` | Sim* | API key copiada do dashboard 9Router |
| `NINEROUTER_API_KEY` | Não | Alias opcional da key |
| `NINEROUTER_MODEL` | Não | Modelo default com prefixo (ex.: `kr/claude-sonnet-4.5`) |
| `OPENAI_MODEL` | Não | Alias do modelo |

\* Obrigatório para chamadas reais; o resolver reporta `configured: false` sem key.

**Precedência base URL:** `NINEROUTER_BASE_URL` → `OPENAI_BASE_URL` → `OPENAI_API_BASE` → default config → `http://localhost:20128/v1`

---

## Instalação do 9Router (Owner)

```bash
npm install -g 9router
# ou: npx 9router
```

1. Abra `http://localhost:20128/dashboard`
2. Adicione providers (OAuth ou API key)
3. Copie a API key do dashboard para `OPENAI_API_KEY` no `.env`

---

## Cursor — apontar para 9Router

Em **Cursor Settings → Models → OpenAI API Key**:

- **Override OpenAI Base URL:** `http://localhost:20128/v1`
- **API Key:** valor do dashboard 9Router
- **Model:** use o id com prefixo do 9Router (ex.: `kr/claude-sonnet-4.5`)

O `.env` na raiz do workspace também pode exportar `OPENAI_BASE_URL` e `OPENAI_API_KEY` para ferramentas CLI do repo.

---

## Resolver no framework

```bash
node -e "import('./.cursor/orchestration/agent-config/llm-router.mjs').then(m => console.log(m.resolveLlmRouterConfig()))"
```

Saída típica:

```json
{
  "provider": "9router",
  "baseUrl": "http://localhost:20128/v1",
  "apiKey": null,
  "model": null,
  "chatCompletionsUrl": "http://localhost:20128/v1/chat/completions",
  "modelsUrl": "http://localhost:20128/v1/models",
  "configured": false
}
```

---

## Exemplo curl

```bash
export OPENAI_API_KEY="sk_sua_key_do_dashboard"
export NINEROUTER_BASE_URL="http://localhost:20128/v1"

curl "${NINEROUTER_BASE_URL}/chat/completions" \
  -H "Authorization: Bearer ${OPENAI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kr/claude-sonnet-4.5",
    "messages": [{"role": "user", "content": "ping"}],
    "stream": false
  }'
```

Listar modelos:

```bash
curl "${NINEROUTER_BASE_URL}/models" \
  -H "Authorization: Bearer ${OPENAI_API_KEY}"
```

---

## Config em `orchestration.config.json`

```json
"llmRouter": {
  "provider": "9router",
  "defaultBaseUrl": "http://localhost:20128/v1",
  "defaultModel": null
}
```

---

## Lacunas / o que o Owner deve fornecer

| Item | Status |
| --- | --- |
| 9Router instalado e rodando localmente | Owner |
| API key do dashboard | Owner — nunca commitar; **rotacionar** se exposta em chat/log |
| `.env` local (raiz anxionOS) | `NINEROUTER_BASE_URL`, `OPENAI_BASE_URL`, `OPENAI_API_KEY` — gitignored; consumido por `agent-config/llm-router.mjs` (`resolveLlmRouterConfig` → `configured: true`) |
| Modelo preferido com prefixo (`kr/`, `cc/`, `gh/`, …) | Owner — depende dos providers configurados |
| URL não-local (tunnel/VPS) | Opcional — ajustar `NINEROUTER_BASE_URL` |

---

## Verificação

```bash
npm run orchestration:test -- --test-name-pattern llm-router
# ou suite completa:
npm run orchestration:verify
```
