/**
 * Identidade de persona — personalidade ativa em todo momento que o agente fala.
 * ANX-275 · fonte: persona-personalities.json + PERSONALITIES.md
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPersona, PERSONA_SLUGS } from "./personas.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PERSONALITIES_PATH = join(__dirname, "persona-personalities.json");

/** @type {Record<string, object>} */
let _cache = null;

export function loadPersonalityRegistry() {
  if (_cache) return _cache;
  const raw = JSON.parse(readFileSync(PERSONALITIES_PATH, "utf8"));
  _cache = raw.personalities ?? raw;
  return _cache;
}

/**
 * @param {string} slug
 */
export function getPersonality(slug) {
  const registry = loadPersonalityRegistry();
  const p = registry[slug];
  if (!p) throw new Error(`Personalidade não registrada: ${slug}`);
  const roster = getPersona(slug);
  return {
    slug,
    personalitySlug: slug,
    ...p,
    fullName: p.fullName ?? roster.fullName,
    team: p.team ?? roster.team,
    role: p.role ?? roster.slug,
  };
}

/**
 * Cabeçalho markdown do bloco persona (formato agents-in-chat).
 * @param {string} slug
 */
export function formatPersonaBlockHeader(slug) {
  const p = getPersonality(slug);
  const roleLabel = p.role.replace(/-/g, " ");
  return `**${p.fullName}** · ${roleLabel} · [${slug}] · ${p.team}`;
}

/**
 * Cartão de personalidade para sessão ativa (colar no ack ou início de turno).
 * @param {string} slug
 */
export function formatPersonalityCard(slug) {
  const p = getPersonality(slug);
  const lines = [
    `<!-- PERSONA_ACTIVE: ${slug} -->`,
    formatPersonaBlockHeader(slug),
    `Traits: ${p.coreTraits.join(", ")}`,
    `Energia: ${p.energy} · Humor: ${p.humor}`,
    `Tiques: ${p.verbalTics.slice(0, 2).join(" · ")}`,
    `Voz exemplo: "${p.sampleVoice}"`,
  ];
  return lines.join("\n");
}

const PERSONA_BLOCK_RE =
  /---\s*\n\s*\*\*[^*]+\*\*\s*·[^·]+·\s*\[[\w-]+\]\s*·/m;

const ASSISTANT_PHRASES = [
  /\bas an ai\b/i,
  /\bcomo assistente\b/i,
  /\bconforme solicitado\b/i,
  /\bprezado usu[aá]rio\b/i,
  /\bimplementation complete\b/i,
];

/**
 * @param {string} text
 */
export function hasPersonaBlock(text) {
  return PERSONA_BLOCK_RE.test(text ?? "");
}

/**
 * @param {string} text
 * @param {string} slug
 */
export function blockContainsPersonaSlug(text, slug) {
  if (!text || !slug) return false;
  return new RegExp(`\\[${slug}\\]`, "i").test(text);
}

/**
 * @param {string} text
 * @param {string} [expectedSlug]
 */
export function evaluatePersonaIdentityWarnings(text, expectedSlug = null) {
  const warnings = [];
  if (!text || typeof text !== "string" || text.trim().length < 20) return warnings;

  if (!hasPersonaBlock(text)) {
    warnings.push({
      code: "PERSONA_BLOCK_MISSING",
      message:
        "Resposta sem bloco persona (---) — agente ativo deve falar em 1ª pessoa com identidade",
      fix: "Formato: --- \\n **Nome** · papel · [slug] · time \\n @dest — mensagem. \\n ---",
    });
  }

  if (expectedSlug && hasPersonaBlock(text) && !blockContainsPersonaSlug(text, expectedSlug)) {
    warnings.push({
      code: "PERSONA_SLUG_MISMATCH",
      message: `Bloco persona não contém [${expectedSlug}] da sessão ativa`,
      fix: `npm run orchestration:persona-voice -- --persona ${expectedSlug}`,
    });
  }

  for (const re of ASSISTANT_PHRASES) {
    if (re.test(text)) {
      warnings.push({
        code: "PERSONA_ASSISTANT_VOICE",
        message: "Voz de assistant genérico detectada — usar personalidade da persona ativa",
        fix: "Ler PERSONALITIES.md + PERSONA-VOICE.md para o slug da sessão",
      });
      break;
    }
  }

  return warnings;
}

/**
 * @param {object} session
 */
export function evaluateActivePersonaWarnings(session) {
  const warnings = [];
  if (!session?.persona) return warnings;

  if (!session.personalityAckAt) {
    warnings.push({
      code: "PERSONALITY_NOT_ACKNOWLEDGED",
      message: `Sessão ${session.persona} sem personalityAck — persona deve ser carregada no start`,
      fix: `npm run orchestration:session -- start --persona ${session.persona} --issue ${session.issueId}`,
    });
  }

  return warnings;
}

export function listPersonalities() {
  return PERSONA_SLUGS.map((slug) => getPersonality(slug));
}

function parseArgs(argv) {
  const opts = { cmd: argv[0], persona: null, json: false };
  for (let i = 1; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--persona") opts.persona = argv[++i];
  }
  return opts;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.cmd || args.cmd === "--help" || args.cmd === "-h") {
    console.log(`Usage:
  orchestration:persona-voice -- --persona SLUG [--json]
  orchestration:persona-voice -- list [--json]
  orchestration:persona-voice -- card --persona SLUG`);
    process.exit(0);
  }

  if (args.cmd === "list") {
    const out = listPersonalities().map((p) => ({
      slug: p.slug,
      fullName: p.fullName,
      traits: p.coreTraits,
      sampleVoice: p.sampleVoice,
    }));
    console.log(args.json ? JSON.stringify(out, null, 2) : out.map((p) => `${p.slug}: ${p.fullName}`).join("\n"));
    return;
  }

  if (args.cmd === "card" || args.persona) {
    const slug = args.persona;
    if (!slug) throw new Error("--persona SLUG obrigatório");
    const card = formatPersonalityCard(slug);
    console.log(args.json ? JSON.stringify(getPersonality(slug), null, 2) : card);
    return;
  }

  throw new Error(`Comando desconhecido: ${args.cmd}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
