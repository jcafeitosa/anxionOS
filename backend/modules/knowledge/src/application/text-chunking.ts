import { createHash } from "node:crypto";

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function splitIntoChunks(text: string, maxLen = 256): string[] {
  const parts: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    parts.push(text.slice(cursor, cursor + maxLen));
    cursor += maxLen;
  }
  return parts.length > 0 ? parts : [text];
}
