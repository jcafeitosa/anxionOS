import type { ComputerSessionRef } from "@anxionos/contracts/openbot";
import { OPENBOT_COMPUTER_TOOL_PREFIX } from "@anxionos/contracts/openbot";

/** Tools under this prefix require an active computer session (R144-03). */
export function toolRequiresComputerSession(toolName: string): boolean {
	return toolName.startsWith(OPENBOT_COMPUTER_TOOL_PREFIX);
}

export type ComputerSessionAuthorityDenial =
	| "openbot.computer.session.required"
	| "openbot.computer.session.mismatch"
	| "openbot.computer.takeover.active"
	| "openbot.computer.authority.revoked";

/** Validates bot tool authority against live session state (R144-03, R144-05). */
export function evaluateComputerSessionAuthority(input: {
	session: ComputerSessionRef | undefined;
	organizationId: string;
	agentId: string;
	presentedAuthorityToken?: string;
	isAuthorityRevoked?: (authorityToken: string) => boolean;
}): ComputerSessionAuthorityDenial | null {
	if (!input.session || input.session.status !== "active") {
		return "openbot.computer.session.required";
	}
	if (
		input.session.organizationId !== input.organizationId ||
		input.session.agentId !== input.agentId
	) {
		return "openbot.computer.session.mismatch";
	}
	if (input.presentedAuthorityToken) {
		if (input.isAuthorityRevoked?.(input.presentedAuthorityToken)) {
			return "openbot.computer.authority.revoked";
		}
		if (input.presentedAuthorityToken !== input.session.authorityToken) {
			return "openbot.computer.authority.revoked";
		}
	} else if (input.isAuthorityRevoked?.(input.session.authorityToken)) {
		return "openbot.computer.authority.revoked";
	}
	if (input.session.controller !== "bot") {
		return "openbot.computer.takeover.active";
	}
	return null;
}
