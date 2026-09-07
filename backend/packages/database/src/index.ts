export interface DatabaseConfig {
	url: string;
	maxConnections?: number;
	ssl?: boolean;
}

export interface DatabaseConnection {
	readonly url: string;
	ping(): Promise<boolean>;
	close(): Promise<void>;
}

export async function createConnection(
	config: DatabaseConfig,
): Promise<DatabaseConnection> {
	if (!config.url) {
		throw new Error("DATABASE_URL is required");
	}

	return {
		url: config.url,
		async ping() {
			return config.url.length > 0;
		},
		async close() {},
	};
}
