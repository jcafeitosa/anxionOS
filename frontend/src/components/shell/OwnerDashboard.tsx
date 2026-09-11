import type { PostLoginAuthContext } from "../../lib/auth";
import { ownerDashboardModel } from "../../lib/owner-dashboard";
import { ArchifyCanvas } from "./ArchifyCanvas";
import { HonestState } from "./HonestState";
import { OwnerAgentsCatalog } from "./OwnerAgentsCatalog";
import { OwnerApprovalsPanel } from "./OwnerApprovalsPanel";
import { OwnerFinancePanel } from "./OwnerFinancePanel";
import { OwnerGrantsPanel } from "./OwnerGrantsPanel";
import { OwnerTeamPanel } from "./OwnerTeamPanel";

interface OwnerDashboardProps {
	context: PostLoginAuthContext;
	agencyId: string;
	nowMs?: number;
}

export function OwnerDashboard({
	context,
	agencyId,
	nowMs = Date.now(),
}: OwnerDashboardProps) {
	const model = ownerDashboardModel(context, agencyId, nowMs);

	return (
		<ArchifyCanvas
			title="anxionOS — visão de plataforma"
			testId="owner-dashboard"
			defaultSelectedId="frontend"
			passport={() => (
				<div className="flex flex-col gap-4 border-t border-border pt-4">
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Dados do loader
					</p>
					<dl className="grid gap-2 text-xs" data-testid="owner-membership">
						<div>
							<dt className="text-muted-foreground">agencyId</dt>
							<dd className="break-all font-mono text-foreground">{agencyId}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">role</dt>
							<dd className="font-mono text-foreground">
								{model.membershipRole ?? "não encontrado"}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">e-mail verificado</dt>
							<dd className="font-mono text-foreground">
								{model.emailVerified ? "true" : "false"}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">TTL</dt>
							<dd className="font-mono text-foreground">
								{model.freshness === "fresh"
									? "Dentro do TTL"
									: model.freshness === "stale"
										? "TTL expirado"
										: "TTL ausente"}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">policyVersion</dt>
							<dd className="font-mono text-foreground">
								{model.policyVersion ?? "ausente"}
							</dd>
						</div>
					</dl>
					<p className="text-sm" data-testid="owner-platform-grant">
						{model.platformAccess
							? "O loader autorizou acesso PLATFORM."
							: "platformAccess=false — console /platform permanece negado."}
					</p>
					<p className="text-sm text-muted-foreground" data-testid="owner-partner-grant">
						{model.partnerAccess
							? "O loader autorizou acesso partner."
							: "partnerAccess=false — console /partner permanece negado."}
					</p>
				</div>
			)}
			footer={
				<>
					<OwnerTeamPanel agencyId={agencyId} />
					<OwnerGrantsPanel agencyId={agencyId} />
					<OwnerApprovalsPanel agencyId={agencyId} />
					{model.pendingCount > 0 ? (
						<section aria-labelledby="owner-pending-heading" id="pending-invites">
							<h2
								id="owner-pending-heading"
								className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
							>
								Convites
							</h2>
							<HonestState
								kind="pending"
								titleAs="h3"
								title={`${model.pendingCount} convite(s) pendente(s)`}
								description="membershipsPending do loader para esta agência. Nenhum teammate é inventado."
							/>
						</section>
					) : null}
					<OwnerAgentsCatalog agencyId={agencyId} />
					<OwnerFinancePanel agencyId={agencyId} />
				</>
			}
		/>
	);
}
