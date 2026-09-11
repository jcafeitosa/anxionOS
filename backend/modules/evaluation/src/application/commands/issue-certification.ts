import { randomUUID } from "node:crypto";
import type {
	EvaluationCommandResult,
	IssueCertificationCommand,
} from "@anxionos/contracts/evaluation";
import {
	evaluationCommandResultSchema,
	issueCertificationCommandSchema,
} from "@anxionos/contracts/evaluation";
import { createCertificationIssuedEvent } from "../../domain/events/evaluation-events";
import type { CertificationSubjectQueryPort } from "../../domain/ports/certification-subject";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { EvaluationUnitOfWork } from "../../domain/ports/evaluation-unit-of-work";
import type { ScoringPolicyQueryPort } from "../../domain/ports/scoring-policy";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwEvaluationError } from "../errors";

const CERTIFIABLE_LIFECYCLE_STATES = new Set(["EVALUATED", "CERTIFIED"]);
const SUBJECT_TYPE = "strategy_version" as const;

export interface IssueCertificationDeps {
	unitOfWork: EvaluationUnitOfWork;
	commandJournal: CommandJournalRepository;
	subjectQuery: CertificationSubjectQueryPort;
	scoringPolicyQuery: ScoringPolicyQueryPort;
}

export async function issueCertification(
	deps: IssueCertificationDeps,
	input: IssueCertificationCommand,
): Promise<EvaluationCommandResult> {
	const command = issueCertificationCommandSchema.parse(input);
	const existingCommand = await deps.commandJournal.findByCommandId(
		command.commandId,
	);
	if (
		existingCommand &&
		existingCommand.organizationId !== command.organizationId
	) {
		throwEvaluationError(
			"EVL_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const replayByCommand = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replayByCommand) return replayByCommand;

	if (!command.policyHash) {
		throwEvaluationError(
			"EVL_POLICY_MISSING",
			"published scoring policy hash is required",
		);
	}
	const policyPublished = await deps.scoringPolicyQuery.isPublishedPolicyHash({
		organizationId: command.organizationId,
		policyHash: command.policyHash,
	});
	if (!policyPublished) {
		throwEvaluationError(
			"EVL_POLICY_MISSING",
			`scoring policy ${command.policyHash} is not published`,
		);
	}

	const subject = await deps.subjectQuery.findStrategyVersionSubject({
		organizationId: command.organizationId,
		strategyId: command.strategyId,
		strategyVersionId: command.strategyVersionId,
	});
	if (
		!subject ||
		subject.strategyId !== command.strategyId ||
		subject.strategyVersionId !== command.strategyVersionId
	) {
		throwEvaluationError(
			"EVL_SUBJECT_INVALID",
			"strategy version subject not found for certification",
		);
	}
	if (!CERTIFIABLE_LIFECYCLE_STATES.has(subject.lifecycleState)) {
		throwEvaluationError(
			"EVL_SUBJECT_INVALID",
			`strategy version lifecycle ${subject.lifecycleState} is not certifiable`,
		);
	}

	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const racedByCommand = await ctx.commandJournal.findByCommandId(
			command.commandId,
		);
		if (racedByCommand) {
			if (racedByCommand.organizationId !== command.organizationId) {
				throwEvaluationError(
					"EVL_CROSS_TENANT",
					"command journal organization mismatch",
				);
			}
			const parsed = parseCommandResultSnapshot(
				racedByCommand.responseSnapshot,
			);
			return evaluationCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}

		const existingCertification = await ctx.certifications.findBySubject({
			organizationId: command.organizationId,
			subjectType: SUBJECT_TYPE,
			strategyId: command.strategyId,
			strategyVersionId: command.strategyVersionId,
			policyHash: command.policyHash,
		});
		if (existingCertification) {
			if (existingCertification.organizationId !== command.organizationId) {
				throwEvaluationError(
					"EVL_CROSS_TENANT",
					"certification organization mismatch",
				);
			}
			const result = evaluationCommandResultSchema.parse({
				aggregateId: existingCertification.id,
				revision: 1,
				certificationId: existingCertification.id,
				evaluationRecordId: existingCertification.evaluationRecordId,
				idempotentReplay: true,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "issueCertification",
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}

		if (command.evaluationRecordId) {
			const evaluationRecord = await ctx.evaluationRecords.findById(
				command.evaluationRecordId,
			);
			if (!evaluationRecord) {
				throwEvaluationError(
					"EVL_RECORD_NOT_FOUND",
					`evaluation record ${command.evaluationRecordId} not found`,
				);
			}
			if (evaluationRecord.organizationId !== command.organizationId) {
				throwEvaluationError(
					"EVL_CROSS_TENANT",
					"evaluation record organization mismatch",
				);
			}
		}

		const certificationId = `evl_crt_${randomUUID()}`;
		const issuedAt = new Date().toISOString();
		const savedCertification = await ctx.certifications.save({
			id: certificationId,
			organizationId: command.organizationId,
			subjectType: SUBJECT_TYPE,
			strategyId: command.strategyId,
			strategyVersionId: command.strategyVersionId,
			evaluationRecordId: command.evaluationRecordId,
			policyHash: command.policyHash,
			status: "issued",
			issuedAt,
		});

		await ctx.publishEvents([
			createCertificationIssuedEvent({
				certificationId: savedCertification.id,
				organizationId: savedCertification.organizationId,
				strategyId: savedCertification.strategyId,
				strategyVersionId: savedCertification.strategyVersionId,
				evaluationRecordId: savedCertification.evaluationRecordId,
				policyHash: savedCertification.policyHash,
				issuedAt,
			}),
		]);

		const result = evaluationCommandResultSchema.parse({
			aggregateId: savedCertification.id,
			revision: 1,
			certificationId: savedCertification.id,
			evaluationRecordId: savedCertification.evaluationRecordId,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "issueCertification",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
