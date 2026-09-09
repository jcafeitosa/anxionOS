import type { PoolClient } from "pg";
import type {
  HealthCheckRecord,
  HealthCheckRepository,
  IncidentRecord,
  IncidentRepository,
} from "../../domain/ports/operations-unit-of-work";

function mapHealthCheck(row: Record<string, unknown>): HealthCheckRecord {
    return {
        id: String(row.id),
        organizationId: String(row.organization_id),
        serviceId: String(row.service_id),
        status: String(row.status),
        probeDetails: (row.probe_details as Record<string, unknown> | null) ?? null,
        checkedAt: (row.checked_at as Date).toISOString(),
        revision: Number(row.revision),
    };
}
function mapIncident(row: Record<string, unknown>): IncidentRecord {
    return {
        id: String(row.id),
        organizationId: String(row.organization_id),
        title: String(row.title),
        description: row.description ? String(row.description) : null,
        severity: String(row.severity),
        status: String(row.status),
        serviceId: row.service_id ? String(row.service_id) : null,
        openedAt: (row.opened_at as Date).toISOString(),
    };
}
export function createPgHealthCheckRepository(client: PoolClient): HealthCheckRepository {
    return {
        async findByOrganizationAndServiceId(organizationId, serviceId) {
            const result = await client.query(`SELECT * FROM operations_health_checks WHERE organization_id = $1 AND service_id = $2`, [organizationId, serviceId]);
            const row = result.rows[0];
            return row ? mapHealthCheck(row) : null;
        },
        async save(record: HealthCheckRecord) {
            await client.query(`INSERT INTO operations_health_checks (
			   id, organization_id, service_id, status, probe_details, checked_at, revision
			 ) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
                record.id,
                record.organizationId,
                record.serviceId,
                record.status,
                record.probeDetails,
                record.checkedAt,
                record.revision,
            ]);
            return record;
        },
        async update(record: HealthCheckRecord) {
            await client.query(`UPDATE operations_health_checks
			 SET status = $2, probe_details = $3, checked_at = $4, revision = $5, updated_at = now()
			 WHERE id = $1`, [
                record.id,
                record.status,
                record.probeDetails,
                record.checkedAt,
                record.revision,
            ]);
            return record;
        },
    };
}
export function createPgIncidentRepository(client: PoolClient): IncidentRepository {
    return {
        async findById(id) {
            const result = await client.query(`SELECT * FROM operations_incidents WHERE id = $1`, [id]);
            const row = result.rows[0];
            return row ? mapIncident(row) : null;
        },
        async save(record: IncidentRecord) {
            await client.query(`INSERT INTO operations_incidents (
			   id, organization_id, title, description, severity, status, service_id, opened_at
			 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [
                record.id,
                record.organizationId,
                record.title,
                record.description,
                record.severity,
                record.status,
                record.serviceId,
                record.openedAt,
            ]);
            return record;
        },
    };
}
