export interface EmbeddingInput {
    chunkId: string;
    text: string;
    dimensions: number;
}
export interface EmbeddingResult {
    chunkId: string;
    vector: number[];
    dimensions: number;
}
export interface EmbeddingPort {
    embedBatch(inputs: EmbeddingInput[]): Promise<EmbeddingResult[]>;
}
