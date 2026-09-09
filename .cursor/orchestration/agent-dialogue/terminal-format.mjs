/**
 * Formatação ANSI para diálogo de agentes no terminal (sem dependências).
 */

/** @typedef {import("./protocol.mjs").DialogueMessage} DialogueMessage */

export const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

export const TYPE_LABELS = {
  debate: "debate",
  collab: "colab",
  share: "share",
  research: "pesquisa",
  consult: "consulta",
  vote: "voto",
  handoff: "handoff",
  challenge: "desafio",
  response: "resposta",
  verdict: "veredito",
  status: "status",
  question: "pergunta",
  ack: "ack",
  escalate: "escalação",
  pair: "pair",
  review: "review",
  approve: "aprovação",
  decision: "decisão",
  hire: "hire",
  dismiss: "dismiss",
  block: "block",
  unblock: "unblock",
  plan: "plano",
  policy: "política",
};

const TYPE_COLORS = {
  debate: ANSI.yellow,
  challenge: ANSI.red,
  verdict: ANSI.green,
  escalate: ANSI.magenta,
  handoff: ANSI.cyan,
  ack: ANSI.blue,
  status: ANSI.gray,
  decision: ANSI.magenta,
  hire: ANSI.cyan,
  dismiss: ANSI.yellow,
  block: ANSI.red,
  unblock: ANSI.green,
  plan: ANSI.blue,
  policy: ANSI.magenta,
};

export function getTypeColor(type) {
  return TYPE_COLORS[type] ?? ANSI.reset;
}

export function displayName(msg) {
  return msg.from.persona?.name ?? msg.from.name;
}

export function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "??:??";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function typeLabel(type) {
  return TYPE_LABELS[type] ?? type;
}

export function terminalWidth() {
  const cols = process.stdout.columns ?? 80;
  return Math.max(60, Math.min(cols, 120));
}

export function wrapText(text, width) {
  if (width <= 0) return [text];
  const lines = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      if (!line) {
        line = word;
        continue;
      }
      if (line.length + 1 + word.length <= width) {
        line += ` ${word}`;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length > 0 ? lines : [""];
}

function pad(str, len) {
  if (str.length >= len) return str.slice(0, len);
  return str + " ".repeat(len - str.length);
}

function colorize(text, color) {
  if (!color || color === ANSI.reset) return text;
  return `${color}${text}${ANSI.reset}`;
}

/**
 * @param {DialogueMessage} msg
 * @param {Object} [opts]
 * @param {number} [opts.bodyWidth]
 */
export function formatDialogueTerminalMessage(msg, opts = {}) {
  const bodyWidth = opts.bodyWidth ?? terminalWidth() - 8;
  const time = formatTime(msg.timestamp);
  const name = pad(displayName(msg), 18);
  const type = pad(typeLabel(msg.type), 8);
  const issue = pad(msg.issueId ?? "—", 9);
  const gate = pad(msg.gate ?? "—", 4);
  const typeColor = getTypeColor(msg.type);

  const metaLine = `${ANSI.dim}│${ANSI.reset} ${time} ${ANSI.dim}│${ANSI.reset} ${name} ${ANSI.dim}│${ANSI.reset} ${colorize(type, typeColor)} ${ANSI.dim}│${ANSI.reset} ${issue} ${ANSI.dim}│${ANSI.reset} ${gate}`;

  const bodyLines = wrapText(msg.body, bodyWidth);
  const bodyFormatted = bodyLines
    .map((line) => `${ANSI.dim}│       │ ${ANSI.reset}${line}`)
    .join("\n");

  return `${metaLine}\n${bodyFormatted}`;
}

/**
 * @param {DialogueMessage} msg
 */
export function formatDialogueTerminalOneliner(msg) {
  const time = formatTime(msg.timestamp);
  const name = displayName(msg);
  const type = typeLabel(msg.type);
  const issue = msg.issueId ?? "—";
  const gate = msg.gate ?? "—";
  const typeColor = getTypeColor(msg.type);
  const preview = msg.body.replace(/\s+/g, " ").trim();
  const clipped = preview.length > 72 ? `${preview.slice(0, 69)}…` : preview;
  return `${ANSI.dim}${time}${ANSI.reset} ${name} ${colorize(type, typeColor)} ${issue} ${gate} — ${clipped}`;
}

/**
 * @param {Object} opts
 * @param {string|null} [opts.issueId]
 * @param {boolean} [opts.live]
 */
export function formatDialogueTerminalHeader(opts = {}) {
  const w = terminalWidth();
  const issueLabel = opts.issueId ?? "all";
  const mode = opts.live ? "live" : "snapshot";
  const title = ` anxionOS Agent Dialogue (${mode}) — issue: ${issueLabel} `;
  const inner = title.length >= w - 2 ? title.slice(0, w - 2) : title + "─".repeat(Math.max(0, w - 2 - title.length));
  return `${ANSI.cyan}${ANSI.bold}┌${inner}┐${ANSI.reset}`;
}

export function formatDialogueTerminalFooter() {
  const w = terminalWidth();
  return `${ANSI.cyan}└${"─".repeat(Math.max(0, w - 2))}┘${ANSI.reset}`;
}

/**
 * @param {DialogueMessage[]} messages
 * @param {Object} [opts]
 * @param {string|null} [opts.issueId]
 * @param {boolean} [opts.live]
 * @param {boolean} [opts.footer]
 */
export function formatDialogueTerminalPanel(messages, opts = {}) {
  if (messages.length === 0) {
    const header = formatDialogueTerminalHeader(opts);
    const empty = `${ANSI.dim}│ (nenhuma mensagem)${ANSI.reset}`;
    const footer = opts.footer !== false ? formatDialogueTerminalFooter() : "";
    return `${header}\n${empty}\n${footer}`;
  }

  const parts = [formatDialogueTerminalHeader(opts)];
  for (const msg of messages) {
    parts.push(formatDialogueTerminalMessage(msg));
  }
  if (opts.footer !== false) {
    parts.push(formatDialogueTerminalFooter());
  }
  return parts.join("\n");
}

/**
 * @param {string[]} argv
 */
export function parseTerminalArgs(argv) {
  const opts = {
    issueId: null,
    gate: null,
    type: null,
    lines: 15,
    clear: false,
    follow: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--issue") opts.issueId = argv[++i];
    else if (a === "--gate") opts.gate = argv[++i];
    else if (a === "--type") opts.type = argv[++i];
    else if (a === "--lines") opts.lines = Number(argv[++i]);
    else if (a === "--clear") opts.clear = true;
    else if (a === "--follow") opts.follow = true;
    else if (a === "--no-follow") opts.follow = false;
    else if (a === "--help" || a === "-h") {
      return { ...opts, help: true };
    } else {
      throw new Error(`Opção desconhecida: ${a}`);
    }
  }

  if (!Number.isFinite(opts.lines) || opts.lines <= 0) {
    throw new Error("--lines deve ser um número positivo");
  }

  return opts;
}

export function printTerminalUsage(scriptName) {
  console.log(`${scriptName} — diálogo formatado para terminal

Usage:
  node ${scriptName} [opts]

Options:
  --issue ANX-N       Filtra por issue
  --gate G1           Filtra por gate
  --type TYPE         Filtra por tipo
  --lines N           Últimas N mensagens (default 15)
  --clear             Limpa tela a cada atualização (live)
  --follow            Modo live com fs.watch (default)
  --no-follow         Snapshot único e encerra
`);
}
