import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { summarize } from './analyze.mjs';
const { events } = JSON.parse(readFileSync(new URL('./telemetry.json', import.meta.url)));

test('synthetic terminal requests preserve failures and deduplicate delivery', () => {
  assert.deepEqual(summarize(events), { requests: 4, successes: 2, dependencyErrors: 1, denied: 1, successRate: 0.5, meanDurationMs: 605 });
});
test('no observations is unavailable, not perfect reliability', () => {
  assert.deepEqual(summarize([]), { requests: 0, successes: 0, dependencyErrors: 0, denied: 0, successRate: null, meanDurationMs: null });
});
test('conflicting identity, invalid values and sensitive extra fields are rejected', () => {
  assert.throws(() => summarize([events[0], { ...events[0], durationMs: 900 }]), /conflict/i);
  assert.throws(() => summarize([{ ...events[0], durationMs: -1 }]), /invalid/i);
  assert.throws(() => summarize([{ ...events[0], documentBody: 'synthetic forbidden content' }]), /field/i);
});
