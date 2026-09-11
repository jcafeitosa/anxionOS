export class SimulationRunRevisionConflictError extends Error {
	constructor() {
		super("simulation run revision conflict");
		this.name = "SimulationRunRevisionConflictError";
	}
}
