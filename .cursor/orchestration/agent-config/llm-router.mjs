/**
 * Resolução de endpoint OpenAI-compatible via 9Router (gateway local).
 * Fonte oficial: https://github.com/decolua/9router · default http://localhost:20128/v1
 */

import { getOrchestrationPaths, loadConfigFile } from "./load-config.mjs";

/** @type {readonly string[]} */
export const BASE_URL_ENV_KEYS = [
  "NINEROUTER_BASE_URL",
  "OPENAI_BASE_URL",
  "OPENAI_API_BASE",
];

/** @type {readonly string[]} */
export const API_KEY_ENV_KEYS = ["OPENAI_API_KEY", "NINEROUTER_API_KEY"];

/** @type {readonly string[]} */
export const MODEL_ENV_KEYS = ["NINEROUTER_MODEL", "OPENAI_MODEL"];

export const DEFAULT_9ROUTER_BASE_URL = "http://localhost:20128/v1";

/**
 * @param {Record<string, string | undefined>} env
 * @param {readonly string[]} keys
 * @returns {string | undefined}
 */
export function firstEnvValue(env, keys) {
  for (const key of keys) {
    const value = env[key];
    if (value && String(value).trim()) return String(value).trim();
  }
  return undefined;
}

/**
 * @param {string} url
 * @returns {string}
 */
export function normalizeBaseUrl(url) {
  return String(url).replace(/\/+$/, "");
}

/**
 * @param {object} [options]
 * @param {Record<string, string | undefined>} [options.env]
 * @param {string} [options.baseUrl]
 * @param {string} [options.apiKey]
 * @param {string} [options.model]
 * @param {string} [options.defaultBaseUrl]
 * @returns {{
 *   provider: "9router",
 *   baseUrl: string,
 *   apiKey: string | null,
 *   model: string | null,
 *   chatCompletionsUrl: string,
 *   modelsUrl: string,
 *   configured: boolean,
 * }}
 */
export function resolveLlmRouterConfig(options = {}) {
  const env = options.env ?? process.env;
  const defaults = loadLlmRouterDefaults();
  const baseUrl = normalizeBaseUrl(
    options.baseUrl ??
      firstEnvValue(env, BASE_URL_ENV_KEYS) ??
      defaults.defaultBaseUrl ??
      DEFAULT_9ROUTER_BASE_URL,
  );
  const apiKey = options.apiKey ?? firstEnvValue(env, API_KEY_ENV_KEYS) ?? null;
  const model = options.model ?? firstEnvValue(env, MODEL_ENV_KEYS) ?? defaults.defaultModel ?? null;

  return {
    provider: "9router",
    baseUrl,
    apiKey,
    model,
    chatCompletionsUrl: `${baseUrl}/chat/completions`,
    modelsUrl: `${baseUrl}/models`,
    configured: Boolean(apiKey),
  };
}

/**
 * Lê defaults de `.cursor/orchestration.config.json` → `llmRouter`.
 * @returns {{ defaultBaseUrl?: string, defaultModel?: string }}
 */
export function loadLlmRouterDefaults() {
  const { configPath } = getOrchestrationPaths();
  const projectConfig = loadConfigFile(configPath);
  const llmRouter = projectConfig.llmRouter ?? {};
  return {
    defaultBaseUrl: llmRouter.defaultBaseUrl,
    defaultModel: llmRouter.defaultModel,
  };
}
