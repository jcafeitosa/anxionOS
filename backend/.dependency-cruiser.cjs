/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
	forbidden: [
		{
			name: "packages-not-apps",
			comment:
				"AR01: shared packages must not depend on composition roots (apps).",
			severity: "error",
			from: { path: "^packages/" },
			to: { path: "^apps/" },
		},
		{
			name: "contracts-no-modules",
			comment: "AR02: contracts publish versioned schemas; no module imports.",
			severity: "error",
			from: { path: "^packages/contracts/" },
			to: { path: "^modules/" },
		},
		{
			name: "domain-not-apps",
			comment: "AR01 (future): module domain layers must not import apps.",
			severity: "error",
			from: { path: "^modules/.+/domain/" },
			to: { path: "^apps/" },
		},
		{
			name: "domain-not-infra",
			comment:
				"AR01 (future): module domain must not import infrastructure or apps.",
			severity: "error",
			from: { path: "^modules/.+/domain/" },
			to: {
				path: [
					"^apps/",
					"^packages/database/",
					"^packages/eventing/",
					"node_modules/elysia",
					"node_modules/drizzle-orm",
				],
			},
		},
	],
	options: {
		doNotFollow: { path: "node_modules" },
		tsPreCompilationDeps: true,
		combinedDependencies: true,
	},
};
