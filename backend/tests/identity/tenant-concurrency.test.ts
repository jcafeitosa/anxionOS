import { describe, expect, test } from "bun:test";
import { registerPrincipal } from "@anxionos/identity";
import {
	createInMemoryPrincipalRepository,
	createInMemoryServiceIdentityRepository,
	createRecordingUnitOfWork,
} from "./test-support";

describe("identity tenant/concurrency", () => {
	test("concurrent register with same authUserId yields one principal", async () => {
		const repository = createInMemoryPrincipalRepository();
		const { unitOfWork, published } = createRecordingUnitOfWork(
			repository,
			createInMemoryServiceIdentityRepository(),
		);
		const results = await Promise.all(
			Array.from({ length: 5 }, () =>
				registerPrincipal(
					{ repository, unitOfWork },
					{ authUserId: "tenant-auth-1", email: "tenant@example.com" },
				),
			),
		);
		const uniqueIds = new Set(results.map((principal) => principal.id));
		expect(uniqueIds.size).toBe(1);
		expect(published.length).toBeGreaterThanOrEqual(1);
		expect(published.length).toBeLessThanOrEqual(5);
	});
});
