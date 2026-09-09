/**
 * Testes do carregamento de configuração agnóstica + resolução global de paths.
 */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  loadOrchestrationConfig,
  buildIssueIdRegex,
  buildStrictIssueIdRegex,
  isValidIssueId,
  getIssuePrefix,
  resetConfigCache,
  formatIssueIdHint,
  resolveOrchestrationPaths,
  resolveFrameworkRoot,
  DEFAULT_ORCHESTRATION_HOME,
  DEFAULT_RUNTIME_ROOT,
} from "../agent-config/load-config.mjs";

test("carrega config anxionOS com prefixo ANX", () => {
  resetConfigCache();
  const cfg = loadOrchestrationConfig();
  assert.equal(cfg.projectName, "anxionOS");
  assert.equal(cfg.issuePrefix, "ANX");
  assert.equal(cfg.taskboardProject, "anxionOS");
  assert.equal(cfg.knowledgeRoot, "brain/");
  assert.deepEqual(cfg.codeRoots, ["backend/", "frontend/"]);
});

test("valida issue ANX-134 (dialogue e strict)", () => {
  resetConfigCache();
  assert.ok(isValidIssueId("ANX-134"));
  assert.ok(isValidIssueId("ANX-134", { strict: true }));
  assert.ok(isValidIssueId("ANX-VALIDATION"));
  assert.ok(!isValidIssueId("ANX-VALIDATION", { strict: true }));
});

test("rejeita prefixo incorreto", () => {
  resetConfigCache();
  assert.ok(!isValidIssueId("FOO-134"));
});

test("buildIssueIdRegex respeita env ORCHESTRATION_ISSUE_PREFIX", () => {
  resetConfigCache();
  const prev = process.env.ORCHESTRATION_ISSUE_PREFIX;
  process.env.ORCHESTRATION_ISSUE_PREFIX = "DEMO";
  resetConfigCache();
  assert.equal(getIssuePrefix(), "DEMO");
  assert.ok(buildIssueIdRegex().test("DEMO-42"));
  assert.ok(buildStrictIssueIdRegex().test("DEMO-99"));
  assert.ok(!buildStrictIssueIdRegex().test("ANX-1"));
  if (prev === undefined) delete process.env.ORCHESTRATION_ISSUE_PREFIX;
  else process.env.ORCHESTRATION_ISSUE_PREFIX = prev;
  resetConfigCache();
});

test("formatIssueIdHint usa prefixo configurado", () => {
  resetConfigCache();
  delete process.env.ORCHESTRATION_ISSUE_PREFIX;
  resetConfigCache();
  assert.match(formatIssueIdHint(), /^ANX-<número>$/);
});

test("resolveFrameworkRoot usa ORCHESTRATION_HOME quando definido", () => {
  resetConfigCache();
  const tmpGlobal = mkdtempSync(join(tmpdir(), "orch-global-"));
  const prevHome = process.env.ORCHESTRATION_HOME;
  process.env.ORCHESTRATION_HOME = tmpGlobal;
  mkdirSync(join(tmpGlobal, "agent-config"), { recursive: true });
  writeFileSync(join(tmpGlobal, "VERSION"), "9.9.9\n");
  const project = mkdtempSync(join(tmpdir(), "orch-proj-"));
  assert.equal(resolveFrameworkRoot(project), tmpGlobal);
  if (prevHome === undefined) delete process.env.ORCHESTRATION_HOME;
  else process.env.ORCHESTRATION_HOME = prevHome;
  resetConfigCache();
});

test("resolveOrchestrationPaths mescla config do projeto em tmp", () => {
  resetConfigCache();
  const project = mkdtempSync(join(tmpdir(), "orch-proj-"));
  const configDir = join(project, ".cursor");
  mkdirSync(configDir, { recursive: true });
  writeFileSync(
    join(configDir, "orchestration.config.json"),
    JSON.stringify({ projectName: "demo", issuePrefix: "DMO", codeRoots: ["src/"] }),
  );
  const resolved = resolveOrchestrationPaths({ projectRoot: project });
  assert.equal(resolved.projectRoot, project);
  assert.equal(resolved.config.projectName, "demo");
  assert.equal(getIssuePrefix({ projectRoot: project }), "DMO");
  assert.ok(existsSync(resolved.configPath));
  resetConfigCache();
});

test("DEFAULT_ORCHESTRATION_HOME aponta para ~/.cursor/orchestration", () => {
  assert.match(DEFAULT_ORCHESTRATION_HOME, /\.cursor\/orchestration$/);
});

test("DEFAULT_RUNTIME_ROOT usa .cursor/orchestration-runtime", () => {
  assert.equal(DEFAULT_RUNTIME_ROOT, ".cursor/orchestration-runtime");
});

test("resolveOrchestrationPaths expõe runtime sob .cursor/", () => {
  resetConfigCache();
  const resolved = resolveOrchestrationPaths();
  assert.match(resolved.paths.runtime, /\.cursor\/orchestration-runtime$/);
  assert.match(resolved.paths.dialogue, /orchestration-runtime\/dialogue$/);
  assert.match(resolved.configPath, /\.cursor\/orchestration\.config\.json$/);
});

test("resolveConfigPath prefere .cursor/orchestration.config.json sobre legado", () => {
  resetConfigCache();
  const project = mkdtempSync(join(tmpdir(), "orch-legacy-"));
  const cursorDir = join(project, ".cursor");
  const legacyDir = join(project, ".codewhale");
  mkdirSync(cursorDir, { recursive: true });
  mkdirSync(legacyDir, { recursive: true });
  writeFileSync(
    join(cursorDir, "orchestration.config.json"),
    JSON.stringify({ project: { issuePrefix: "NEW" } }),
  );
  writeFileSync(
    join(legacyDir, "orchestration.config.json"),
    JSON.stringify({ project: { issuePrefix: "OLD" } }),
  );
  const resolved = resolveOrchestrationPaths({ projectRoot: project });
  assert.equal(getIssuePrefix({ projectRoot: project }), "NEW");
  assert.match(resolved.configPath, /orchestration.config.json$/);
  resetConfigCache();
});

