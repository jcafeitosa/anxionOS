import {
	createHash,
	randomBytes,
	scryptSync,
	timingSafeEqual,
} from "node:crypto";

/**
 * Service credential material (R03 ServiceCredentialRef / INV-IDN-03).
 *
 * The plaintext key is returned exactly once, at issuance. Persisted state is
 * scrypt(salt, secret) — never the secret, never a reversible encoding.
 * Format of the delivered key: `<prefix>.<secret>`.
 */
const SECRET_BYTES = 32;
const SALT_BYTES = 16;
const SCRYPT_KEYLEN = 32;
const HASH_ALGORITHM = "scrypt";

/** Prefix charset keeps the value inside `serviceCredentialPrefixSchema`. */
const PREFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const PREFIX_LENGTH = 12;

export interface GeneratedServiceCredential {
	prefix: string;
	/** Plaintext secret — returned once, never persisted or logged. */
	secret: string;
	/** Deterministic verification material persisted in `secret_hash`. */
	secretHash: string;
}

function randomFromAlphabet(length: number): string {
	const bytes = randomBytes(length);
	let out = "";
	for (let index = 0; index < length; index += 1) {
		const byte = bytes[index] ?? 0;
		out += PREFIX_ALPHABET[byte % PREFIX_ALPHABET.length];
	}
	return out;
}

export function hashServiceCredentialSecret(
	secret: string,
	salt: Buffer = randomBytes(SALT_BYTES),
): string {
	const derived = scryptSync(secret, salt, SCRYPT_KEYLEN);
	return `${HASH_ALGORITHM}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function verifyServiceCredentialSecret(
	secret: string,
	secretHash: string,
): boolean {
	const [algorithm, saltPart, hashPart] = secretHash.split("$");
	if (algorithm !== HASH_ALGORITHM || !saltPart || !hashPart) {
		return false;
	}
	try {
		const salt = Buffer.from(saltPart, "base64url");
		const expected = Buffer.from(hashPart, "base64url");
		const derived = scryptSync(secret, salt, expected.length);
		return timingSafeEqual(derived, expected);
	} catch {
		// Malformed persisted material is a verification failure, not a crash.
		return false;
	}
}

export function generateServiceCredential(): GeneratedServiceCredential {
	const prefix = `anx${randomFromAlphabet(PREFIX_LENGTH - 3)}`;
	const secret = randomBytes(SECRET_BYTES).toString("base64url");
	return {
		prefix,
		secret,
		secretHash: hashServiceCredentialSecret(secret),
	};
}

/** Splits a delivered key (`<prefix>.<secret>`) without trusting its shape. */
export function parseServiceCredentialKey(
	key: string,
): { prefix: string; secret: string } | null {
	const separator = key.indexOf(".");
	if (separator <= 0 || separator === key.length - 1) {
		return null;
	}
	const prefix = key.slice(0, separator);
	const secret = key.slice(separator + 1);
	if (prefix.length > 32 || secret.length > 256) {
		return null;
	}
	return { prefix, secret };
}

/**
 * R03 SessionRef: hashes the session owner's opaque reference so the module can
 * correlate revocations without ever storing a session token.
 */
export function hashSessionRef(rawRef: string): string {
	return createHash("sha256").update(rawRef, "utf8").digest("hex");
}
