import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(readFileSync(join(here, 'fixtures/provider-responses.json'), 'utf8'));

export class FakeTimeoutError extends Error {}

export function createFakeProvider(fixtureName) {
  const fixture = fixtures[fixtureName];
  if (!fixture) throw new Error(`Unknown fake fixture: ${fixtureName}`);
  let calls = 0;

  return {
    get calls() { return calls; },
    async complete() {
      calls += 1;
      if (fixture.outcome === 'timeout') throw new FakeTimeoutError('synthetic timeout');
      return structuredClone(fixture);
    }
  };
}
