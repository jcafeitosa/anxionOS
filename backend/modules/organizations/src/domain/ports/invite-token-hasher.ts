export {};

export interface InviteTokenHasher {
	hash(plaintextToken: string): string;
	verify(plaintextToken: string, storedHash: string): boolean;
}
