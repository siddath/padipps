import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { summarizeCohort, hypotheticalRoi } from './measure.mjs';
const fixture = JSON.parse(readFileSync(new URL('./adoption.json', import.meta.url)));

test('tenant-scoped people, bot/ineligible exclusion, duplicate delivery and denied work', () => {
  assert.deepEqual(summarizeCohort(fixture.people, fixture.events, 'pilot'), {
    eligiblePeople: 3, activePeople: 2, repeatPeople: 1, usefulTasks: 3, attempts: 4,
    activationRate: 2 / 3, usefulTaskRate: 3 / 4
  });
});
test('empty populations and a completely observed empty period retain denominator semantics', () => {
  assert.deepEqual(summarizeCohort([], [], 'pilot'), { eligiblePeople: 0, activePeople: 0, repeatPeople: 0, usefulTasks: 0, attempts: 0, activationRate: null, usefulTaskRate: null });
  const result = summarizeCohort(fixture.people, [], 'pilot');
  assert.equal(result.activationRate, 0);
  assert.equal(result.usefulTaskRate, null);
});
test('conflicting event identities and unknown people cannot silently change a cohort', () => {
  const e = fixture.events[1];
  assert.throws(() => summarizeCohort(fixture.people, [e, { ...e, outcome: 'error' }], 'pilot'), /conflict/i);
  assert.throws(() => summarizeCohort(fixture.people, [{ ...e, userId: 'unknown' }], 'pilot'), /invalid/i);
});
test('missing baseline does not become invented savings', () => {
  assert.deepEqual(hypotheticalRoi({ baselineMinutesPerTask: fixture.observedBaselineMinutesPerTask, pilotMinutesPerTask: 6, completedComparableTasks: 30, hourlyValue: 20, totalCost: 100 }), { grossBenefit: null, netBenefit: null, roi: null });
});
test('hypothetical scenarios retain negative net value and zero-cost ratio uncertainty', () => {
  const scenario = { baselineMinutesPerTask: 10, pilotMinutesPerTask: 6, completedComparableTasks: 30, hourlyValue: 20, totalCost: 100 };
  assert.deepEqual(hypotheticalRoi(scenario), { grossBenefit: 40, netBenefit: -60, roi: -0.6 });
  assert.deepEqual(hypotheticalRoi({ ...scenario, totalCost: 0 }), { grossBenefit: 40, netBenefit: 40, roi: null });
  assert.throws(() => hypotheticalRoi({ ...scenario, totalCost: -1 }), /invalid/i);
});
