---
title: 9Router eb712ca — snapshot e inventário de código
description: Fonte primária fixada, arquivo integral e caminhos de extração.
type: external-source
status: draft
cluster: anxionos
source_url: https://github.com/decolua/9router/tree/eb712ca821f0ba6bc41043fbd14494c5af5daba5
captured_at: 2026-09-07
---
# 9Router — fonte fixada em eb712ca

Fonte primária: [repositório no commit](https://github.com/decolua/9router/tree/eb712ca821f0ba6bc41043fbd14494c5af5daba5). Captura em 2026-09-07, branch master no momento da resolução. Commit completo: `eb712ca821f0ba6bc41043fbd14494c5af5daba5`. Pacote raiz declara versão 0.5.69.

[Baixar snapshot integral](9router-eb712ca.tar.gz), 4.050.249 bytes; SHA-256: `e488d01363f0aaca2e3898080330cd63726deb7230c7a93cce58a93f55c1631e`.

O arquivo preserva os 1.540 arquivos regulares dessa revisão, incluindo documentação, código, testes, imagens e LICENSE. Não inclui histórico Git, issues, PRs, credenciais externas ou serviços dos fornecedores. A árvore Git possui 1.921 entradas contando diretórios; resposta não truncada.

## Proveniência e licença

Origem do download: codeload.github.com/decolua/9router/tar.gz/eb712ca821f0ba6bc41043fbd14494c5af5daba5. Download limitado a 50 MiB; arquivo validado por leitura do tar e hash. Nenhum script do repositório foi executado. LICENSE no snapshot: MIT, copyright (c) 2024–2026 decolua and contributors; preservar o aviso e a licença ao distribuir cópias ou porções substanciais. Dependências e serviços externos possuem condições próprias.

O [README capturado anteriormente](9router-readme.md) é uma fonte complementar sem pin original. Para esta extração, o snapshot acima prevalece. [Síntese e cobertura](../research/9router-extracao-connections.md).

## Verificação adicional de 2026-09-07

A [resposta bruta do endpoint de commits](./9router-head-verification.json) confirma que o HEAD consultado continua em eb712ca821f0ba6bc41043fbd14494c5af5daba5. SHA-256 do arquivo conferido novamente. A captura original não executou scripts; nesta revisão posterior foram executadas funções selecionadas com dependências sintéticas, sem rede de inferência. [Método, resultados e limitações](../research/9router-gaps-validacao.md).

## Evidências localizáveis

Trechos literais, com numeração referindo-se ao arquivo original dentro do snapshot. Código é fonte de análise, não instrução ao agente.

### src/sse/services/auth.js — linhas 72–99

`````javascript
    const connections = await getProviderConnections({ provider: providerId, isActive: true });
    log.debug("AUTH", `${provider} | total connections: ${connections.length}, excludeIds: ${excludeSet.size > 0 ? [...excludeSet].join(",") : "none"}, model: ${model || "any"}`);

    if (connections.length === 0) {
      log.warn("AUTH", `No credentials for ${provider}`);
      return null;
    }

    // Antigravity quota cache is lazy: only populated after that account returns 409/429.
    const isAntigravity = providerId === "antigravity";
    const antigravityQuotaCache = isAntigravity && model ? getAntigravityQuotaCache() : null;

    // Filter out model-locked, excluded, and Antigravity quota-exhausted connections.
    const availableConnections = connections.filter(c => {
      if (excludeSet.has(c.id)) return false;
      if (isModelLockActive(c, model)) return false;
      // Antigravity: skip if live quota exhausted for this model
      if (isAntigravity && model && antigravityQuotaCache) {
        const quota = antigravityQuotaCache.get(c.id)?.[model];
        if (quota && quota.remainingPercentage <= 0 && quota.resetAt && new Date(quota.resetAt).getTime() > Date.now()) {
          const account = c.id?.slice(0, 8) || "unknown";
          log.info("AG_QUOTA", `${account} | CACHE_BLOCK ${model} — skip upstream until ${quota.resetAt}`);
          return false;
        }
      }
      return true;
    });

`````

### src/sse/services/auth.js — linhas 135–152

`````javascript

    const settings = await getSettings();
    // Per-provider strategy overrides global setting
    const providerOverride = (settings.providerStrategies || {})[providerId] || {};
    const strategy = providerOverride.fallbackStrategy || settings.fallbackStrategy || "fill-first";

    let connection;
    // Pin to preferred connection if specified and available
    if (preferredConnectionId) {
      connection = availableConnections.find((c) => c.id === preferredConnectionId);
      if (connection) {
        log.info("AUTH", `${provider} | pinned to ${connection.id?.slice(0, 8)} (${connection.name || connection.email || "unnamed"})`);
      }
    }
    if (connection) {
      // skip strategy
    } else if (strategy === "round-robin") {
      const stickyLimit = providerOverride.stickyRoundRobinLimit || settings.stickyRoundRobinLimit || 3;
`````

### src/lib/db/repos/connectionsRepo.js — linhas 5–12

`````javascript
const OPTIONAL_FIELDS = [
  "displayName", "email", "globalPriority", "defaultModel",
  "accessToken", "refreshToken", "expiresAt", "tokenType",
  "scope", "projectId", "apiKey", "testStatus",
  "lastTested", "lastError", "lastErrorAt", "rateLimitedUntil", "expiresIn", "errorCode",
  "consecutiveUseCount", "idToken", "lastRefreshAt",
];

`````

### open-sse/services/oauthCredentialManager.js — linhas 122–157

`````javascript

function getRefreshLockKey(provider, credentials) {
  const stableId =
    credentials?.connectionId ||
    credentials?.id ||
    credentials?.email ||
    credentials?.name ||
    credentials?.refreshToken?.slice?.(-16) ||
    "default";
  return `${provider}:${stableId}`;
}

export async function withCredentialRefreshLock(provider, credentials, refreshFn) {
  const key = getRefreshLockKey(provider, credentials);
  const existing = refreshLocks.get(key);
  if (existing) return existing;

  const pending = Promise.resolve()
    .then(refreshFn)
    .finally(() => {
      refreshLocks.delete(key);
    });

  refreshLocks.set(key, pending);
  return pending;
}

export async function refreshProviderCredentials(provider, credentials, log) {
  if (!credentials) return null;

  return withCredentialRefreshLock(provider, credentials, async () => {
    const refreshed = await refreshTokenByProvider(provider, credentials, log);
    return mergeRefreshedCredentials(provider, credentials, refreshed);
  });
}

`````

### open-sse/services/capacityAdapter.js — linhas 24–48

`````javascript
    return {
      enabled: entry.enabled !== false,
      roundRobin: !!entry.roundRobin,
      models: Array.isArray(entry.models) ? entry.models.filter(Boolean) : [],
    };
  }
  return { enabled: false, roundRobin: false, models: [] };
}

// Resolve one capability's full config. Enabled pools with no models fall back
// to DEFAULT_FALLBACK_MODEL so the toggle is never a no-op.
export function getCapacityAdapterConfig(cap, settings) {
  const entry = normalizeCapEntry(settings?.capacityAdapter?.[cap]);
  if (entry.enabled && entry.models.length === 0) {
    return { ...entry, models: [DEFAULT_FALLBACK_MODEL] };
  }
  return entry;
}

// Flatten enabled models across all capability pools, in priority order, deduped.
export function getCapacityAdapterModels(settings) {
  const seen = new Set();
  const models = [];
  for (const cap of CAPABILITY_KEYS) {
    const { enabled, models: pool } = getCapacityAdapterConfig(cap, settings);
`````

### src/lib/oauth/providers/codex.js — linhas 1–8

`````javascript
import { CODEX_CONFIG } from "../constants/oauth.js";
import { extractCodexAccountInfo, extractEmailFromAccessToken } from "../providerHelpers.js";

const codex = {
  config: CODEX_CONFIG,
  flowType: "authorization_code_pkce",
  fixedPort: CODEX_CONFIG.fixedPort,
  callbackPath: CODEX_CONFIG.callbackPath,
`````

### src/lib/oauth/providers/github.js — linhas 1–8

`````javascript
import { GITHUB_CONFIG } from "../constants/oauth.js";

const github = {
  config: GITHUB_CONFIG,
  flowType: "device_code",
  requestDeviceCode: async (config) => {
    const response = await fetch(config.deviceCodeUrl, {
      method: "POST",
`````

### open-sse/services/accountFallback.js — linhas 50–58

`````javascript
}

/**
 * Check if account is currently unavailable (cooldown not expired)
 */
export function isAccountUnavailable(unavailableUntil) {
  if (!unavailableUntil) return false;
  return new Date(unavailableUntil).getTime() > Date.now();
}
`````

## Arquivos selecionados para leitura técnica

- `open-sse/config/errorConfig.js`
- `open-sse/executors/base.js`
- `open-sse/executors/index.js`
- `open-sse/handlers/chatCore.js`
- `open-sse/handlers/chatCore/nonStreamingHandler.js`
- `open-sse/handlers/chatCore/streamingHandler.js`
- `open-sse/providers/capabilities.js`
- `open-sse/providers/registry/index.js`
- `open-sse/services/accountFallback.js`
- `open-sse/services/capacityAdapter.js`
- `open-sse/services/combo.js`
- `open-sse/services/compact.js`
- `open-sse/services/model.js`
- `open-sse/services/oauthCredentialManager.js`
- `open-sse/services/provider.js`
- `open-sse/services/tokenRefresh.js`
- `open-sse/services/tokenRefresh/dedup.js`
- `open-sse/services/usage.js`
- `open-sse/translator/index.js`
- `open-sse/utils/toolDeduper.js`
- `open-sse/utils/usageTracking.js`
- `src/app/api/oauth/[provider]/[action]/route.js`
- `src/app/api/providers/[id]/route.js`
- `src/app/api/providers/route.js`
- `src/lib/db/repos/apiKeysRepo.js`
- `src/lib/db/repos/combosRepo.js`
- `src/lib/db/repos/connectionsRepo.js`
- `src/lib/db/repos/usageRepo.js`
- `src/lib/db/schema.js`
- `src/lib/modelCatalog/sync.js`
- `src/lib/oauth/providers.js`
- `src/lib/oauth/providers/_shared.js`
- `src/lib/oauth/providers/claude.js`
- `src/lib/oauth/providers/codex.js`
- `src/lib/oauth/providers/github.js`
- `src/sse/handlers/chat.js`
- `src/sse/services/auth.js`
- `src/sse/services/backgroundTokenRefresh.js`
- `tests/package.json`

A leitura foi estática, focada nos contratos de roteamento, autenticação, persistência, consumo e tradução. Inventário integral não significa auditoria linha a linha nem validação operacional de todos os conectores.

## Inventário integral do snapshot

Caminhos relativos à raiz do repositório. Consultar o arquivo anexado para conteúdo literal de cada entrada.

`````text
.dockerignore
.env.example
.github/dependabot.yml
.github/workflows/docker-publish.yml
.github/workflows/gitbook-pages.yml
.gitignore
.npmignore
.vscode/settings.json
CHANGELOG.md
CLAUDE.md
DOCKER.md
Dockerfile
LICENSE
README.md
README.zh-CN.md
captain-definition
cli/.gitignore
cli/.npmignore
cli/LICENSE
cli/README.md
cli/cli.js
cli/hooks/postinstall.js
cli/hooks/sqliteRuntime.js
cli/hooks/trayRuntime.js
cli/package.json
cli/scripts/build-cli.js
cli/scripts/buildMitm.js
cli/src/cli/api/client.js
cli/src/cli/commands/xaiVideo.js
cli/src/cli/menus/apiKeys.js
cli/src/cli/menus/cliTools.js
cli/src/cli/menus/combos.js
cli/src/cli/menus/providers.js
cli/src/cli/menus/settings.js
cli/src/cli/terminalUI.js
cli/src/cli/tray/autostart.js
cli/src/cli/tray/icon.ico
cli/src/cli/tray/icon.png
cli/src/cli/tray/tray.js
cli/src/cli/tray/tray.ps1
cli/src/cli/tray/trayWin.js
cli/src/cli/utils/clipboard.js
cli/src/cli/utils/display.js
cli/src/cli/utils/endpoint.js
cli/src/cli/utils/format.js
cli/src/cli/utils/input.js
cli/src/cli/utils/menuHelper.js
cli/src/cli/utils/modelSelector.js
custom-server.js
docker-compose.yml
docs/ARCHITECTURE.md
docs/images/saml-admin-dashboard.png
docs/images/saml-login-screen.png
docs/superpowers/plans/2026-08-02-gpt-5-6-codex-reasoning-overrides.md
docs/superpowers/plans/2026-09-04-opencode-go-session-header.md
docs/superpowers/specs/2026-08-02-gpt-5-6-codex-reasoning-overrides-design.md
docs/superpowers/specs/2026-09-04-opencode-go-session-header-design.md
eslint.config.mjs
gitbook/.gitignore
gitbook/app/[lang]/[...slug]/page.js
gitbook/app/[lang]/page.js
gitbook/app/globals.css
gitbook/app/layout.js
gitbook/app/page.js
gitbook/components/DocsContent.js
gitbook/components/DocsHeader.js
gitbook/components/DocsLayout.js
gitbook/components/DocsSidebar.js
gitbook/components/DocsToc.js
gitbook/components/LanguageSwitcher.js
gitbook/constants/docsConfig.js
gitbook/constants/languages.js
gitbook/content/en/deployment/cloud.md
gitbook/content/en/deployment/localhost.md
gitbook/content/en/faq.md
gitbook/content/en/features/combos.md
gitbook/content/en/features/quota-tracking.md
gitbook/content/en/features/smart-routing.md
gitbook/content/en/getting-started/installation.md
gitbook/content/en/getting-started/quick-start.md
gitbook/content/en/index.md
gitbook/content/en/integration/claude-code.md
gitbook/content/en/integration/cline.md
gitbook/content/en/integration/codex.md
gitbook/content/en/integration/continue.md
gitbook/content/en/integration/cursor.md
gitbook/content/en/integration/other-tools.md
gitbook/content/en/integration/roo.md
gitbook/content/en/providers/cheap.md
gitbook/content/en/providers/free.md
gitbook/content/en/providers/subscription.md
gitbook/content/en/troubleshooting.md
gitbook/content/es/deployment/cloud.md
gitbook/content/es/deployment/localhost.md
gitbook/content/es/faq.md
gitbook/content/es/features/combos.md
gitbook/content/es/features/quota-tracking.md
gitbook/content/es/features/smart-routing.md
gitbook/content/es/getting-started/installation.md
gitbook/content/es/getting-started/quick-start.md
gitbook/content/es/index.md
gitbook/content/es/integration/claude-code.md
gitbook/content/es/integration/cline.md
gitbook/content/es/integration/codex.md
gitbook/content/es/integration/continue.md
gitbook/content/es/integration/cursor.md
gitbook/content/es/integration/other-tools.md
gitbook/content/es/integration/roo.md
gitbook/content/es/providers/cheap.md
gitbook/content/es/providers/free.md
gitbook/content/es/providers/subscription.md
gitbook/content/es/troubleshooting.md
gitbook/content/ja/deployment/cloud.md
gitbook/content/ja/deployment/localhost.md
gitbook/content/ja/faq.md
gitbook/content/ja/features/combos.md
gitbook/content/ja/features/quota-tracking.md
gitbook/content/ja/features/smart-routing.md
gitbook/content/ja/getting-started/installation.md
gitbook/content/ja/getting-started/quick-start.md
gitbook/content/ja/index.md
gitbook/content/ja/integration/claude-code.md
gitbook/content/ja/integration/cline.md
gitbook/content/ja/integration/codex.md
gitbook/content/ja/integration/continue.md
gitbook/content/ja/integration/cursor.md
gitbook/content/ja/integration/other-tools.md
gitbook/content/ja/integration/roo.md
gitbook/content/ja/providers/cheap.md
gitbook/content/ja/providers/free.md
gitbook/content/ja/providers/subscription.md
gitbook/content/ja/troubleshooting.md
gitbook/content/vi/deployment/cloud.md
gitbook/content/vi/deployment/localhost.md
gitbook/content/vi/faq.md
gitbook/content/vi/features/combos.md
gitbook/content/vi/features/quota-tracking.md
gitbook/content/vi/features/smart-routing.md
gitbook/content/vi/getting-started/installation.md
gitbook/content/vi/getting-started/quick-start.md
gitbook/content/vi/index.md
gitbook/content/vi/integration/claude-code.md
gitbook/content/vi/integration/cline.md
gitbook/content/vi/integration/codex.md
gitbook/content/vi/integration/continue.md
gitbook/content/vi/integration/cursor.md
gitbook/content/vi/integration/other-tools.md
gitbook/content/vi/integration/roo.md
gitbook/content/vi/providers/cheap.md
gitbook/content/vi/providers/free.md
gitbook/content/vi/providers/subscription.md
gitbook/content/vi/troubleshooting.md
gitbook/content/zh-CN/deployment/cloud.md
gitbook/content/zh-CN/deployment/localhost.md
gitbook/content/zh-CN/faq.md
gitbook/content/zh-CN/features/combos.md
gitbook/content/zh-CN/features/quota-tracking.md
gitbook/content/zh-CN/features/smart-routing.md
gitbook/content/zh-CN/getting-started/installation.md
gitbook/content/zh-CN/getting-started/quick-start.md
gitbook/content/zh-CN/index.md
gitbook/content/zh-CN/integration/claude-code.md
gitbook/content/zh-CN/integration/cline.md
gitbook/content/zh-CN/integration/codex.md
gitbook/content/zh-CN/integration/continue.md
gitbook/content/zh-CN/integration/cursor.md
gitbook/content/zh-CN/integration/other-tools.md
gitbook/content/zh-CN/integration/roo.md
gitbook/content/zh-CN/providers/cheap.md
gitbook/content/zh-CN/providers/free.md
gitbook/content/zh-CN/providers/subscription.md
gitbook/content/zh-CN/troubleshooting.md
gitbook/jsconfig.json
gitbook/lib/content.js
gitbook/next.config.mjs
gitbook/package.json
gitbook/postcss.config.mjs
gitbook/utils/markdown.js
i18n/README.es.md
i18n/README.fa_IR.md
i18n/README.fr.md
i18n/README.id-ID.md
i18n/README.ja-JP.md
i18n/README.pt-BR.md
i18n/README.ru.md
i18n/README.th.md
i18n/README.vi.md
i18n/README.zh-CN.md
images/9router.png
images/fusion-combo-ui.png
jsconfig.json
next.config.mjs
open-sse/.npmignore
open-sse/AGENTS.md
open-sse/config/appConstants.js
open-sse/config/codexInstructions.js
open-sse/config/constants.js
open-sse/config/defaultThinkingSignature.js
open-sse/config/errorConfig.js
open-sse/config/googleTtsLanguages.js
open-sse/config/grokCli.js
open-sse/config/kiroConstants.js
open-sse/config/mediaConfig.js
open-sse/config/models.js
open-sse/config/ollamaModels.js
open-sse/config/providerModels.js
open-sse/config/providers.js
open-sse/config/runtimeConfig.js
open-sse/config/ttsModels.js
open-sse/executors/antigravity.js
open-sse/executors/azure.js
open-sse/executors/base.js
open-sse/executors/codebuddy-cn.js
open-sse/executors/codebuddy-intl.js
open-sse/executors/codex.js
open-sse/executors/commandcode.js
open-sse/executors/cursor.js
open-sse/executors/default.js
open-sse/executors/devin-cli.js
open-sse/executors/gemini-cli.js
open-sse/executors/github.js
open-sse/executors/grok-cli.js
open-sse/executors/grok-web.js
open-sse/executors/iflow.js
open-sse/executors/index.js
open-sse/executors/kimchi.js
open-sse/executors/kiro.js
open-sse/executors/mimo-free.js
open-sse/executors/ollama-local.js
open-sse/executors/opencode-go.js
open-sse/executors/opencode.js
open-sse/executors/perplexity-web.js
open-sse/executors/qoder.js
open-sse/executors/trae.js
open-sse/executors/vertex.js
open-sse/executors/windsurf.js
open-sse/executors/xiaomi-tokenplan.js
open-sse/executors/zed.js
open-sse/handlers/chatCore.js
open-sse/handlers/chatCore/nonStreamingHandler.js
open-sse/handlers/chatCore/requestDetail.js
open-sse/handlers/chatCore/sseToJsonHandler.js
open-sse/handlers/chatCore/streamingHandler.js
open-sse/handlers/embeddingProviders/_base.js
open-sse/handlers/embeddingProviders/gemini.js
open-sse/handlers/embeddingProviders/index.js
open-sse/handlers/embeddingProviders/openai.js
open-sse/handlers/embeddingProviders/openaiCompatNode.js
open-sse/handlers/embeddingProviders/selfhostedEmbedding.js
open-sse/handlers/embeddingsCore.js
open-sse/handlers/fetch/index.js
open-sse/handlers/imageGenerationCore.js
open-sse/handlers/imageProviders/_base.js
open-sse/handlers/imageProviders/antigravity.js
open-sse/handlers/imageProviders/blackForestLabs.js
open-sse/handlers/imageProviders/cloudflareAi.js
open-sse/handlers/imageProviders/codex.js
open-sse/handlers/imageProviders/comfyui.js
open-sse/handlers/imageProviders/falAi.js
open-sse/handlers/imageProviders/gemini.js
open-sse/handlers/imageProviders/huggingface.js
open-sse/handlers/imageProviders/index.js
open-sse/handlers/imageProviders/nanobanana.js
open-sse/handlers/imageProviders/openai.js
open-sse/handlers/imageProviders/runwayml.js
open-sse/handlers/imageProviders/sdwebui.js
open-sse/handlers/imageProviders/stabilityAi.js
open-sse/handlers/responsesHandler.js
open-sse/handlers/search/callers.js
open-sse/handlers/search/chatSearch.js
open-sse/handlers/search/index.js
open-sse/handlers/search/normalizers.js
open-sse/handlers/sttCore.js
open-sse/handlers/ttsCore.js
open-sse/handlers/ttsProviders/_base.js
open-sse/handlers/ttsProviders/edgeTts.js
open-sse/handlers/ttsProviders/elevenlabs.js
open-sse/handlers/ttsProviders/gemini.js
open-sse/handlers/ttsProviders/genericFormats.js
open-sse/handlers/ttsProviders/googleTts.js
open-sse/handlers/ttsProviders/index.js
open-sse/handlers/ttsProviders/localDevice.js
open-sse/handlers/ttsProviders/minimax.js
open-sse/handlers/ttsProviders/openai.js
open-sse/handlers/ttsProviders/openrouter.js
open-sse/handlers/ttsProviders/selfhostedTts.js
open-sse/handlers/ttsProviders/xiaomi-mimo.js
open-sse/handlers/videoCore.js
open-sse/index.js
open-sse/providers/REGISTRY_TEMPLATE.js
open-sse/providers/capabilities.js
open-sse/providers/catalogOverride.js
open-sse/providers/index.js
open-sse/providers/models/helpers.js
open-sse/providers/models/namePatterns.js
open-sse/providers/models/schema.js
open-sse/providers/pricing.js
open-sse/providers/registry/alicode-intl.js
open-sse/providers/registry/alicode.js
open-sse/providers/registry/alims-intl.js
open-sse/providers/registry/alitp-intl.js
open-sse/providers/registry/anthropic.js
open-sse/providers/registry/antigravity.js
open-sse/providers/registry/api-airforce.js
open-sse/providers/registry/assemblyai.js
open-sse/providers/registry/aws-polly.js
open-sse/providers/registry/azure.js
open-sse/providers/registry/baidu.js
open-sse/providers/registry/bazaarlink.js
open-sse/providers/registry/black-forest-labs.js
open-sse/providers/registry/blackbox.js
open-sse/providers/registry/bluesminds.js
open-sse/providers/registry/brave-search.js
open-sse/providers/registry/byteplus.js
open-sse/providers/registry/cartesia.js
open-sse/providers/registry/cerebras.js
open-sse/providers/registry/chutes.js
open-sse/providers/registry/claude.js
open-sse/providers/registry/cline.js
open-sse/providers/registry/clinepass.js
open-sse/providers/registry/cloudflare-ai.js
open-sse/providers/registry/codebuddy-cn.js
open-sse/providers/registry/codebuddy-intl.js
open-sse/providers/registry/codex.js
open-sse/providers/registry/cohere.js
open-sse/providers/registry/comfyui.js
open-sse/providers/registry/commandcode.js
open-sse/providers/registry/coqui.js
open-sse/providers/registry/cursor.js
open-sse/providers/registry/deepgram.js
open-sse/providers/registry/deepseek.js
open-sse/providers/registry/devin-cli.js
open-sse/providers/registry/edge-tts.js
open-sse/providers/registry/elevenlabs.js
open-sse/providers/registry/exa.js
open-sse/providers/registry/fal-ai.js
open-sse/providers/registry/featherless.js
open-sse/providers/registry/firecrawl.js
open-sse/providers/registry/fireworks.js
open-sse/providers/registry/fish-audio.js
open-sse/providers/registry/gemini-cli.js
open-sse/providers/registry/gemini.js
open-sse/providers/registry/github.js
open-sse/providers/registry/gitlab.js
open-sse/providers/registry/glm-cn.js
open-sse/providers/registry/glm.js
open-sse/providers/registry/google-pse.js
open-sse/providers/registry/google-tts.js
open-sse/providers/registry/grok-cli.js
open-sse/providers/registry/grok-web.js
open-sse/providers/registry/groq.js
open-sse/providers/registry/huggingface.js
open-sse/providers/registry/hyperbolic.js
open-sse/providers/registry/iflow.js
open-sse/providers/registry/index.js
open-sse/providers/registry/inworld.js
open-sse/providers/registry/jina-ai.js
open-sse/providers/registry/jina-reader.js
open-sse/providers/registry/kilo-gateway.js
open-sse/providers/registry/kilocode.js
open-sse/providers/registry/kimchi.js
open-sse/providers/registry/kimi.js
open-sse/providers/registry/kiro.js
open-sse/providers/registry/linkup.js
open-sse/providers/registry/llm7.js
open-sse/providers/registry/local-device.js
open-sse/providers/registry/mimo-free.js
open-sse/providers/registry/minimax-cn.js
open-sse/providers/registry/minimax.js
open-sse/providers/registry/mistral.js
open-sse/providers/registry/mmf.js
open-sse/providers/registry/morph.js
open-sse/providers/registry/nanobanana.js
open-sse/providers/registry/nebius.js
open-sse/providers/registry/nvidia.js
open-sse/providers/registry/ollama-local.js
open-sse/providers/registry/ollama-search.js
open-sse/providers/registry/ollama.js
open-sse/providers/registry/openai.js
open-sse/providers/registry/opencode-go.js
open-sse/providers/registry/opencode.js
open-sse/providers/registry/openrouter.js
open-sse/providers/registry/perplexity-agent.js
open-sse/providers/registry/perplexity-web.js
open-sse/providers/registry/perplexity.js
open-sse/providers/registry/playht.js
open-sse/providers/registry/poolside.js
open-sse/providers/registry/qoder.js
open-sse/providers/registry/recraft.js
open-sse/providers/registry/runwayml.js
open-sse/providers/registry/sambanova.js
open-sse/providers/registry/sdwebui.js
open-sse/providers/registry/searchapi.js
open-sse/providers/registry/searxng.js
open-sse/providers/registry/selfhosted-embedding.js
open-sse/providers/registry/selfhosted-stt.js
open-sse/providers/registry/selfhosted-tts.js
open-sse/providers/registry/serper.js
open-sse/providers/registry/siliconflow.js
open-sse/providers/registry/stability-ai.js
open-sse/providers/registry/tavily.js
open-sse/providers/registry/tencent.js
open-sse/providers/registry/together.js
open-sse/providers/registry/tokenrouter.js
open-sse/providers/registry/topaz.js
open-sse/providers/registry/tortoise.js
open-sse/providers/registry/trae.js
open-sse/providers/registry/venice.js
open-sse/providers/registry/vercel-ai-gateway.js
open-sse/providers/registry/vertex-partner.js
open-sse/providers/registry/vertex.js
open-sse/providers/registry/volcengine-ark.js
open-sse/providers/registry/voyage-ai.js
open-sse/providers/registry/windsurf.js
open-sse/providers/registry/xai.js
open-sse/providers/registry/xiaomi-mimo.js
open-sse/providers/registry/xiaomi-tokenplan.js
open-sse/providers/registry/xquik.js
open-sse/providers/registry/youcom.js
open-sse/providers/registry/zed.js
open-sse/providers/schema.js
open-sse/providers/shared.js
open-sse/providers/thinkingLevels.js
open-sse/providers/visionPatterns.js
open-sse/rtk/applyFilter.js
open-sse/rtk/autodetect.js
open-sse/rtk/caveman.js
open-sse/rtk/cavemanPrompts.js
open-sse/rtk/constants.js
open-sse/rtk/filters/buildOutput.js
open-sse/rtk/filters/dedupLog.js
open-sse/rtk/filters/find.js
open-sse/rtk/filters/gitDiff.js
open-sse/rtk/filters/gitLog.js
open-sse/rtk/filters/gitStatus.js
open-sse/rtk/filters/grep.js
open-sse/rtk/filters/ls.js
open-sse/rtk/filters/readNumbered.js
open-sse/rtk/filters/searchList.js
open-sse/rtk/filters/smartTruncate.js
open-sse/rtk/filters/tree.js
open-sse/rtk/headroom.js
open-sse/rtk/index.js
open-sse/rtk/ponytail.js
open-sse/rtk/ponytailPrompt.js
open-sse/rtk/pxpipe.js
open-sse/rtk/registry.js
open-sse/rtk/systemInject.js
open-sse/services/accountFallback.js
open-sse/services/capacityAdapter.js
open-sse/services/clinepassModels.js
open-sse/services/combo.js
open-sse/services/compact.js
open-sse/services/copilotModels.js
open-sse/services/cursorModels.js
open-sse/services/grokCliModels.js
open-sse/services/kimchiModels.js
open-sse/services/kiroModels.js
open-sse/services/model.js
open-sse/services/oauthCredentialManager.js
open-sse/services/projectId.js
open-sse/services/provider.js
open-sse/services/qoderModels.js
open-sse/services/thoughtSignatureStore.js
open-sse/services/tokenRefresh.js
open-sse/services/tokenRefresh/dedup.js
open-sse/services/tokenRefresh/providers.js
open-sse/services/usage.js
open-sse/services/usage/claude.js
open-sse/services/usage/codebuddy-cn.js
open-sse/services/usage/codex.js
open-sse/services/usage/deepseek.js
open-sse/services/usage/github.js
open-sse/services/usage/glm.js
open-sse/services/usage/google.js
open-sse/services/usage/grok-cli.js
open-sse/services/usage/grokCliQuotaFrame.js
open-sse/services/usage/groq.js
open-sse/services/usage/kimi.js
open-sse/services/usage/kiro.js
open-sse/services/usage/minimax.js
open-sse/services/usage/misc.js
open-sse/services/usage/opencode-go.js
open-sse/services/usage/shared.js
open-sse/services/usage/zed.js
open-sse/shared/clineAuth.js
open-sse/shared/machineId.js
open-sse/shared/qoder/constants.js
open-sse/shared/qoder/cosy.js
open-sse/shared/qoder/encoding.js
open-sse/shared/zedAuth.js
open-sse/transformer/responsesTransformer.js
open-sse/transformer/streamToJsonConverter.js
open-sse/translator/concerns/chunk.js
open-sse/translator/concerns/finishReason.js
open-sse/translator/concerns/image.js
open-sse/translator/concerns/json.js
open-sse/translator/concerns/kiroConversation.js
open-sse/translator/concerns/message.js
open-sse/translator/concerns/modality.js
open-sse/translator/concerns/paramSupport.js
open-sse/translator/concerns/prefetch.js
open-sse/translator/concerns/reasoning.js
open-sse/translator/concerns/thinking.js
open-sse/translator/concerns/thinkingUnified.js
open-sse/translator/concerns/toolCall.js
open-sse/translator/concerns/usage.js
open-sse/translator/formats.js
open-sse/translator/formats/claude.js
open-sse/translator/formats/gemini.js
open-sse/translator/formats/maxTokens.js
open-sse/translator/formats/openai.js
open-sse/translator/formats/responsesApi.js
open-sse/translator/index.js
open-sse/translator/request/antigravity-to-openai.js
open-sse/translator/request/claude-to-kiro.js
open-sse/translator/request/claude-to-openai.js
open-sse/translator/request/gemini-to-openai.js
open-sse/translator/request/openai-responses.js
open-sse/translator/request/openai-to-claude.js
open-sse/translator/request/openai-to-commandcode.js
open-sse/translator/request/openai-to-cursor.js
open-sse/translator/request/openai-to-gemini.js
open-sse/translator/request/openai-to-kiro.js
open-sse/translator/request/openai-to-ollama.js
open-sse/translator/request/openai-to-vertex.js
open-sse/translator/response/claude-to-openai.js
open-sse/translator/response/commandcode-to-openai.js
open-sse/translator/response/cursor-to-openai.js
open-sse/translator/response/gemini-to-openai.js
open-sse/translator/response/kiro-to-claude.js
open-sse/translator/response/kiro-to-openai.js
open-sse/translator/response/ollama-to-openai.js
open-sse/translator/response/openai-responses.js
open-sse/translator/response/openai-to-antigravity.js
open-sse/translator/response/openai-to-claude.js
open-sse/translator/schema/blocks.js
open-sse/translator/schema/defaults.js
open-sse/translator/schema/finishReasons.js
open-sse/translator/schema/index.js
open-sse/translator/schema/roles.js
open-sse/utils/bypassHandler.js
open-sse/utils/claudeCloaking.js
open-sse/utils/claudeSignature.js
open-sse/utils/claudeToolTypeSelfCheck.mjs
open-sse/utils/clientDetector.js
open-sse/utils/cursorChecksum.js
open-sse/utils/cursorProtobuf.js
open-sse/utils/debugLog.js
open-sse/utils/error.js
open-sse/utils/kiroSessionReplay.js
open-sse/utils/modelMarkers.js
open-sse/utils/ollamaTransform.js
open-sse/utils/proxyFetch.js
open-sse/utils/reasoningContentInjector.js
open-sse/utils/requestLogger.js
open-sse/utils/responsesStreamHelpers.js
open-sse/utils/sessionManager.js
open-sse/utils/sse.js
open-sse/utils/sseConstants.js
open-sse/utils/stream.js
open-sse/utils/streamHandler.js
open-sse/utils/streamHelpers.js
open-sse/utils/toolDeduper.js
open-sse/utils/usageTracking.js
package.json
postcss.config.mjs
public/favicon.svg
public/file.svg
public/globe.svg
public/i18n/literals/ar.json
public/i18n/literals/bn.json
public/i18n/literals/cs.json
public/i18n/literals/da.json
public/i18n/literals/de.json
public/i18n/literals/el.json
public/i18n/literals/es.json
public/i18n/literals/fa.json
public/i18n/literals/fi.json
public/i18n/literals/fr.json
public/i18n/literals/he.json
public/i18n/literals/hi.json
public/i18n/literals/hu.json
public/i18n/literals/id.json
public/i18n/literals/it.json
public/i18n/literals/ja.json
public/i18n/literals/km.json
public/i18n/literals/ko.json
public/i18n/literals/nl.json
public/i18n/literals/no.json
public/i18n/literals/pl.json
public/i18n/literals/pt-BR.json
public/i18n/literals/pt-PT.json
public/i18n/literals/ro.json
public/i18n/literals/ru.json
public/i18n/literals/sv.json
public/i18n/literals/th.json
public/i18n/literals/tl.json
public/i18n/literals/tr.json
public/i18n/literals/uk.json
public/i18n/literals/ur.json
public/i18n/literals/vi.json
public/i18n/literals/zh-CN.json
public/i18n/literals/zh-TW.json
public/icons/icon-192.svg
public/icons/icon-512.svg
public/next.svg
public/providers/agentrouter.png
public/providers/alicode-intl.png
public/providers/alicode.png
public/providers/alims-intl.png
public/providers/alitp-intl.png
public/providers/amp.png
public/providers/anthropic-m.png
public/providers/anthropic.png
public/providers/antigravity.png
public/providers/api-airforce.png
public/providers/assemblyai.png
public/providers/aws-polly.png
public/providers/azure.png
public/providers/baidu.png
public/providers/bazaarlink.png
public/providers/black-forest-labs.png
public/providers/blackbox.png
public/providers/bluesminds.png
public/providers/brave-search.png
public/providers/byteplus.png
public/providers/cartesia.png
public/providers/cerebras.png
public/providers/chutes.png
public/providers/claude.png
public/providers/cline.png
public/providers/clinepass.png
public/providers/cloudflare-ai.png
public/providers/codebuddy-cn.png
public/providers/codebuddy-intl.png
public/providers/codex.png
public/providers/cohere.png
public/providers/comfyui.png
public/providers/commandcode.png
public/providers/continue.png
public/providers/copilot.png
public/providers/coqui.png
public/providers/cursor.png
public/providers/deepgram.png
public/providers/deepseek-tui.png
public/providers/deepseek.png
public/providers/devin-cli.png
public/providers/droid.png
public/providers/edge-tts.png
public/providers/elevenlabs.png
public/providers/exa.png
public/providers/fal-ai.png
public/providers/featherless.png
public/providers/firecrawl.png
public/providers/fireworks.png
public/providers/fish-audio.png
public/providers/gemini-cli.png
public/providers/gemini.png
public/providers/github.png
public/providers/gitlab.png
public/providers/glm-cn.png
public/providers/glm.png
public/providers/google-pse.png
public/providers/google-tts.png
public/providers/grok-cli.png
public/providers/grok-web.png
public/providers/groq.png
public/providers/hermes.png
public/providers/huggingface.png
public/providers/hyperbolic.png
public/providers/iflow.png
public/providers/inworld.png
public/providers/jcode.png
public/providers/jina-ai.png
public/providers/jina-reader.png
public/providers/kilo-gateway.png
public/providers/kilocode.png
public/providers/kimchi.png
public/providers/kimchi.svg
public/providers/kimi-coding.png
public/providers/kimi.png
public/providers/kiro.png
public/providers/linkup.png
public/providers/llm7.png
public/providers/local-device.png
public/providers/longcat.png
public/providers/mimo-free.png
public/providers/minimax-cn.png
public/providers/minimax.png
public/providers/mistral.png
public/providers/mmf.png
public/providers/morph.png
public/providers/nanobanana.png
public/providers/nebius.png
public/providers/novita.png
public/providers/nvidia.png
public/providers/oai-cc.png
public/providers/oai-r.png
public/providers/ollama-local.png
public/providers/ollama.png
public/providers/openai.png
public/providers/openclaw.png
public/providers/opencode-go.png
public/providers/opencode.png
public/providers/opendesign.png
public/providers/openrouter.png
public/providers/perplexity-agent.png
public/providers/perplexity-web.png
public/providers/perplexity.png
public/providers/playht.png
public/providers/poolside.png
public/providers/qoder.png
public/providers/qwen.png
public/providers/recraft.png
public/providers/reka.png
public/providers/roo.png
public/providers/runwayml.png
public/providers/sambanova.png
public/providers/sdwebui.png
public/providers/searchapi.png
public/providers/searxng.png
public/providers/selfhosted-embedding.png
public/providers/selfhosted-stt.png
public/providers/selfhosted-tts.png
public/providers/serper.png
public/providers/siliconflow.png
public/providers/stability-ai.png
public/providers/tavily.png
public/providers/tencent.png
public/providers/together.png
public/providers/tokenrouter.png
public/providers/topaz.png
public/providers/tortoise.png
public/providers/trae.png
public/providers/venice.png
public/providers/vercel-ai-gateway.png
public/providers/vercel.png
public/providers/vertex-partner.png
public/providers/vertex.png
public/providers/volcengine-ark.png
public/providers/voyage-ai.png
public/providers/windsurf.png
public/providers/workbuddy.png
public/providers/xai.png
public/providers/xiaomi-mimo.png
public/providers/xiaomi-tokenplan.png
public/providers/xquik.png
public/providers/youcom.png
public/providers/zed.png
public/sw.js
public/vercel.svg
public/window.svg
scripts/copy-standalone-assets.mjs
scripts/injectDisplayToRegistry.mjs
scripts/migrate-registry.mjs
scripts/test-combo-autoswitch.mjs
scripts/translate-readme.js
skills/9router-chat/SKILL.md
skills/9router-embeddings/SKILL.md
skills/9router-image/SKILL.md
skills/9router-stt/SKILL.md
skills/9router-tts/SKILL.md
skills/9router-video/SKILL.md
skills/9router-web-fetch/SKILL.md
skills/9router-web-search/SKILL.md
skills/9router/SKILL.md
skills/README.md
src/app/(dashboard)/dashboard/basic-chat/BasicChatPageClient.js
src/app/(dashboard)/dashboard/basic-chat/page.js
src/app/(dashboard)/dashboard/cli-tools/CLIToolsPageClient.js
src/app/(dashboard)/dashboard/cli-tools/[toolId]/ToolDetailClient.js
src/app/(dashboard)/dashboard/cli-tools/[toolId]/page.js
src/app/(dashboard)/dashboard/cli-tools/components/AntigravityToolCard.js
src/app/(dashboard)/dashboard/cli-tools/components/ApiKeySelect.js
src/app/(dashboard)/dashboard/cli-tools/components/BaseUrlSelect.js
src/app/(dashboard)/dashboard/cli-tools/components/ClaudeToolCard.js
src/app/(dashboard)/dashboard/cli-tools/components/ClineToolCard.js
src/app/(dashboard)/dashboard/cli-tools/components/CodexToolCard.js
src/app/(dashboard)/dashboard/cli-tools/components/CopilotToolCard.js
src/app/(dashboard)/dashboard/cli-tools/components/CoworkToolCard.js
src/app/(dashboard)/dashboard/cli-tools/components/DeepSeekTuiToolCard.js
src/app/(dashboard)/dashboard/cli-tools/components/DefaultToolCard.js
src/app/(dashboard)/dashboard/cli-tools/components/DroidToolCard.js
src/app/(dashboard)/dashboard/cli-tools/components/EndpointPresetControl.js
src/app/(dashboard)/dashboard/cli-tools/components/GrokBuildToolCard.js
src/app/(dashboard)/dashboard/cli-tools/components/HermesToolCard.js
src/app/(dashboard)/dashboard/cli-tools/components/JcodeToolCard.js
src/app/(dashboard)/dashboard/cli-tools/components/KiloToolCard.js
src/app/(dashboard)/dashboard/cli-tools/components/MitmLinkCard.js
src/app/(dashboard)/dashboard/cli-tools/components/MitmServerCard.js
src/app/(dashboard)/dashboard/cli-tools/components/MitmToolCard.js
src/app/(dashboard)/dashboard/cli-tools/components/OpenClawToolCard.js
src/app/(dashboard)/dashboard/cli-tools/components/OpenCodeToolCard.js
src/app/(dashboard)/dashboard/cli-tools/components/ToolSummaryCard.js
src/app/(dashboard)/dashboard/cli-tools/components/cliEndpointMatch.js
src/app/(dashboard)/dashboard/cli-tools/components/cliEndpointPresets.js
src/app/(dashboard)/dashboard/cli-tools/components/index.js
src/app/(dashboard)/dashboard/cli-tools/page.js
src/app/(dashboard)/dashboard/combos/page.js
src/app/(dashboard)/dashboard/console-log/ConsoleLogClient.js
src/app/(dashboard)/dashboard/console-log/page.js
src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.js
src/app/(dashboard)/dashboard/endpoint/components/EndpointRow.js
src/app/(dashboard)/dashboard/endpoint/components/SecurityWarning.js
src/app/(dashboard)/dashboard/endpoint/components/StatusAlert.js
src/app/(dashboard)/dashboard/endpoint/components/Tooltip.js
src/app/(dashboard)/dashboard/endpoint/endpointConstants.js
src/app/(dashboard)/dashboard/endpoint/endpointPing.js
src/app/(dashboard)/dashboard/endpoint/page.js
src/app/(dashboard)/dashboard/media-providers/[kind]/[id]/components/EmbeddingExampleCard.js
src/app/(dashboard)/dashboard/media-providers/[kind]/[id]/components/GenericExampleCard.js
src/app/(dashboard)/dashboard/media-providers/[kind]/[id]/components/SttExampleCard.js
src/app/(dashboard)/dashboard/media-providers/[kind]/[id]/components/TtsExampleCard.js
src/app/(dashboard)/dashboard/media-providers/[kind]/[id]/components/exampleShared.js
src/app/(dashboard)/dashboard/media-providers/[kind]/[id]/page.js
src/app/(dashboard)/dashboard/media-providers/[kind]/page.js
src/app/(dashboard)/dashboard/media-providers/combo/[id]/page.js
src/app/(dashboard)/dashboard/media-providers/web/page.js
src/app/(dashboard)/dashboard/mitm/MitmPageClient.js
src/app/(dashboard)/dashboard/mitm/page.js
src/app/(dashboard)/dashboard/page.js
src/app/(dashboard)/dashboard/profile/page.js
src/app/(dashboard)/dashboard/providers/[id]/AddApiKeyModal.js
src/app/(dashboard)/dashboard/providers/[id]/AddCustomModelModal.js
src/app/(dashboard)/dashboard/providers/[id]/BulkImportCodexModal.js
src/app/(dashboard)/dashboard/providers/[id]/BulkImportGrokCliModal.js
src/app/(dashboard)/dashboard/providers/[id]/CompatibleModelsSection.js
src/app/(dashboard)/dashboard/providers/[id]/ConnectionRow.js
src/app/(dashboard)/dashboard/providers/[id]/CooldownTimer.js
src/app/(dashboard)/dashboard/providers/[id]/EditCompatibleNodeModal.js
src/app/(dashboard)/dashboard/providers/[id]/ModelRow.js
src/app/(dashboard)/dashboard/providers/[id]/PassthroughModelsSection.js
src/app/(dashboard)/dashboard/providers/[id]/page.js
src/app/(dashboard)/dashboard/providers/components/AddCompatibleModal.js
src/app/(dashboard)/dashboard/providers/components/ConnectionsCard.js
src/app/(dashboard)/dashboard/providers/components/ModelAvailabilityBadge.js
src/app/(dashboard)/dashboard/providers/components/ModelsCard.js
src/app/(dashboard)/dashboard/providers/new/page.js
src/app/(dashboard)/dashboard/providers/page.js
src/app/(dashboard)/dashboard/providers/utils.js
src/app/(dashboard)/dashboard/proxy-pools/page.js
src/app/(dashboard)/dashboard/pxpipe/PxpipeClient.js
src/app/(dashboard)/dashboard/pxpipe/page.js
src/app/(dashboard)/dashboard/quota/page.js
src/app/(dashboard)/dashboard/skills/page.js
src/app/(dashboard)/dashboard/token-saver/TokenSaverClient.js
src/app/(dashboard)/dashboard/token-saver/page.js
src/app/(dashboard)/dashboard/translator/page.js
src/app/(dashboard)/dashboard/usage/components/OverviewCards.js
src/app/(dashboard)/dashboard/usage/components/ProviderLimits/ProviderLimitCard.js
src/app/(dashboard)/dashboard/usage/components/ProviderLimits/QuotaProgressBar.js
src/app/(dashboard)/dashboard/usage/components/ProviderLimits/QuotaTable.js
src/app/(dashboard)/dashboard/usage/components/ProviderLimits/index.js
src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.js
src/app/(dashboard)/dashboard/usage/components/ProviderTopology.js
src/app/(dashboard)/dashboard/usage/components/RequestDetailsTab.js
src/app/(dashboard)/dashboard/usage/components/UsageChart.js
src/app/(dashboard)/dashboard/usage/components/UsageTable.js
src/app/(dashboard)/dashboard/usage/page.js
src/app/(dashboard)/layout.js
src/app/api/auth/login/route.js
src/app/api/auth/logout/route.js
src/app/api/auth/oidc/callback/route.js
src/app/api/auth/oidc/start/route.js
src/app/api/auth/oidc/test/route.js
src/app/api/auth/reset-password/route.js
src/app/api/auth/saml/acs/route.js
src/app/api/auth/saml/metadata/route.js
src/app/api/auth/saml/start/route.js
src/app/api/auth/saml/test/route.js
src/app/api/auth/status/route.js
src/app/api/cli-tools/all-statuses/route.js
src/app/api/cli-tools/antigravity-mitm/alias/route.js
src/app/api/cli-tools/antigravity-mitm/route.js
src/app/api/cli-tools/claude-settings/route.js
src/app/api/cli-tools/cline-settings/route.js
src/app/api/cli-tools/codex-settings/route.js
src/app/api/cli-tools/copilot-settings/route.js
src/app/api/cli-tools/cowork-mcp-registry/route.js
src/app/api/cli-tools/cowork-mcp-tools/route.js
src/app/api/cli-tools/cowork-settings/route.js
src/app/api/cli-tools/deepseek-tui-settings/route.js
src/app/api/cli-tools/devin-settings/route.js
src/app/api/cli-tools/droid-settings/route.js
src/app/api/cli-tools/grok-build-settings/route.js
src/app/api/cli-tools/hermes-settings/route.js
src/app/api/cli-tools/jcode-settings/route.js
src/app/api/cli-tools/kilo-settings/route.js
src/app/api/cli-tools/openclaw-settings/route.js
src/app/api/cli-tools/opencode-settings/route.js
src/app/api/combos/[id]/route.js
src/app/api/combos/route.js
src/app/api/headroom/extras/route.js
src/app/api/headroom/proxy/[...path]/route.js
src/app/api/headroom/restart/route.js
src/app/api/headroom/start/route.js
src/app/api/headroom/status/route.js
src/app/api/headroom/stop/route.js
src/app/api/health/route.js
src/app/api/init/route.js
src/app/api/keys/[id]/route.js
src/app/api/keys/route.js
src/app/api/locale/route.js
src/app/api/mcp/[plugin]/message/route.js
src/app/api/mcp/[plugin]/sse/route.js
src/app/api/media-providers/tts/deepgram/voices/route.js
src/app/api/media-providers/tts/elevenlabs/voices/route.js
src/app/api/media-providers/tts/inworld/voices/route.js
src/app/api/media-providers/tts/minimax/voices/route.js
src/app/api/media-providers/tts/voices/route.js
src/app/api/models/alias/route.js
src/app/api/models/availability/route.js
src/app/api/models/catalog-sync/route.js
src/app/api/models/custom/route.js
src/app/api/models/disabled/route.js
src/app/api/models/route.js
src/app/api/models/test/ping.js
src/app/api/models/test/route.js
src/app/api/oauth/[provider]/[action]/route.js
src/app/api/oauth/codex/bulk-import/route.js
src/app/api/oauth/codex/import-token/route.js
src/app/api/oauth/cursor/auto-import/route.js
src/app/api/oauth/cursor/import/route.js
src/app/api/oauth/gitlab/pat/route.js
src/app/api/oauth/grok-cli/bulk-import/route.js
src/app/api/oauth/iflow/cookie/route.js
src/app/api/oauth/kiro/api-key/route.js
src/app/api/oauth/kiro/auto-import/route.js
src/app/api/oauth/kiro/import-cli-proxy/route.js
src/app/api/oauth/kiro/import/route.js
src/app/api/oauth/kiro/social-authorize/route.js
src/app/api/oauth/kiro/social-exchange/route.js
src/app/api/pricing/route.js
src/app/api/provider-nodes/[id]/route.js
src/app/api/provider-nodes/route.js
src/app/api/provider-nodes/validate/route.js
src/app/api/providers/[id]/models/route.js
src/app/api/providers/[id]/route.js
src/app/api/providers/[id]/test-models/route.js
src/app/api/providers/[id]/test/route.js
src/app/api/providers/[id]/test/testUtils.js
src/app/api/providers/client/route.js
src/app/api/providers/kilo/free-models/route.js
src/app/api/providers/route.js
src/app/api/providers/suggested-models/filters.js
src/app/api/providers/suggested-models/route.js
src/app/api/providers/test-batch/route.js
src/app/api/providers/validate/route.js
src/app/api/proxy-pools/[id]/route.js
src/app/api/proxy-pools/[id]/test/route.js
src/app/api/proxy-pools/cloudflare-deploy/route.js
src/app/api/proxy-pools/deno-deploy/route.js
src/app/api/proxy-pools/route.js
src/app/api/proxy-pools/vercel-deploy/route.js
src/app/api/pxpipe/health/route.js
src/app/api/pxpipe/install/route.js
src/app/api/pxpipe/logs/route.js
src/app/api/pxpipe/restart/route.js
src/app/api/pxpipe/start/route.js
src/app/api/pxpipe/stats/route.js
src/app/api/pxpipe/status/route.js
src/app/api/pxpipe/stop/route.js
src/app/api/settings/database/route.js
src/app/api/settings/proxy-test/route.js
src/app/api/settings/require-login/route.js
src/app/api/settings/route.js
src/app/api/shutdown/route.js
src/app/api/tags/route.js
src/app/api/translator/console-logs/route.js
src/app/api/translator/console-logs/stream/route.js
src/app/api/translator/load/route.js
src/app/api/translator/save/route.js
src/app/api/translator/send/route.js
src/app/api/translator/translate/route.js
src/app/api/tunnel/disable/route.js
src/app/api/tunnel/enable/route.js
src/app/api/tunnel/status/route.js
src/app/api/tunnel/tailscale-check/route.js
src/app/api/tunnel/tailscale-disable/route.js
src/app/api/tunnel/tailscale-enable/route.js
src/app/api/tunnel/tailscale-install/route.js
src/app/api/usage/[connectionId]/codex-reset-credits/route.js
src/app/api/usage/[connectionId]/route.js
src/app/api/usage/chart/route.js
src/app/api/usage/history/route.js
src/app/api/usage/logs/route.js
src/app/api/usage/providers/route.js
src/app/api/usage/request-details/route.js
src/app/api/usage/request-logs/route.js
src/app/api/usage/stats/route.js
src/app/api/usage/stream/route.js
src/app/api/v1/api/chat/route.js
src/app/api/v1/audio/speech/route.js
src/app/api/v1/audio/transcriptions/route.js
src/app/api/v1/audio/voices/route.js
src/app/api/v1/chat/completions/route.js
src/app/api/v1/embeddings/route.js
src/app/api/v1/images/generations/route.js
src/app/api/v1/messages/count_tokens/route.js
src/app/api/v1/messages/route.js
src/app/api/v1/models/[...model]/route.js
src/app/api/v1/models/info/route.js
src/app/api/v1/models/route.js
src/app/api/v1/responses/compact/route.js
src/app/api/v1/responses/route.js
src/app/api/v1/route.js
src/app/api/v1/search/route.js
src/app/api/v1/videos/[id]/route.js
src/app/api/v1/videos/edits/route.js
src/app/api/v1/videos/extensions/route.js
src/app/api/v1/videos/generations/route.js
src/app/api/v1/web/fetch/route.js
src/app/api/v1beta/models/[...path]/route.js
src/app/api/v1beta/models/route.js
src/app/api/version/route.js
src/app/api/version/shutdown/route.js
src/app/api/version/update/route.js
src/app/callback/page.js
src/app/dashboard/settings/pricing/page.js
src/app/favicon.ico
src/app/globals.css
src/app/landing/components/AnimatedBackground.js
src/app/landing/components/Features.js
src/app/landing/components/FlowAnimation.js
src/app/landing/components/Footer.js
src/app/landing/components/GetStarted.js
src/app/landing/components/HeroSection.js
src/app/landing/components/HowItWorks.js
src/app/landing/components/Navigation.js
src/app/landing/page.js
src/app/layout.js
src/app/login/page.js
src/app/manifest.js
src/app/page.js
src/dashboardGuard.js
src/i18n/RuntimeI18nProvider.js
src/i18n/config.js
src/i18n/runtime.js
src/instrumentation.js
src/lib/appUpdater.js
src/lib/auth/dashboardSession.js
src/lib/auth/loginLimiter.js
src/lib/auth/oidc.js
src/lib/auth/saml.js
src/lib/auth/trustedPeer.js
src/lib/consoleLogBuffer.js
src/lib/dataDir.js
src/lib/db/adapters/betterSqliteAdapter.js
src/lib/db/adapters/bunSqliteAdapter.js
src/lib/db/adapters/nodeSqliteAdapter.js
src/lib/db/adapters/sqljsAdapter.js
src/lib/db/backup.js
src/lib/db/driver.js
src/lib/db/helpers/jsonCol.js
src/lib/db/helpers/kvStore.js
src/lib/db/helpers/metaStore.js
src/lib/db/index.js
src/lib/db/migrate.js
src/lib/db/migrations/001-initial.js
src/lib/db/migrations/index.js
src/lib/db/paths.js
src/lib/db/repos/aliasRepo.js
src/lib/db/repos/apiKeysRepo.js
src/lib/db/repos/combosRepo.js
src/lib/db/repos/connectionsRepo.js
src/lib/db/repos/disabledModelsRepo.js
src/lib/db/repos/nodesRepo.js
src/lib/db/repos/pricingRepo.js
src/lib/db/repos/proxyPoolsRepo.js
src/lib/db/repos/requestDetailsRepo.js
src/lib/db/repos/settingsRepo.js
src/lib/db/repos/usageRepo.js
src/lib/db/schema.js
src/lib/db/version.js
src/lib/disabledModelsDb.js
src/lib/grokBuildConfig.js
src/lib/headroom/detect.js
src/lib/headroom/process.js
src/lib/localDb.js
src/lib/mcp/stdioSseBridge.js
src/lib/mitmAliasCache.js
src/lib/modelCatalog/sync.js
src/lib/network/connectionProxy.js
src/lib/network/initOutboundProxy.js
src/lib/network/outboundProxy.js
src/lib/network/proxyTest.js
src/lib/oauth/constants/oauth.js
src/lib/oauth/constants/xai.js
src/lib/oauth/kiroExternalIdp.js
src/lib/oauth/providerHelpers.js
src/lib/oauth/providers.js
src/lib/oauth/providers/_shared.js
src/lib/oauth/providers/antigravity.js
src/lib/oauth/providers/claude.js
src/lib/oauth/providers/cline.js
src/lib/oauth/providers/clinepass.js
src/lib/oauth/providers/codebuddy-cn.js
src/lib/oauth/providers/codebuddy-intl.js
src/lib/oauth/providers/codex.js
src/lib/oauth/providers/cursor.js
src/lib/oauth/providers/gemini-cli.js
src/lib/oauth/providers/github.js
src/lib/oauth/providers/gitlab.js
src/lib/oauth/providers/grok-cli.js
src/lib/oauth/providers/iflow.js
src/lib/oauth/providers/index.js
src/lib/oauth/providers/kilocode.js
src/lib/oauth/providers/kimchi.js
src/lib/oauth/providers/kimi.js
src/lib/oauth/providers/kiro.js
src/lib/oauth/providers/qoder.js
src/lib/oauth/providers/trae.js
src/lib/oauth/providers/windsurf.js
src/lib/oauth/providers/xai.js
src/lib/oauth/providers/zed.js
src/lib/oauth/services/antigravity.js
src/lib/oauth/services/claude.js
src/lib/oauth/services/codex.js
src/lib/oauth/services/cursor.js
src/lib/oauth/services/gemini.js
src/lib/oauth/services/github.js
src/lib/oauth/services/iflow.js
src/lib/oauth/services/index.js
src/lib/oauth/services/kimchi.js
src/lib/oauth/services/kiro.js
src/lib/oauth/services/oauth.js
src/lib/oauth/services/openai.js
src/lib/oauth/services/qoder.js
src/lib/oauth/services/xai.js
src/lib/oauth/utils/banner.js
src/lib/oauth/utils/ideDetect.js
src/lib/oauth/utils/pkce.js
src/lib/oauth/utils/server.js
src/lib/oauth/utils/ui.js
src/lib/providerNormalization.js
src/lib/pxpipe/events.js
src/lib/pxpipe/install.js
src/lib/pxpipe/loader.js
src/lib/pxpipe/service.js
src/lib/qoder/constants.js
src/lib/qoder/cosy.js
src/lib/qoder/encoding.js
src/lib/requestDetailsDb.js
src/lib/tunnel/cloudflare/cloudflared.js
src/lib/tunnel/cloudflare/config.js
src/lib/tunnel/cloudflare/healthCheck.js
src/lib/tunnel/cloudflare/manager.js
src/lib/tunnel/cloudflare/pid.js
src/lib/tunnel/index.js
src/lib/tunnel/shared/dnsResolver.js
src/lib/tunnel/shared/internetCheck.js
src/lib/tunnel/shared/state.js
src/lib/tunnel/shared/watchdogConfig.js
src/lib/tunnel/tailscale/config.js
src/lib/tunnel/tailscale/healthCheck.js
src/lib/tunnel/tailscale/manager.js
src/lib/tunnel/tailscale/tailscale.js
src/lib/updater/updater.js
src/lib/usageDb.js
src/mitm/antigravityIdeVersion.js
src/mitm/cert/generate.js
src/mitm/cert/install.js
src/mitm/cert/rootCA.js
src/mitm/config.js
src/mitm/dbReader.js
src/mitm/dns/dnsConfig.js
src/mitm/handlers/antigravity.js
src/mitm/handlers/base.js
src/mitm/handlers/copilot.js
src/mitm/handlers/cursor.js
src/mitm/handlers/kiro.js
src/mitm/logger.js
src/mitm/manager.js
src/mitm/paths.js
src/mitm/server.js
src/mitm/winElevated.js
src/models/index.js
src/proxy.js
src/shared/components/AddCustomEmbeddingModal.js
src/shared/components/Avatar.js
src/shared/components/Badge.js
src/shared/components/Button.js
src/shared/components/CapacityBadges.js
src/shared/components/Card.js
src/shared/components/ChangelogModal.js
src/shared/components/ComboFormModal.js
src/shared/components/CursorAuthModal.js
src/shared/components/DonateModal.js
src/shared/components/Drawer.js
src/shared/components/EditConnectionModal.js
src/shared/components/Footer.js
src/shared/components/GitLabAuthModal.js
src/shared/components/Header.js
src/shared/components/HeaderLanguage.js
src/shared/components/HeaderMenu.js
src/shared/components/IFlowCookieModal.js
src/shared/components/Input.js
src/shared/components/KiroAuthModal.js
src/shared/components/KiroOAuthWrapper.js
src/shared/components/KiroSocialOAuthModal.js
src/shared/components/LanguageSwitcher.js
src/shared/components/Loading.js
src/shared/components/ManualConfigModal.js
src/shared/components/McpMarketplaceModal.js
src/shared/components/Modal.js
src/shared/components/ModelSelectModal.js
src/shared/components/NineRemoteButton.js
src/shared/components/NineRemotePromoModal.js
src/shared/components/NoAuthProxyCard.js
src/shared/components/OAuthModal.js
src/shared/components/Pagination.js
src/shared/components/PricingModal.js
src/shared/components/ProviderIcon.js
src/shared/components/ProviderInfoCard.js
src/shared/components/RequestLogger.js
src/shared/components/SegmentedControl.js
src/shared/components/Select.js
src/shared/components/Sidebar.js
src/shared/components/ThemeProvider.js
src/shared/components/ThemeToggle.js
src/shared/components/Toggle.js
src/shared/components/Tooltip.js
src/shared/components/UsageStats.js
src/shared/components/index.js
src/shared/components/layouts/AuthLayout.js
src/shared/components/layouts/DashboardLayout.js
src/shared/components/layouts/index.js
src/shared/constants/cliTools.js
src/shared/constants/colors.js
src/shared/constants/config.js
src/shared/constants/coworkPlugins.js
src/shared/constants/index.js
src/shared/constants/locales.js
src/shared/constants/mitmToolHosts.js
src/shared/constants/models.js
src/shared/constants/providers.js
src/shared/constants/providersDisplay.js
src/shared/constants/skills.js
src/shared/constants/ttsProviders.js
src/shared/hooks/index.js
src/shared/hooks/useCopyToClipboard.js
src/shared/hooks/useModelCaps.js
src/shared/hooks/useTheme.js
src/shared/services/bootstrap.js
src/shared/services/initializeApp.js
src/shared/services/quotaAutoPing.js
src/shared/utils/api.js
src/shared/utils/apiKey.js
src/shared/utils/bulkAdd.js
src/shared/utils/clineAuth.js
src/shared/utils/cn.js
src/shared/utils/connectionStatus.js
src/shared/utils/index.js
src/shared/utils/machine.js
src/shared/utils/machineId.js
src/shared/utils/providerCustomModels.js
src/shared/utils/providerIcon.js
src/shared/utils/providerModelsFetcher.js
src/shared/utils/ssrfGuard.js
src/sse/handlers/chat.js
src/sse/handlers/embeddings.js
src/sse/handlers/fetch.js
src/sse/handlers/imageGeneration.js
src/sse/handlers/search.js
src/sse/handlers/stt.js
src/sse/handlers/tts.js
src/sse/handlers/videoGeneration.js
src/sse/services/antigravityQuota.js
src/sse/services/auth.js
src/sse/services/backgroundTokenRefresh.js
src/sse/services/model.js
src/sse/services/tokenRefresh.js
src/sse/utils/logger.js
src/store/headerSearchStore.js
src/store/index.js
src/store/notificationStore.js
src/store/providerStore.js
src/store/settingsStore.js
src/store/themeStore.js
src/store/userStore.js
start.sh
tests/.gitignore
tests/README.md
tests/__baseline__/alias-baseline.json
tests/__baseline__/baseline-results.json
tests/__baseline__/current.json
tests/__baseline__/known-fails.txt
tests/__baseline__/oauth-urls-baseline.json
tests/__baseline__/providers-baseline.json
tests/__baseline__/snapshot-providers.mjs
tests/__baseline__/verify-alias.mjs
tests/__baseline__/verify-no-regression.mjs
tests/__baseline__/verify-oauth-urls.mjs
tests/__baseline__/verify-providers.mjs
tests/auth/saml.test.js
tests/package.json
tests/translator/AGENTS.md
tests/translator/__snapshots__/golden-request.test.js.snap
tests/translator/__snapshots__/golden-response-stream.test.js.snap
tests/translator/__snapshots__/golden-translator-concerns.test.js.snap
tests/translator/bugs-antigravity.test.js
tests/translator/bugs-claudeCode-context.test.js
tests/translator/bugs-codexCli-responses.test.js
tests/translator/bugs-gemini-cursor-commandcode.test.js
tests/translator/bugs-kiro.test.js
tests/translator/bugs-openai-bridge.test.js
tests/translator/bugs-toClaude-context.test.js
tests/translator/claude-claude-stream-decloak.test.js
tests/translator/claude-kiro-direct.test.js
tests/translator/coverage-all-models.test.js
tests/translator/format-roundtrip.test.js
tests/translator/golden-request.test.js
tests/translator/golden-response-stream.test.js
tests/translator/golden-translator-concerns.test.js
tests/translator/golden-url-header.test.js
tests/translator/matrix.js
tests/translator/real/all-formats.real.test.js
tests/translator/real/antigravity-models.real.test.js
tests/translator/real/file-base64-survey.real.test.js
tests/translator/real/nvidia-thinking.e2e.test.js
tests/translator/real/provider-cases.real.test.js
tests/translator/real/smoke-providers.real.test.js
tests/translator/real/thinking.real.test.js
tests/translator/real/vision-capability-survey.real.test.js
tests/translator/registerAll.js
tests/translator/thinking-unified.test.js
tests/unit/alibaba-token-plan-provider.test.js
tests/unit/alicode-cache-control-2069.test.js
tests/unit/alicode-intl-endpoint-2591.test.js
tests/unit/antigravity-cache.test.js
tests/unit/antigravity-ide-version.test.js
tests/unit/antigravity-mitm.test.js
tests/unit/antigravity-nonstream-usage-3260.test.js
tests/unit/antigravity-oauth-client.test.js
tests/unit/antigravity-quota-gemini-3.6.test.js
tests/unit/antigravity-quota-gemini-3.7.test.js
tests/unit/antigravity-quota-gemini-3.8.test.js
tests/unit/antigravity-quota-routing.test.js
tests/unit/antigravity-retry-hook.test.js
tests/unit/antigravity-stream-options.test.js
tests/unit/antigravity-usage-headers.test.js
tests/unit/auth-status.test.js
tests/unit/background-token-refresh.test.js
tests/unit/base-executor-retry.test.js
tests/unit/buildOutputFilter.test.js
tests/unit/buildOutputFilterAdversarial.test.js
tests/unit/bulk-add-names.test.js
tests/unit/cached-token-e2e.test.js
tests/unit/cached-token-usage.test.js
tests/unit/capabilities-opus-context.test.js
tests/unit/capabilities-service-kind.test.js
tests/unit/capabilities.test.js
tests/unit/caveman-prompts.test.js
tests/unit/claude-cloaking.test.js
tests/unit/claude-foreign-server-tool-use.test.js
tests/unit/claude-header-forwarding.test.js
tests/unit/cli-build-artifacts.test.js
tests/unit/cli-xai-video.test.js
tests/unit/codebuddy-cn-bonus-recurring.test.js
tests/unit/codebuddy-reasoning-optin.test.js
tests/unit/codex-fast-capacity.test.js
tests/unit/codex-image-fetch.test.js
tests/unit/codex-image-models.test.js
tests/unit/codex-native-passthrough-thinking.test.js
tests/unit/codex-refresh-token.test.js
tests/unit/codex-reset-credits.test.js
tests/unit/codex-spark-quota-tracking.test.js
tests/unit/codex-tool-normalization.test.js
tests/unit/combo-autoswitch.test.js
tests/unit/combo-fusion.test.js
tests/unit/combo-routing.test.js
tests/unit/commandcode-executor.test.js
tests/unit/commandcode-to-openai.test.js
tests/unit/compatible-provider-connections.test.js
tests/unit/continuity-strip.test.js
tests/unit/count-tokens.test.js
tests/unit/cowork-mcp-ssrf-guard.test.js
tests/unit/cursor-agent-exec-request.test.js
tests/unit/cursor-agent-proto.test.js
tests/unit/cursor-composer-thinking.test.js
tests/unit/cursor-models.test.js
tests/unit/custom-server-h2c.test.cjs
tests/unit/custom-server-peer-headers.test.js
tests/unit/dashboard-guard.test.js
tests/unit/db-benchmark.test.js
tests/unit/db-concurrent.test.js
tests/unit/db-driver-chain.test.js
tests/unit/db-migration-chain.test.js
tests/unit/db-sqlite-vs-lowdb.test.js
tests/unit/deepseek-usage.test.js
tests/unit/defer-loading-cache-control.test.js
tests/unit/devin-cli-executor.test.js
tests/unit/embedding-usage-persistence.test.js
tests/unit/embeddings.cloud.test.js
tests/unit/embeddingsCore.test.js
tests/unit/executor-const-guard.test.js
tests/unit/extract-usage-cache-shapes.test.js
tests/unit/fetch-success-clears-account.test.js
tests/unit/file-block-routing.test.js
tests/unit/finish-reason-concern.test.js
tests/unit/fish-audio-tts.test.js
tests/unit/force-stream-config.test.js
tests/unit/fusion-strip-stream-options-3024.test.js
tests/unit/gemini-3.7-antigravity.test.js
tests/unit/gemini-3.8-antigravity.test.js
tests/unit/gemini-36-integration.test.js
tests/unit/gemini-37-integration.test.js
tests/unit/gemini-38-integration.test.js
tests/unit/gemini-native-endpoint.test.js
tests/unit/gemini-tts.test.js
tests/unit/gemini-usage-projectid.test.js
tests/unit/github-monthly-usage-lock.test.js
tests/unit/github-responses-routing.test.js
tests/unit/glm-usage.test.js
tests/unit/grok-build-config.test.js
tests/unit/grok-cli-executor.test.js
tests/unit/grok-cli-expiresat-2546.test.js
tests/unit/grok-cli-models.test.js
tests/unit/grok-cli-oauth-probe.test.js
tests/unit/grok-cli-quota-frame.test.js
tests/unit/grok-cli-usage.test.js
tests/unit/groq-usage.test.js
tests/unit/headroom-chat-core.test.js
tests/unit/headroom-detect.test.js
tests/unit/headroom-responses-format.test.js
tests/unit/headroom.test.js
tests/unit/hermes-vision-detection.test.js
tests/unit/hf-model-routing.test.js
tests/unit/image-fetch-hardening.test.js
tests/unit/image-generation.test.js
tests/unit/jina-reader-fetch.test.js
tests/unit/kimchi-strip-reasoning.test.js
tests/unit/kimchi.test.js
tests/unit/kimi-usage.test.js
tests/unit/kiro-api-key-endpoint-routing.test.js
tests/unit/kiro-conversation-canonicalization.test.js
tests/unit/kiro-external-idp.test.js
tests/unit/kiro-image-forwarding.test.js
tests/unit/kiro-model-slots.test.js
tests/unit/kiro-nonstream-error.test.js
tests/unit/kiro-profile-arn.test.js
tests/unit/kiro-terminal-integrity.test.js
tests/unit/kiro-thinking-strip.test.js
tests/unit/kiro-usage-and-tool-integrity.test.js
tests/unit/local-request-peer-trust-3294.test.js
tests/unit/mimo-free.live.test.js
tests/unit/mimo-free.test.js
tests/unit/minimax-transport-target-format.test.js
tests/unit/minimax-tts.test.js
tests/unit/minimax-usage.test.js
tests/unit/minimax-voices.test.js
tests/unit/mitm-root-ca.test.js
tests/unit/modality-strip.test.js
tests/unit/model-context-marker.test.js
tests/unit/model-name-regex.test.js
tests/unit/model-routing.test.js
tests/unit/model-test-routing.test.js
tests/unit/multimodal-drop-lock.test.js
tests/unit/oauth-cursor-auto-import.test.js
tests/unit/ollama-stream-tail.test.js
tests/unit/ollama-usage.test.js
tests/unit/ollama-web-fetch-provider.test.js
tests/unit/open-package-external.test.js
tests/unit/openai-compatible-apitype-resolution.test.js
tests/unit/openai-responses-custom-tools.test.js
tests/unit/openai-responses-empty-toolcalls.test.js
tests/unit/openai-responses-multiturn.test.js
tests/unit/openai-responses-nonstream.test.js
tests/unit/openai-responses-terminal-event.test.js
tests/unit/openai-to-claude-response-tools.test.js
tests/unit/openai-to-claude-tools-no-type.test.js
tests/unit/openai-to-claude.test.js
tests/unit/openai-to-commandcode.test.js
tests/unit/openai-to-kiro.test.js
tests/unit/openai-to-ollama-malformed.test.js
tests/unit/opencode-go-models.test.js
tests/unit/opencode-go-muse-spark-responses.test.js
tests/unit/opencode-go-session.test.js
tests/unit/opencode-go-usage.test.js
tests/unit/opencode-muse-spark-thinking.test.js
tests/unit/param-support.test.js
tests/unit/perplexity-web.test.js
tests/unit/ping-reasoning-models-3010.test.js
tests/unit/prefetch-images.test.js
tests/unit/provider-custom-models.test.js
tests/unit/provider-display-split.test.js
tests/unit/provider-models-minimax-m3.test.js
tests/unit/provider-pricing-minimax-m3.test.js
tests/unit/provider-quota-visibility.test.js
tests/unit/provider-test-models-routing.test.js
tests/unit/provider-thinking-config.test.js
tests/unit/provider-validation.test.js
tests/unit/providers-status-filter.test.js
tests/unit/pxpipe.test.js
tests/unit/qoder-billing.test.js
tests/unit/qoder.test.js
tests/unit/quota-auto-ping.test.js
tests/unit/reasoningContentInjector.test.js
tests/unit/request-details-redaction.test.js
tests/unit/request-details-tab.test.js
tests/unit/responses-abort-terminal.test.js
tests/unit/responses-parallel-tool-calls.test.js
tests/unit/responses-prompt-cache-key-3216.test.js
tests/unit/rtk.e2e.test.js
tests/unit/rtk.multi-provider.e2e.test.js
tests/unit/rtk.test.js
tests/unit/rtkFindWindows.test.js
tests/unit/rtkKiro.test.js
tests/unit/saml.test.js
tests/unit/search-ssrf-guard.test.js
tests/unit/searxng-provider-config.test.js
tests/unit/security-audit.test.js
tests/unit/session-manager.test.js
tests/unit/ssrf-guard-hardening.test.js
tests/unit/standalone-assets.test.js
tests/unit/system-inject.test.js
tests/unit/thinking-effort-openai-max-clamp.test.js
tests/unit/thinking-levels-gpt56-sol.test.js
tests/unit/thinking-levels-kiro.test.js
tests/unit/token-refresh-dispatch.test.js
tests/unit/token-refresh-generic.test.js
tests/unit/translator-custom-prefix.test.js
tests/unit/translator-helpers-edge.test.js
tests/unit/translator-request-normalization.test.js
tests/unit/tunnel-pid-ownership.test.js
tests/unit/usage-concern.test.js
tests/unit/usage-dispatch.test.js
tests/unit/v1-model-lookup-3588.test.js
tests/unit/venice-provider.test.js
tests/unit/web-cookie-validation.test.js
tests/unit/windsurf-executor.test.js
tests/unit/xai-oauth-service.test.js
tests/unit/xai-tokenRefresh.test.js
tests/unit/xai-video-core.test.js
tests/unit/xai-video-handler.test.js
tests/unit/xiaomi-mimo-tts.test.js
tests/unit/xquik-search-provider.test.js
tests/unit/zed-usage.test.js
tests/vitest.config.js
`````

## Complemento de leitura — effort e thinking

Mesma revisão preservada, sem novo download. Quatro arquivos adicionais lidos estaticamente; total acumulado de 43 arquivos selecionados, mantendo o inventário integral original.

- `open-sse/translator/concerns/thinking.js`
- `open-sse/translator/concerns/thinkingUnified.js`
- `open-sse/providers/thinkingLevels.js`
- `tests/unit/provider-thinking-config.test.js`

Trecho literal de `thinkingUnified.js`, linhas 348–367:

`````javascript
export function applyThinking(targetFormat, model, body, provider = null, intent = undefined) {
  if (!body || typeof body !== "object") return body;

  const { cleanModel, override } = parseSuffix(model);
  const cfg = override || intent || extractThinking(body);
  const caps = getCapabilitiesForModel(provider, cleanModel);

  // Model cannot reason → strip any stray thinking fields.
  if (!caps.reasoning) {
    stripAll(body);
    return body;
  }
  if (!cfg) return body;

  const fmt = resolveFormat(targetFormat, cleanModel, provider);
  const supportedLevels = getThinkingLevels(provider, cleanModel);
  stripAll(body);
  applyFormat(fmt, body, cfg, caps, supportedLevels);
  return body;
}
`````

A análise e a proposta estão no [contrato de configuração](../notes/anxionos-inference-config.md). Não foram executados testes ou validados serviços externos.
