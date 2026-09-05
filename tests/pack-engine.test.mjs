import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { catalogForPack, practiceHash, practiceSessions, readPracticeRoute } from '../catalog.js';

const source = readFileSync(new URL('../pack-engine.js', import.meta.url), 'utf8');
const { parsePack, sessionsForTrack, validatePack } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const starterText = readFileSync(new URL('../packs/starter.json', import.meta.url), 'utf8');

test('starter pack is a valid, complete data-only pack', () => {
  const parsed = parsePack(starterText);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.pack.sessions.length, 3);
  assert.equal(parsed.pack.firstSession, 'pair-sum');
  assert.deepEqual(sessionsForTrack(parsed.pack, 'dsa').map((session) => session.id), ['pair-sum']);
  assert.deepEqual(sessionsForTrack(parsed.pack, 'backend').map((session) => session.id), ['retry-safe-command']);
  assert.deepEqual(sessionsForTrack(parsed.pack, 'systems').map((session) => session.id), ['recoverable-work']);
});

test('pack parser rejects hostile schema, scripts, non-http sources, and oversized input', () => {
  const value = JSON.parse(starterText);
  value.pack.sessions[0].script = 'alert(1)';
  assert.equal(validatePack(value).ok, false);

  const unsafeSource = JSON.parse(starterText);
  unsafeSource.pack.sessions[0].sources[0].url = 'javascript:alert(1)';
  assert.equal(parsePack(JSON.stringify(unsafeSource)).ok, false);

  const missingGate = JSON.parse(starterText);
  delete missingGate.pack.sessions[0].decision;
  assert.equal(validatePack(missingGate).ok, false);
  assert.equal(parsePack('x'.repeat(2 * 1024 * 1024)).ok, false);
});

test('pack validates references and generic safe identifiers', () => {
  const missingTrackSession = JSON.parse(starterText);
  missingTrackSession.pack.tracks[0].sessionIds[0] = 'not-in-pack';
  assert.equal(validatePack(missingTrackSession).ok, false);

  const unsafeHome = JSON.parse(starterText);
  unsafeHome.pack.sessions[1].home = '<private-path>';
  assert.equal(validatePack(unsafeHome).ok, false);

  const reservedTrack = JSON.parse(starterText);
  reservedTrack.pack.tracks[0].id = 'all';
  assert.equal(validatePack(reservedTrack).ok, false);

  const cyclic = JSON.parse(starterText);
  cyclic.pack.sessions[0].prerequisites = ['recoverable-work'];
  cyclic.pack.sessions[1].prerequisites = ['pair-sum'];
  assert.equal(validatePack(cyclic).ok, false);
});

test('catalog follows pack track references and rejects malformed practice route track ids', () => {
  const pack = parsePack(starterText).pack;
  const catalog = catalogForPack(pack);
  assert.deepEqual(catalog.map((track) => track.id), ['all', 'dsa', 'backend', 'systems']);
  const sessions = pack.sessions.map((session) => ({ ...session, trackIds: pack.tracks.filter((track) => track.sessionIds.includes(session.id)).map((track) => track.id) }));
  assert.deepEqual(practiceSessions(sessions, 'dsa').map((session) => session.id), ['pair-sum']);
  assert.deepEqual(practiceSessions(sessions, 'backend').map((session) => session.id), ['retry-safe-command']);
  assert.deepEqual(practiceSessions(sessions, 'systems').map((session) => session.id), ['recoverable-work']);
  assert.deepEqual(readPracticeRoute('#practice/<bad>?q=recovery'), { route: 'practice', track: 'all', query: 'recovery' });
  assert.equal(practiceHash('backend', 'retry safe'), '#practice/backend?q=retry+safe');
});
