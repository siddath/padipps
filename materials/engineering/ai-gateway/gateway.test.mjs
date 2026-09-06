import assert from 'node:assert/strict';
import test from 'node:test';
import { createFakeProvider } from './fake-provider.mjs';
import { createGateway } from './gateway.mjs';

const input = { incidentId: 'INC-FICTION-042', queueDepth: 87, destinationLatencyMs: 940 };

async function expectCode(fixture, code) {
  const provider = createFakeProvider(fixture);
  const gateway = createGateway({ provider });
  await assert.rejects(() => gateway.evaluate(input), error => error?.code === code);
  assert.equal(provider.calls, 1);
}

test('valid fake response is parsed and schema-validated without network access', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('network access is forbidden in this exercise'); };
  try {
    const provider = createFakeProvider('valid');
    const result = await createGateway({ provider }).evaluate(input);
    assert.deepEqual(result, { decision: 'pause', operatorMessage: 'Queue growth requires operator review.' });
    assert.equal(provider.calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('provider refusal maps to the refusal contract', () => expectCode('refusal', 'PROVIDER_REFUSAL'));
test('invalid JSON maps to the invalid-response contract', () => expectCode('invalid-json', 'INVALID_PROVIDER_RESPONSE'));
test('timeout maps to the timeout contract', () => expectCode('timeout', 'PROVIDER_TIMEOUT'));
test('unsafe output is rejected after parsing', () => expectCode('unsafe-output', 'UNSAFE_OUTPUT'));
