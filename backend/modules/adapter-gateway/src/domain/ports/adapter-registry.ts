import type {
	AdapterConformanceReport,
	AdapterRegistryEntry,
} from "@anxionos/contracts/adapter-gateway";

export interface AdapterRegistry {
	register(entry: AdapterRegistryEntry): Promise<void>;
	get(
		adapterId: string,
		adapterVersion: string,
	): Promise<AdapterRegistryEntry | null>;
	list(): Promise<AdapterRegistryEntry[]>;
	recordConformanceReport(
		adapterId: string,
		adapterVersion: string,
		report: AdapterConformanceReport,
	): Promise<void>;
}
