/**
 * Resolução agnóstica de paths — framework global + overlay por projeto.
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const frameworkModuleRoot = dirname(moduleDir);
const DEFAULT_PERSONAS_FALLBACK = join(moduleDir, "roster.anxionos.json");

export const DEFAULT_ORCHESTRATION_HOME = join(homedir(), ".cursor", "orchestration");

/** Runtime state root (per-project, not framework code). */
export const DEFAULT_RUNTIME_ROOT = ".cursor/orchestration-runtime";
/** @deprecated Legacy runtime root — fallback read only. */
export const LEGACY_RUNTIME_ROOT = ".codewhale";
export const DEFAULT_CONFIG_REL = ".cursor/orchestration.config.json";
/** @deprecated Legacy config location — fallback read only. */
export const LEGACY_CONFIG_REL = ".codewhale/orchestration.config.json";

const DEFAULT_RUNTIME_PATHS = {
  runtime: DEFAULT_RUNTIME_ROOT,
  dialogue: `${DEFAULT_RUNTIME_ROOT}/dialogue`,
  workflows: `${DEFAULT_RUNTIME_ROOT}/workflows`,
  autonomy: `${DEFAULT_RUNTIME_ROOT}/autonomy`,
  hire: `${DEFAULT_RUNTIME_ROOT}/hire`,
  proactive: `${DEFAULT_RUNTIME_ROOT}/proactive`,
  lifecycle: `${DEFAULT_RUNTIME_ROOT}/lifecycle`,
  state: `${DEFAULT_RUNTIME_ROOT}/state`,
};

const DEFAULT_CONFIG = {
  version: 1,
  project: { name: null, issuePrefix: "ANX" },
  taskboardProject: null,
  knowledgeRoot: "brain/",
  codeRoots: ["backend/", "frontend/"],
  scopeDoc: "SCOPE.md",
  defaultCTO: "orchestrator",
  personasFile: null,
  paths: DEFAULT_RUNTIME_PATHS,
  taskboard: {
    urlEnv: ["TASKBOARD_URL", "CODEX_TASKBOARD_URL"],
    defaultUrl: "http://127.0.0.1:47823",
  },
  issueIdPattern: null,
  dialogueIssueIdPattern: null,
};

let cached = null;

