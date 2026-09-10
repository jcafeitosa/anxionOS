import { GitBranch, Lock, Server } from "lucide-react";

export type TrailNodeType = "frontend" | "backend" | "security";

export interface DecisionTrailStep {
	id: string;
	type: TrailNodeType;
	label: string;
	sublabel: string;
	emphasis?: boolean;
}

interface DecisionTrailProps {
	title: string;
	steps: readonly DecisionTrailStep[];
}

const typeIcon = {
	frontend: GitBranch,
	backend: Server,
	security: Lock,
} as const;

const typeLabel: Record<TrailNodeType, string> = {
	frontend: "frontend",
	backend: "backend",
	security: "security",
};

function nodeChromeClass(emphasis: boolean | undefined): string {
	if (emphasis) {
		return "absolute -left-[1.875rem] top-0 flex size-9 items-center justify-center rounded-full border border-accent bg-surface text-accent";
	}
	return "absolute -left-[1.875rem] top-0 flex size-9 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground";
}

/**
 * Showcase trail: one main path, few nodes. Archify classic semantic types
 * plus Aceternity Timeline composition (https://ui.aceternity.com/components)
 * without Motion/Emotion — Pro Max reduced-motion and MASTER tokens win.
 */
export function DecisionTrail({ title, steps }: DecisionTrailProps) {
	return (
		<section aria-labelledby="decision-trail-heading" className="flex flex-col gap-4">
			<h2
				id="decision-trail-heading"
				className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
			>
				{title}
			</h2>
			<ol className="relative flex flex-col gap-0 border-l border-border pl-6">
				{steps.map((step, index) => {
					const Icon = typeIcon[step.type];
					const last = index === steps.length - 1;
					return (
						<li
							key={step.id}
							className={last ? "relative flex flex-col gap-1 pb-0" : "relative flex flex-col gap-1 pb-8"}
						>
							<span className={nodeChromeClass(step.emphasis)} aria-hidden="true">
								<Icon strokeWidth={1.75} />
							</span>
							<p className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground">
								{step.label}
							</p>
							<p className="font-mono text-xs text-muted-foreground">
								{typeLabel[step.type]} · {step.sublabel}
							</p>
						</li>
					);
				})}
			</ol>
		</section>
	);
}
