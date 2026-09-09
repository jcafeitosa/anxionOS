export interface RebuildRegistryPort {
	getRegistryGeneration(): Promise<number>;
	bumpRegistryGeneration(): Promise<number>;
	getCurrentGeneration(): Promise<number>;
	swapCurrentGeneration(generation: number): Promise<void>;
}
