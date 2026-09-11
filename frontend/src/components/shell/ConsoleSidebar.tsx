import {
	Building2,
	LayoutDashboard,
	LogOut,
	Settings,
	Shield,
} from "lucide-react";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { authClient, type ConsoleKind, type PostLoginAuthContext } from "../../lib/auth";
import { consoleNavItems, type ConsoleNavIcon } from "../../lib/console-nav";
import {
	Sidebar,
	SidebarBody,
	SidebarLink,
	useSidebar,
} from "../ui/sidebar";

const titles: Record<ConsoleKind, string> = {
	owner: "Owner Console",
	operator: "Operator Console",
	platform: "Platform Console",
	partner: "Partner Console",
};

function iconFor(kind: ConsoleNavIcon) {
	const className = "size-5 shrink-0 text-accent";
	switch (kind) {
		case "dashboard":
			return <LayoutDashboard className={className} aria-hidden="true" />;
		case "agency":
			return <Building2 className={className} aria-hidden="true" />;
		case "access":
			return <Settings className={className} aria-hidden="true" />;
		case "logout":
			return <LogOut className={className} aria-hidden="true" />;
		default: {
			const exhaustive: never = kind;
			return exhaustive;
		}
	}
}

function LogoMark({ kind }: { kind: ConsoleKind }) {
	const { open, animate } = useSidebar();
	const showLabel = !animate || open;
	return (
		<div className="flex min-h-11 items-center gap-2 py-1">
			<Building2 className="size-6 shrink-0 text-accent" aria-hidden="true" />
			{showLabel ? (
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-foreground">anxionOS</p>
					<p className="truncate text-xs text-muted-foreground">{titles[kind]}</p>
				</div>
			) : null}
		</div>
	);
}

function SessionAvatar({
	email,
	displayName,
}: {
	email: string;
	displayName?: string | null;
}) {
	const { open, animate } = useSidebar();
	const showLabel = !animate || open;
	const initial = (displayName ?? email).trim().slice(0, 1).toUpperCase() || "U";
	return (
		<div className="flex min-h-11 items-center gap-2" data-testid="console-sidebar-session">
			<span
				className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground"
				aria-hidden="true"
			>
				{initial}
			</span>
			{showLabel ? (
				<span className="truncate text-xs text-muted-foreground">{email}</span>
			) : (
				<span className="sr-only">{email}</span>
			)}
		</div>
	);
}

async function signOutAndLeave(event: MouseEvent<HTMLAnchorElement>) {
	event.preventDefault();
	await authClient.signOut();
	window.location.assign("/login");
}

export function ConsoleSidebar({
	kind,
	agencyId,
	context,
	children,
}: {
	kind: ConsoleKind;
	agencyId?: string;
	context: PostLoginAuthContext;
	children: ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const [animate, setAnimate] = useState(true);
	const links = consoleNavItems(kind, context, agencyId);
	const email = context.principal?.email ?? "sessão confirmada";
	const displayName = context.principal?.displayName;

	useEffect(() => {
		const media = window.matchMedia("(prefers-reduced-motion: reduce)");
		const sync = () => setAnimate(!media.matches);
		sync();
		media.addEventListener("change", sync);
		return () => media.removeEventListener("change", sync);
	}, []);

	return (
		<div className="flex min-h-dvh w-full bg-background">
			<Sidebar open={open} setOpen={setOpen} animate={animate}>
				<SidebarBody
					className="justify-between gap-10 overflow-hidden"
					data-testid="console-sidebar"
					data-console={kind}
				>
					<div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
						<LogoMark kind={kind} />
						<nav
							className="mt-6 flex flex-col gap-1"
							aria-label={`Menu ${titles[kind]}`}
						>
							{links.map((item) => (
								<SidebarLink
									key={item.id}
									link={{
										label: item.label,
										href: item.href,
										icon: iconFor(item.icon),
									}}
									data-testid={item.testId}
									aria-current={item.current ? "page" : undefined}
									onClick={item.id === "logout" ? signOutAndLeave : undefined}
								/>
							))}
						</nav>
					</div>
					<div className="flex flex-col gap-2">
						<div className="hidden items-center gap-2 md:flex" role="status" aria-label="Sessão">
							<Shield className="size-4 shrink-0 text-accent" aria-hidden="true" />
						</div>
						<SessionAvatar email={email} displayName={displayName} />
					</div>
				</SidebarBody>
			</Sidebar>
			{children}
		</div>
	);
}
