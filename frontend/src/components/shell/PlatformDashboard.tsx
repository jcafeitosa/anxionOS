import { HonestState } from "./HonestState";

interface PlatformDashboardProps {
	platformAccess: boolean;
}

/**
 * ANX-166 P07 — Platform Console painéis de operação.
 *
 * Escopo PLATFORM explícito, sem agencyId: nenhum dado de Agency é exibido
 * aqui. Os painéis consomem a UI honesta (loading/empty/denied/stale) até que
 * o módulo operations (ANX-158) exponha os endpoints de plataforma.
 */
export function PlatformDashboard({ platformAccess }: PlatformDashboardProps) {
	if (!platformAccess) {
		return (
			<section
				aria-labelledby="platform-access-heading"
				data-testid="platform-dashboard-denied"
			>
				<h2
					id="platform-access-heading"
					className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
				>
					Operação da plataforma
				</h2>
				<HonestState
					kind="denied"
					titleAs="h3"
					title="Acesso PLATFORM negado"
					description="O loader não autorizou este principal para o console de plataforma."
				/>
			</section>
		);
	}

	return (
		<div className="flex flex-col gap-8" data-testid="platform-dashboard">
			<section aria-labelledby="platform-health-heading" id="health">
				<h2
					id="platform-health-heading"
					className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
				>
					Saúde e incidentes
				</h2>
				<HonestState
					kind="empty"
					titleAs="h3"
					title="Módulo operations em construção"
					description="Health checks e incidentes de plataforma chegam via ANX-158 (operations). Nenhum dado de Agency é listado aqui."
				/>
			</section>

			<section aria-labelledby="platform-runtime-heading" id="runtimes">
				<h2
					id="platform-runtime-heading"
					className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
				>
					Runtimes e quotas
				</h2>
				<HonestState
					kind="empty"
					titleAs="h3"
					title="Runtimes e quotas não publicados"
					description="Quotas/custos de runtime exigem o control plane de plataforma; sem inventar métricas."
				/>
			</section>

			<section aria-labelledby="platform-rollout-heading" id="rollout">
				<h2
					id="platform-rollout-heading"
					className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground"
				>
					Rollout e export/recovery
				</h2>
				<HonestState
					kind="empty"
					titleAs="h3"
					title="Rollout e recovery sob demanda"
					description="Exportação/deleção e break-glass exigem ações privilegiadas com trilha de administração; nenhuma operação é executada sem aprovação."
				/>
			</section>
		</div>
	);
}