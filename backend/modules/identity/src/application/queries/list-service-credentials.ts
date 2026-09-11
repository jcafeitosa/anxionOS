import type { ServiceCredentialDto } from "@anxionos/contracts/identity";
import type { ServiceCredentialRepository } from "../../domain/ports/service-credential-repository";
import { toServiceCredentialDto } from "../presenters";

/**
 * Credentials of a service identity as DTOs. The hash and the plaintext secret
 * are dropped by the presenter, so this is safe for the HTTP/agent boundary.
 */
export async function listServiceCredentials(
	deps: { serviceCredentialRepository: ServiceCredentialRepository },
	serviceIdentityId: string,
): Promise<ServiceCredentialDto[]> {
	const credentials =
		await deps.serviceCredentialRepository.listByServiceIdentityId(
			serviceIdentityId,
		);
	return credentials.map(toServiceCredentialDto);
}
