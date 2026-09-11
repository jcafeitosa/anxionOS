import {
	canAccessConsole,
	type ConsoleAccessContext,
	type ConsoleKind,
} from "./console-access.ts";

export type ConsoleNavIcon = "dashboard" | "agency" | "access" | "logout";

export interface ConsoleNavLink {
	id: string;
	label: string;
	href: string;
	icon: ConsoleNavIcon;
	current?: boolean;
	testId: string;
}

export function consoleRoot(kind: ConsoleKind, agencyId?: string): string {
	if (kind === "owner" && agencyId) {
		return `/agency/${agencyId}`;
	}
	if (kind === "operator" && agencyId) {
		return `/operator/${agencyId}`;
	}
	if (kind === "platform") {
		return "/platform";
	}
	return "/partner";
}

/**
 * Role-scoped console links. Extra consoles appear only when
 * `canAccessConsole` is true (fail-closed; no invented grants).
 */
export function consoleNavItems(
	kind: ConsoleKind,
	context: ConsoleAccessContext,
	agencyId?: string,
): ConsoleNavLink[] {
	const root = consoleRoot(kind, agencyId);
	const items: ConsoleNavLink[] = [
		{
			id: "dashboard",
			label: "Visão geral",
			href: root,
			icon: "dashboard",
			current: true,
			testId: "console-nav-dashboard",
		},
	];

	if (kind === "owner") {
		items.push({
			id: "owner-agency",
			label: "Agência",
			href: `${root}#team`,
			icon: "agency",
			testId: "console-nav-owner-agency",
		});
		items.push({
			id: "access",
			label: "Acesso",
			href: `${root}#grants`,
			icon: "access",
			testId: "console-nav-access",
		});
	} else if (kind === "operator") {
		items.push({
			id: "operator-agency",
			label: "Operação",
			href: `${root}#activity`,
			icon: "agency",
			testId: "console-nav-operator-agency",
		});
		items.push({
			id: "access",
			label: "Acesso",
			href: `${root}#settings`,
			icon: "access",
			testId: "console-nav-access",
		});
	} else {
		items.push({
			id: "access",
			label: "Acesso",
			href: `${root}#settings`,
			icon: "access",
			testId: "console-nav-access",
		});
	}

	if (canAccessConsole(context, "owner", agencyId) && kind !== "owner") {
		items.push({
			id: "owner-console",
			label: "Owner Console",
			href: `/agency/${agencyId}`,
			icon: "agency",
			testId: "console-nav-owner-agency",
		});
	}
	if (canAccessConsole(context, "operator", agencyId) && kind !== "operator") {
		items.push({
			id: "operator-console",
			label: "Operator Console",
			href: `/operator/${agencyId}`,
			icon: "agency",
			testId: "console-nav-operator-agency",
		});
	}
	if (canAccessConsole(context, "platform") && kind !== "platform") {
		items.push({
			id: "platform-console",
			label: "Platform Console",
			href: "/platform",
			icon: "access",
			testId: "console-nav-platform",
		});
	}
	if (canAccessConsole(context, "partner") && kind !== "partner") {
		items.push({
			id: "partner-console",
			label: "Partner Console",
			href: "/partner",
			icon: "access",
			testId: "console-nav-partner",
		});
	}

	items.push({
		id: "logout",
		label: "Sair",
		href: "/login",
		icon: "logout",
		testId: "console-nav-logout",
	});

	return items;
}
