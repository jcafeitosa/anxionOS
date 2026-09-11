import type { EvaluationCertificationIssuedBridge } from "@anxionos/contracts/evaluation";
import type { StrategiesCommandResult } from "@anxionos/contracts/strategies";

/** Port boundary for evaluation.certification.issued.v1 consumption in strategies workers. */
export interface EvaluationCertificationConsumerPort {
	handleCertificationIssued(
		certification: EvaluationCertificationIssuedBridge,
		eventId: string,
	): Promise<StrategiesCommandResult>;
}
