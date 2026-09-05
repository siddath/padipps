import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REFLECTION_TOPICS,
  REFLECTIONS,
  chooseReflection,
  getReflection,
} from '../reflections.js';

test('public reflection catalog has unique, bounded, source-grounded cards', () => {
  assert.equal(REFLECTIONS.length, 15);
  assert.deepEqual(REFLECTION_TOPICS.map(({ id }) => id), ['philosophy', 'art', 'spirituality']);
  assert.equal(new Set(REFLECTIONS.map(({ id }) => id)).size, REFLECTIONS.length);

  for (const topic of REFLECTION_TOPICS) {
    assert.ok(REFLECTIONS.filter((reflection) => reflection.topic === topic.id).length >= 4);
  }

  for (const reflection of REFLECTIONS) {
    assert.match(reflection.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(reflection.title.trim().split(/\s+/).length <= 5);
    assert.ok(reflection.idea.trim().split(/\s+/).length <= 70);
    assert.match(reflection.prompt, /\?$/);
    assert.ok(reflection.source.label.includes('—'));
    assert.equal(new URL(reflection.source.url).protocol, 'https:');
    assert.ok(reflection.source.locator.trim().length > 0);
    assert.match(reflection.framing, /editorial interpretation/i);
    assert.match(reflection.framing, /paraphrased/i);
  }

  assert.doesNotMatch(JSON.stringify(REFLECTIONS), /\/Users\/|file:\/\/|agent metadata/i);
});

test('selection is deterministic and cycles through the enabled topics', () => {
  assert.equal(chooseReflection(0).id, REFLECTIONS[0].id);
  assert.equal(chooseReflection(REFLECTIONS.length).id, REFLECTIONS[0].id);
  assert.equal(chooseReflection(7).id, chooseReflection(7).id);

  const art = REFLECTIONS.filter((reflection) => reflection.topic === 'art');
  assert.equal(chooseReflection(0, ['art']).id, art[0].id);
  assert.equal(chooseReflection(art.length, ['art']).id, art[0].id);
  for (let index = 0; index < art.length * 2; index += 1) {
    assert.equal(chooseReflection(index, ['unknown', 'art', 'art']).topic, 'art');
  }
});

test('no enabled topic returns null and malformed counters are rejected', () => {
  assert.equal(chooseReflection(0, []), null);
  assert.equal(chooseReflection(0, ['unknown']), null);
  assert.equal(chooseReflection(0, null), null);
  assert.throws(() => chooseReflection(-1), /non-negative safe integer/);
  assert.throws(() => chooseReflection(1.5), /non-negative safe integer/);
  assert.throws(() => chooseReflection(Number.MAX_SAFE_INTEGER + 1), /non-negative safe integer/);
});

test('stable IDs retrieve canonical cards without exposing mutable records', () => {
  for (const reflection of REFLECTIONS) {
    assert.equal(getReflection(reflection.id), reflection);
    assert.equal(Object.isFrozen(reflection), true);
    assert.equal(Object.isFrozen(reflection.source), true);
  }
  assert.equal(getReflection('missing-card'), null);
  assert.equal(getReflection(null), null);
});
