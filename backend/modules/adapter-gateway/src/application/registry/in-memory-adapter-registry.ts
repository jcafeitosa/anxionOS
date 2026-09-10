import {
	AdapterGatewayError,
	adapterRegistryEntrySchema,
	type AdapterConformanceReport,
	type AdapterRegistryEntry,
} from "@anxionos/contracts/adapter-gateway";
import type { AdapterRegistry } from "../../domain/ports/adapter-registry";

function registryKey(adapterId: string, adapterVersion: string): string {
	return `${adapterId}@${adapterVersion}`;
}

export class InMemoryAdapterRegistry implements AdapterRegistry {
	private readonly entries = new Map<string, AdapterRegistryEntry>();

	async register(entry: AdapterRegistryEntry): Promise<void> {
		const parsed = adapterRegistryEntrySchema.parse(entry);
		const key = registryKey(
			parsed.manifest.adapterId,
			parsed.manifest.adapterVersion,
		);
		const existing = this.entries.get(key);
		if (existing) {
			if (existing.manifest.imageDigest !== parsed.manifest.imageDigest) {
				throw new AdapterGatewayError(
					"AGW_REGISTRY_CONFLICT",
					`adapter ${key} already registered with different image digest`,
					{
						existingDigest: existing.manifest.imageDigest,
						requestedDigest: parsed.manifest.imageDigest,
					},
				);
			}
			this.entries.set(key, parsed);
			return;
		}
		this.entries.set(key, parsed);
	}

	async get(
		adapterId: string,
		adapterVersion: string,
	): Promise<AdapterRegistryEntry | null> {
		return this.entries.get(registryKey(adapterId, adapterVersion)) ?? null;
	}

	async list(): Promise<AdapterRegistryEntry[]> {
		return [...this.entries.values()];
	}

	async recordConformanceReport(
		adapterId: string,
		adapterVersion: string,
		report: AdapterConformanceReport,
	): Promise<void> {
		const key = registryKey(adapterId, adapterVersion);
		const existing = this.entries.get(key);
		if (!existing) {
			throw new AdapterGatewayError(
				"AGW_ADAPTER_NOT_FOUND",
				`adapter ${key} is not registered`,
			);
		}
		this.entries.set(key, {
			...existing,
			lastConformanceReportId: report.reportId,
		});
	}
}
