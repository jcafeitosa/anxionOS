/**
 * Mapa canônico role → persona humana.
 * CLI: node personas.mjs list | get <slug>
 *
 * Consumidores: broadcast.mjs (--from-persona), protocol.mjs (personaRef em from/to).
 * Roster: carregado de orchestration.config.json → personasFile.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getPersonasPath } from "../agent-config/load-config.mjs";

/** @typedef {Object} Persona
 * @property {string} slug
 * @property {string} fullName
 * @property {string} shortName
 * @property {string} team
 * @property {string} role
 * @property {string} [criticOf]
 * @property {string} [criticSlug]
 * @property {string} [reportsTo]
 */

function loadPersonasMap() {
  const path = getPersonasPath();
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return raw.personas ?? raw;
}

/** @type {Record<string, Persona>} */
export const PERSONAS = loadPersonasMap();

export const PERSONA_SLUGS = Object.keys(PERSONAS);

/**
 * @param {string} slug
 * @returns {Persona}
 */
export function getPersona(slug) {
  const persona = PERSONAS[slug];
  if (!persona) {
    throw new Error(`Persona desconhecida: ${slug}. Use: ${PERSONA_SLUGS.join(", ")}`);
  }
  return persona;
}

/**
 * @param {string} slug
 * @returns {{ name: string, role: string, team: string }}
 */
export function personaRef(slug) {
  const p = getPersona(slug);
  return { name: p.fullName, role: p.slug, team: p.team };
}

/**
 * @param {string} slugOrPartial
 * @returns {Persona | undefined}
 */
export function resolvePersonaSlug(slugOrPartial) {
  if (PERSONAS[slugOrPartial]) return PERSONAS[slugOrPartial];
  const lower = slugOrPartial.toLowerCase();
  return PERSONA_SLUGS.map((s) => PERSONAS[s]).find(
    (p) =>
      p.slug === lower ||
      p.shortName.toLowerCase() === lower ||
      p.fullName.toLowerCase() === lower,
  );
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

function cmdList() {
  for (const slug of PERSONA_SLUGS) {
    const p = PERSONAS[slug];
    const pair = p.criticOf
      ? ` · critica ${p.criticOf}`
      : p.criticSlug
        ? ` · crítico: ${p.criticSlug}`
        : "";
    console.log(`${p.slug}\t${p.fullName} (${p.shortName})\t${p.team}${pair}`);
  }
}

function cmdGet(slug) {
  console.log(JSON.stringify(getPersona(slug), null, 2));
}

if (isMain) {
  const [cmd, arg] = process.argv.slice(2);
  if (!cmd || cmd === "help" || cmd === "--help") {
    console.log(`Usage:
  node personas.mjs list
  node personas.mjs get <slug>`);
    process.exit(0);
  }

  try {
    if (cmd === "list") cmdList();
    else if (cmd === "get") cmdGet(arg);
    else throw new Error(`Comando desconhecido: ${cmd}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
