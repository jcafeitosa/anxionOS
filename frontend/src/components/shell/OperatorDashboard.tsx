import type { PostLoginAuthContext } from "../../lib/auth";
import { membershipForAgency } from "../../lib/owner-dashboard";
import { ArchifyCanvas } from "./ArchifyCanvas";
import { OperatorIncidentsPanel } from "./OperatorIncidentsPanel";
import { OperatorKillSwitchPanel } from "./OperatorKillSwitchPanel";
import { OperatorOrdersPanel } from "./OperatorOrdersPanel";
import { OperatorReconciliationPanel } from "./OperatorReconciliationPanel";
import { OperatorTakeoverPanel } from "./OperatorTakeoverPanel";

interface OperatorDashboardProps {
	context: PostLoginAuthContext;
	agencyId: string;
}

export function OperatorDashboard({ context, agencyId }: OperatorDashboardProps) {
	const membership = membershipForAgency(context, agencyId);

	return (
		<ArchifyCanvas
			title="anxionOS — visão operator"
			testId="operator-dashboard"
			defaultSelectedId="frontend"
			passport={() => (
				<div className="flex flex-col gap-4 border-t border-border pt-4">
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Dados do loader
					</p>
					<dl className="grid gap-2 text-xs" data-testid="operator-membership">
						<div>
							<dt className="text-muted-foreground">agencyId</dt>
							<dd className="break-all font-mono text-foreground">{agencyId}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">role</dt>
							<dd className="font-mono text-foreground">
								{membership?.role ?? context.decision.kind}
							</dd>
						</div>
					</dl>
					<p className="text-sm" data-testid="operator-platform-grant">
						{context.platformAccess === true
							? "O loader autorizou acesso PLATFORM."
							: "platformAccess=false — console /platform permanece negado."}
					</p>
					<p
						className="text-sm text-muted-foreground"
						data-testid="operator-partner-grant"
					>
						{context.partnerAccess === true
							? "O loader autorizou acesso partner."
							: "partnerAccess=false — console /partner permanece negado."}
					</p>
				</div>
			)}
			footer={
				<div className="flex flex-col gap-8">
					<section aria-labelledby="operator-operational-heading" id="team">
						<h2
							id="operator-operational-heading"
							className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
						>
							Dados operacionais
						</h2>
						<OperatorIncidentsPanel agencyId={agencyId} />
						<OperatorTakeoverPanel agencyId={agencyId} />
						<OperatorKillSwitchPanel
							agencyId={agencyId}
							operatorPrincipalId={context.principal?.id ?? null}
						/>
					</section>
					<OperatorOrdersPanel agencyId={agencyId} />
					<OperatorReconciliationPanel agencyId={agencyId} />
				</div>
			}
		/>
	);
}