function normalizePrefix(prefix) {
  return String(prefix ?? "ISSUE").trim().toUpperCase();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeFlatConfig(raw = {}) {
  const out = { ...raw };
  if (raw.projectName && !out.project?.name) {
    out.project = { ...(out.project ?? {}), name: raw.projectName };
  }
  if (raw.issuePrefix && !out.project?.issuePrefix) {
    out.project = { ...(out.project ?? {}), issuePrefix: raw.issuePrefix };
  }
  return out;
}

function applyEnvOverrides(config) {
  const next = { ...config, project: { ...config.project } };
  if (process.env.ORCHESTRATION_ISSUE_PREFIX) {
    next.project.issuePrefix = normalizePrefix(process.env.ORCHESTRATION_ISSUE_PREFIX);
  }
  if (process.env.TASKBOARD_PROJECT_NAME) {
    next.taskboardProject = process.env.TASKBOARD_PROJECT_NAME;
  }
  const prefix = normalizePrefix(next.project?.issuePrefix ?? "ANX");
  const prefixEscaped = escapeRegex(prefix);
  next.issueIdPattern = `^${prefixEscaped}-\\d+$`;
  next.dialogueIssueIdPattern = `^${prefixEscaped}-(?:\\d+|VALIDATION|TEST)$`;
  if (!next.taskboardProject) {
    next.taskboardProject = next.project?.name ?? null;
  }
  return next;
}

function hasOrchestrationConfig(dir) {
  return (
    existsSync(join(dir, DEFAULT_CONFIG_REL)) ||
    existsSync(join(dir, LEGACY_CONFIG_REL))
  );
}

export function findProjectRoot(startDir = process.cwd()) {
  let dir = resolve(startDir);
  while (true) {
    if (existsSync(join(dir, ".git"))) return dir;
    if (hasOrchestrationConfig(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(startDir);
}

export function resolveFrameworkRoot(projectRoot = findProjectRoot()) {
  if (process.env.ORCHESTRATION_HOME) return resolve(process.env.ORCHESTRATION_HOME);
  const local = join(projectRoot, ".cursor", "orchestration");
  const global = DEFAULT_ORCHESTRATION_HOME;
  const preferGlobal = process.env.ORCHESTRATION_PREFER_GLOBAL === "1";
  const localHasFramework = existsSync(join(local, "agent-config", "load-config.mjs"));
  const globalHasFramework = existsSync(join(global, "VERSION"));
  if (preferGlobal && globalHasFramework) return global;
  if (localHasFramework) return local;
  if (globalHasFramework) return global;
  if (existsSync(join(local, "SCOPE.md"))) return local;
  return frameworkModuleRoot;
}

export function resolveConfigPath(projectRoot = findProjectRoot()) {
  const envPath = process.env.ORCHESTRATION_CONFIG;
  if (envPath) return isAbsolute(envPath) ? envPath : join(projectRoot, envPath);
  const canonical = join(projectRoot, DEFAULT_CONFIG_REL);
  const legacy = join(projectRoot, LEGACY_CONFIG_REL);
  if (existsSync(canonical)) return canonical;
  if (existsSync(legacy)) return legacy;
  return canonical;
}

/** Normalize legacy `paths.codewhale` → `paths.runtime`. */
function normalizeRuntimePaths(paths = {}) {
  const next = { ...paths };
  if (!next.runtime && next.codewhale) {
    next.runtime = next.codewhale;
  }
  if (!next.lifecycle && next.runtime) {
    next.lifecycle = `${next.runtime}/lifecycle`;
  }
  if (!next.state && next.runtime) {
    next.state = `${next.runtime}/state`;
  }
  return next;
}

export function loadConfigFile(configPath) {
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, "utf8"));
  } catch {
    return {};
  }
}

export function deepMerge(...objects) {
  const result = {};
  for (const obj of objects) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue;
    for (const [key, value] of Object.entries(obj)) {
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        result[key] &&
        typeof result[key] === "object" &&
        !Array.isArray(result[key])
      ) {
        result[key] = deepMerge(result[key], value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

export function mergeConfig(projectConfig = {}, globalDefaults = {}) {
  const merged = deepMerge(DEFAULT_CONFIG, globalDefaults, normalizeFlatConfig(projectConfig));
  merged.paths = normalizeRuntimePaths(merged.paths ?? {});
  return applyEnvOverrides(merged);
}

export function resolveOrchestrationPaths(options = {}) {
  const projectRoot = options.projectRoot ?? findProjectRoot();
  const frameworkRoot = options.frameworkRoot ?? resolveFrameworkRoot(projectRoot);
  const configPath = resolveConfigPath(projectRoot);
  const globalDefaultsPath = join(frameworkRoot, "templates", "orchestration.config.defaults.json");
  const globalDefaults = loadConfigFile(globalDefaultsPath);
  const projectConfig = loadConfigFile(configPath);
  const config = mergeConfig(projectConfig, globalDefaults);
  const resolvePath = (rel) => (isAbsolute(rel) ? rel : join(projectRoot, rel));
  const scopeDoc = config.scopeDoc ?? "SCOPE.md";
  return {
    projectRoot,
    frameworkRoot,
    configPath,
    config,
    paths: {
      runtime: resolvePath(config.paths.runtime ?? config.paths.codewhale ?? DEFAULT_RUNTIME_ROOT),
      /** @deprecated Use `runtime` — kept for backward compatibility. */
      codewhale: resolvePath(config.paths.runtime ?? config.paths.codewhale ?? DEFAULT_RUNTIME_ROOT),
      dialogue: resolvePath(config.paths.dialogue),
      workflows: resolvePath(config.paths.workflows),
      autonomy: resolvePath(config.paths.autonomy),
      hire: resolvePath(config.paths.hire),
      proactive: resolvePath(config.paths.proactive),
      lifecycle: resolvePath(config.paths.lifecycle ?? `${config.paths.runtime ?? DEFAULT_RUNTIME_ROOT}/lifecycle`),
      state: resolvePath(config.paths.state ?? `${config.paths.runtime ?? DEFAULT_RUNTIME_ROOT}/state`),
      scope: join(frameworkRoot, scopeDoc),
      agentsMd: join(projectRoot, "AGENTS.md"),
      personasLocal: join(
        resolvePath(config.paths.runtime ?? config.paths.codewhale ?? DEFAULT_RUNTIME_ROOT),
        "personas.local.json",
      ),
      hooks: join(projectRoot, ".cursor", "hooks"),
      hooksJson: join(projectRoot, ".cursor", "hooks.json"),
      rules: join(projectRoot, ".cursor", "rules"),
    },
  };
}

export function getOrchestrationPaths(options = {}) {
  if (!cached || options.projectRoot || options.frameworkRoot) {
    const resolved = resolveOrchestrationPaths(options);
    if (!options.projectRoot && !options.frameworkRoot) cached = resolved;
    return resolved;
  }
  return cached;
}

export function resetOrchestrationPathsCache() {
  cached = null;
}

export function resetConfigCache() {
  resetOrchestrationPathsCache();
}

export function getProjectRoot() {
  return getOrchestrationPaths().projectRoot;
}

export function getFrameworkRoot() {
  return getOrchestrationPaths().frameworkRoot;
}

export const repoRoot = getOrchestrationPaths().projectRoot;

export function loadOrchestrationConfig(options = {}) {
  const { config, projectRoot, frameworkRoot, configPath } = getOrchestrationPaths(options);
  return {
    projectName: config.project?.name ?? "project",
    issuePrefix: normalizePrefix(config.project?.issuePrefix ?? "ANX"),
    taskboardProject: config.taskboardProject ?? config.project?.name ?? null,
    knowledgeRoot: config.knowledgeRoot ?? "brain/",
    codeRoots: config.codeRoots ?? [],
    scopeDoc: config.scopeDoc ?? "SCOPE.md",
    defaultCTO: config.defaultCTO ?? "orchestrator",
    personasFile: getPersonasPath(options),
    projectRoot,
    frameworkRoot,
    configPath,
    raw: config,
  };
}

export function getIssuePrefix(options = {}) {
  return loadOrchestrationConfig(options).issuePrefix;
}

export function getProjectName(options = {}) {
  return loadOrchestrationConfig(options).projectName;
}

export function getTaskboardProject(options = {}) {
  return loadOrchestrationConfig(options).taskboardProject;
}

export function getKnowledgeRoot(options = {}) {
  return loadOrchestrationConfig(options).knowledgeRoot;
}

export function getCodeRoots(options = {}) {
  return loadOrchestrationConfig(options).codeRoots;
}

export function getDefaultCTO(options = {}) {
  return loadOrchestrationConfig(options).defaultCTO;
}

export function getScopeDocRelative(options = {}) {
  return loadOrchestrationConfig(options).scopeDoc;
}

export function getScopeDocPath(options = {}) {
  return getOrchestrationPaths(options).paths.scope;
}

export function buildIssueIdRegex(options = {}) {
  const { config } = getOrchestrationPaths(options);
  return new RegExp(config.dialogueIssueIdPattern);
}

export function buildStrictIssueIdRegex(options = {}) {
  const { config } = getOrchestrationPaths(options);
  return new RegExp(config.issueIdPattern);
}

export function isValidIssueId(issueId, opts = {}) {
  if (!issueId || typeof issueId !== "string") return false;
  const normalized = issueId.toUpperCase();
  const re = opts.strict ? buildStrictIssueIdRegex() : buildIssueIdRegex();
  return re.test(normalized);
}

export function normalizeIssueId(issueId) {
  if (!issueId) return issueId;
  const parts = issueId.split("-");
  if (parts.length < 2) return issueId.toUpperCase();
  parts[0] = normalizePrefix(parts[0]);
  return parts.join("-");
}

export function formatIssueIdHint(options = {}) {
  const prefix = getIssuePrefix(options);
  return `${prefix}-<número>`;
}

export function formatIssueIdError(options = {}) {
  return `issueId deve corresponder a ${formatIssueIdHint(options)}`;
}

export function issueIdRequiredMessage(options = {}) {
  return `issueId obrigatório no formato ${formatIssueIdHint(options)}`;
}

export function getPersonasPath(options = {}) {
  const { projectRoot, frameworkRoot, config } = getOrchestrationPaths(options);
  const rel = config.personasFile;
  const candidates = [];
  if (rel) {
    candidates.push(isAbsolute(rel) ? rel : join(projectRoot, rel));
    candidates.push(join(frameworkRoot, rel));
  }
  candidates.push(
    join(projectRoot, DEFAULT_RUNTIME_ROOT, "personas.local.json"),
    join(projectRoot, LEGACY_RUNTIME_ROOT, "personas.local.json"),
    DEFAULT_PERSONAS_FALLBACK,
    join(frameworkRoot, "templates", "personas.template.json"),
  );
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return join(frameworkRoot, "templates", "personas.template.json");
}
