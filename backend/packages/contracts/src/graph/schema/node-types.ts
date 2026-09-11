import { z } from "zod";
export const graphSchemaStatusSchema = z.enum([
	"active",
	"deprecated",
	"disabled",
]);
export const nodeTypeDefSchema = z.object({
	nodeType: z.string().min(1).max(64),
	schemaVersion: z.number().int().positive(),
	ownerDomain: z.string().min(1),
	status: graphSchemaStatusSchema,
	payloadSchemaRef: z.string().min(1),
	checksum: z.string().min(1),
});
export type GraphSchemaStatus = z.infer<typeof graphSchemaStatusSchema>;
export type NodeTypeDef = z.infer<typeof nodeTypeDefSchema>;
/** F0 seed refs — Agency, User, Membership, Grant (R09 fixture registry). */
export const GRAPH_F0_NODE_TYPES = [
	{
		nodeType: "Agency",
		schemaVersion: 1,
		ownerDomain: "organizations",
		status: "active",
		payloadSchemaRef: "graph/schema/v1/Agency.json",
		checksum: "sha256:f0-agency-v1",
	},
	{
		nodeType: "User",
		schemaVersion: 1,
		ownerDomain: "identity",
		status: "active",
		payloadSchemaRef: "graph/schema/v1/User.json",
		checksum: "sha256:f0-user-v1",
	},
	{
		nodeType: "Membership",
		schemaVersion: 1,
		ownerDomain: "organizations",
		status: "active",
		payloadSchemaRef: "graph/schema/v1/Membership.json",
		checksum: "sha256:f0-membership-v1",
	},
	{
		nodeType: "Grant",
		schemaVersion: 1,
		ownerDomain: "governance",
		status: "active",
		payloadSchemaRef: "graph/schema/v1/Grant.json",
		checksum: "sha256:f0-grant-v1",
	},
] satisfies readonly NodeTypeDef[];

