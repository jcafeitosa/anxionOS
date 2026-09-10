const SEGMENTS = [
	"grafo → autoridade",
	"membership → console",
	"grant PLATFORM = explícito",
	"partner = explícito",
	"fail-closed sem grant",
	"journal + outbox",
	"loader /v1/auth/post-login-context",
] as const;

export function InstitutionalTicker() {
	const loop = [...SEGMENTS, ...SEGMENTS];
	return (
		<div className="overflow-hidden" aria-label="Trilha institucional">
			<div className="institutional-ticker">
				{loop.map((segment, index) => (
					<span key={`${segment}-${index}`}>{segment}</span>
				))}
			</div>
		</div>
	);
}
