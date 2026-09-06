/**
 * Build an in-memory migration job service.
 *
 * Returned API:
 *   service.create(payload, idempotencyKey) -> job
 *   service.list() -> job[]
 *
 * Required errors expose code `INVALID_INPUT` or `IDEMPOTENCY_CONFLICT`.
 * A job has at least: { id, idempotencyKey, sourceTenant, targetTenant, status }.
 */
export function createJobService() {
  throw new Error('TODO: implement the idempotent job service yourself');
}
