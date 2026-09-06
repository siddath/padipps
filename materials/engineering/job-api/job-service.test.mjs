import assert from 'node:assert/strict';
import test from 'node:test';
import { createJobService } from './job-service.mjs';

const payload = { sourceTenant: 'tenant-orchid', targetTenant: 'tenant-orchid-v2' };

test('repeating the same key and payload returns the same job', () => {
  const service = createJobService();
  const first = service.create(payload, 'idem-001');
  const retry = service.create({ ...payload }, 'idem-001');
  assert.equal(retry.id, first.id);
  assert.deepEqual(retry, first);
});

test('reusing a key with a conflicting payload is rejected', () => {
  const service = createJobService();
  service.create(payload, 'idem-002');
  assert.throws(
    () => service.create({ ...payload, targetTenant: 'tenant-cedar-v2' }, 'idem-002'),
    error => error?.code === 'IDEMPOTENCY_CONFLICT'
  );
});

test('invalid input is rejected with the contract error', () => {
  const service = createJobService();
  assert.throws(
    () => service.create({ sourceTenant: '', targetTenant: 'tenant-orchid-v2' }, 'idem-003'),
    error => error?.code === 'INVALID_INPUT'
  );
});

test('retries do not duplicate the stored job', () => {
  const service = createJobService();
  service.create(payload, 'idem-004');
  service.create({ ...payload }, 'idem-004');
  assert.equal(service.list().length, 1);
});
