/**
 * Testes llm-router — resolução OpenAI-compatible via 9Router.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_9ROUTER_BASE_URL,
  firstEnvValue,
  normalizeBaseUrl,
  resolveLlmRouterConfig,
} from "../agent-config/llm-router.mjs";

test("normalizeBaseUrl remove trailing slash", () => {
  assert.equal(normalizeBaseUrl("http://localhost:20128/v1/"), "http://localhost:20128/v1");
});

test("firstEnvValue respeita ordem de precedência", () => {
  const env = {
    NINEROUTER_BASE_URL: "http://custom:1/v1",
    OPENAI_BASE_URL: "http://openai/v1",
  };
  assert.equal(firstEnvValue(env, ["NINEROUTER_BASE_URL", "OPENAI_BASE_URL"]), "http://custom:1/v1");
});

test("resolveLlmRouterConfig usa default 9Router sem env", () => {
  const cfg = resolveLlmRouterConfig({ env: {} });
  assert.equal(cfg.provider, "9router");
  assert.equal(cfg.baseUrl, DEFAULT_9ROUTER_BASE_URL);
  assert.equal(cfg.chatCompletionsUrl, `${DEFAULT_9ROUTER_BASE_URL}/chat/completions`);
  assert.equal(cfg.modelsUrl, `${DEFAULT_9ROUTER_BASE_URL}/models`);
  assert.equal(cfg.configured, false);
  assert.equal(cfg.apiKey, null);
});

test("resolveLlmRouterConfig lê OPENAI_BASE_URL e OPENAI_API_KEY", () => {
  const cfg = resolveLlmRouterConfig({
    env: {
      OPENAI_BASE_URL: "http://127.0.0.1:20128/v1",
      OPENAI_API_KEY: "sk_test",
      NINEROUTER_MODEL: "kr/claude-sonnet-4.5",
    },
  });
  assert.equal(cfg.baseUrl, "http://127.0.0.1:20128/v1");
  assert.equal(cfg.apiKey, "sk_test");
  assert.equal(cfg.model, "kr/claude-sonnet-4.5");
  assert.equal(cfg.configured, true);
});
