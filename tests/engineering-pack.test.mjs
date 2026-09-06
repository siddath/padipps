import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parsePack } from '../pack-engine.js';

const padipps = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packText = readFileSync(join(padipps, 'packs/engineering.json'), 'utf8');
const parsed = parsePack(packText);
const pack = parsed.pack;
const byTrack = id => pack.tracks.find(track => track.id === id);

const FDE_ORDER = [
  'customer-discovery', 'ux-baseline', 'job-api', 'fde-python-api', 'fde-identity',
  'fde-crm-sync', 'sql-jobs', 'fde-tenant-isolation', 'fde-security-controls',
  'ai-gateway', 'fde-permissioned-rag', 'migration-design', 'ux-flow',
  'ux-implementation', 'fde-environments', 'fde-observability', 'debug-overload',
  'fde-incident-delivery', 'fde-customer-docs', 'fde-adoption', 'fde-portfolio'
];

function filesBelow(folder) {
  return readdirSync(folder).flatMap(name => {
    const path = join(folder, name);
    return statSync(path).isDirectory() ? filesBelow(path) : [path];
  });
}

test('engineering pack validates with 31 sessions and six explicit tracks', () => {
  assert.equal(parsed.ok, true, parsed.errors?.join('\n'));
  assert.equal(pack.id, 'engineering-v1');
  assert.equal(pack.firstSession, 'customer-discovery');
  assert.equal(pack.sessions.length, 31);
  assert.deepEqual(pack.tracks.map(track => [track.id, track.sessionIds.length]), [
    ['dsa', 9], ['backend', 3], ['distributed', 4], ['ai', 2], ['fde', 21], ['design', 3]
  ]);
  assert.equal(new Set(pack.tracks.flatMap(track => track.sessionIds)).size, 31);
  assert.deepEqual(new Set(pack.sessions.map(session => session.home)), new Set(['engineering', 'product-design']));
});

test('FDE coverage stays discovery-first and preserves the authored order', () => {
  assert.deepEqual(byTrack('fde').sessionIds, FDE_ORDER);
  assert.deepEqual(byTrack('design').sessionIds, ['ux-baseline', 'ux-flow', 'ux-implementation']);
  for (const [index, sessionId] of FDE_ORDER.entries()) {
    const session = pack.sessions.find(candidate => candidate.id === sessionId);
    assert.ok(session, sessionId);
    for (const prerequisite of session.prerequisites) {
      assert.ok(FDE_ORDER.indexOf(prerequisite) >= 0 && FDE_ORDER.indexOf(prerequisite) < index, `${sessionId} requires earlier ${prerequisite}`);
    }
    assert.match(session.task, /materials\/engineering\/fde-capstone\/README\.md/);
  }
});

test('every session task and public material source resolves to a self-contained exercise', () => {
  for (const session of pack.sessions) {
    const pointer = session.task.match(/materials\/engineering\/[a-z0-9-]+\/README\.md/)?.[0];
    assert.ok(pointer, `${session.id} task has no material pointer`);
    assert.ok(existsSync(join(padipps, pointer)), `${session.id}: ${pointer}`);
    const publicSource = session.sources.find(source => source.label === 'Padipps exercise materials');
    assert.ok(publicSource, `${session.id} public source`);
    const sourceFolder = publicSource.url.match(/materials\/engineering\/[a-z0-9-]+$/)?.[0];
    assert.ok(sourceFolder && existsSync(join(padipps, sourceFolder)), `${session.id} source folder`);
    assert.ok(session.sources.some(source => source.label !== 'Padipps exercise materials'), `${session.id} primary source`);
  }

  for (const file of filesBelow(join(padipps, 'materials/engineering')).filter(path => path.endsWith('.md'))) {
    const markdown = readFileSync(file, 'utf8');
    for (const match of markdown.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^(https?:|mailto:)/.test(target)) continue;
      assert.ok(existsSync(resolve(dirname(file), target)), `${file}: ${target}`);
    }
  }
});

test('published starters remain unsolved and synthetic fixtures remain explicit', () => {
  const unsolved = [
    'dsa-patterns/TwoSum.java', 'dsa-prefix/SubarraySum.java', 'job-api/job-service.mjs',
    'migration-design/design.md', 'ai-gateway/gateway.mjs', 'customer-discovery/discovery.md',
    'operator-ui/index.html', 'fde-python-api/starter.py', 'fde-identity/identity.py',
    'fde-crm-sync/connector.py', 'fde-tenant-isolation/schema.sql',
    'fde-security-controls/controls.py', 'fde-permissioned-rag/rag.py',
    'fde-environments/chart/templates/workload.yaml', 'fde-observability/analyze.mjs',
    'fde-incident-delivery/postmortem.md', 'fde-customer-docs/openapi.json',
    'fde-adoption/measure.mjs', 'fde-portfolio/case-study.md'
  ];
  for (const relative of unsolved) {
    const content = readFileSync(join(padipps, 'materials/engineering', relative), 'utf8');
    assert.match(content, /TODO|LEARNER TODO|UNSOLVED|NotImplementedError|UnsupportedOperationException|Unsolved starter/i, relative);
  }
  for (const relative of [
    'migration-design/incident.json', 'operator-ui/jobs.json', 'fde-identity/fixtures.json',
    'fde-permissioned-rag/fixtures.json', 'fde-observability/telemetry.json',
    'fde-incident-delivery/incident.json', 'fde-adoption/adoption.json'
  ]) {
    assert.match(readFileSync(join(padipps, 'materials/engineering', relative), 'utf8'), /fictional|synthetic|fixture/i, relative);
  }
  assert.equal(existsSync(join(padipps, 'materials/engineering/study-lab-starters.zip')), false);
});

test('public pack and materials contain no private source fields or workspace markers', () => {
  for (const session of pack.sessions) {
    assert.equal(Object.hasOwn(session, 'canon'), false, `${session.id}.canon`);
    assert.equal(Object.hasOwn(session, 'exercise'), false, `${session.id}.exercise`);
  }
  const materials = filesBelow(join(padipps, 'materials/engineering'))
    .map(path => readFileSync(path, 'utf8'))
    .join('\n');
  const candidate = `${packText}\n${materials}`;
  assert.doesNotMatch(candidate, /_[Dd]ocs\b|\b[a-z]+-hq\b|\b[A-Z][a-z]+-Planner\b|TEACHING_[A-Z]+\b|\b[A-Z]{2,}-school\b|\/Users\/|private (?:execution brief|study desk)|Lab (?:attempt|session)/);
  assert.doesNotMatch(candidate, /"(?:canon|exercise)"\s*:/);
  assert.doesNotMatch(candidate, /AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/);

  const publishedFiles = filesBelow(join(padipps, 'materials/engineering'));
  for (const path of publishedFiles) {
    assert.doesNotMatch(path, /(?:^|\/)(?:node_modules|\.git|archive|evidence|solutions?)(?:\/|$)|\.(?:class|pyc|zip|log)$/i);
  }
  assert.equal(existsSync(join(padipps, 'materials/engineering/README.md')), false);
});

test('starter pack identity remains available for default continuity', () => {
  const starter = JSON.parse(readFileSync(join(padipps, 'packs/starter.json'), 'utf8'));
  assert.equal(starter.pack.id, 'starter-core');
  assert.equal(starter.pack.firstSession, 'pair-sum');
});
