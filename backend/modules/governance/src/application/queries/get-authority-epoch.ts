import type {
	AuthorityEpochRecord,
	AuthorityEpochStore,
} from "../../domain/ports/authority-epoch-store";

export interface GetAuthorityEpochDeps {
	authorityEpochStore: AuthorityEpochStore;
}

export async function getAuthorityEpoch(
	deps: GetAuthorityEpochDeps,
	scopeId: string,
): Promise<AuthorityEpochRecord> {
	return deps.authorityEpochStore.get(scopeId);
}
