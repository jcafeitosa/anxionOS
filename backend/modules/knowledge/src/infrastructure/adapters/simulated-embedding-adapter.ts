import { createHash } from "node:crypto";
import type { EmbeddingPort } from "../../domain/ports/embedding-port";

export const SIMULATED_EMBEDDING_DIMENSIONS = 1536;

function pseudoVector(seed: string, dimensions: number): number[] {
  const out: number[] = [];
  let hash = createHash("sha256").update(seed).digest();
  for (let i = 0; i < dimensions; i += 1) {
    const byte = hash[i % hash.length];
    out.push((byte / 255) * 2 - 1);
    if (i % 32 === 31) {
      hash = createHash("sha256").update(hash).digest();
    }
  }
  return out;
}

export function createSimulatedEmbeddingPort(): EmbeddingPort {
  return {
    async embedBatch(inputs) {
      return inputs.map((input) => ({
        chunkId: input.chunkId,
        dimensions: input.dimensions,
        vector: pseudoVector(`${input.chunkId}:${input.text}`, input.dimensions),
      }));
    },
  };
}
