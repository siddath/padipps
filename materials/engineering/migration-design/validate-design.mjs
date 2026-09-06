import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const design = readFileSync(join(here, 'design.md'), 'utf8');
const checklist = JSON.parse(readFileSync(join(here, 'requirements-checklist.json'), 'utf8'));
JSON.parse(readFileSync(join(here, 'incident.json'), 'utf8'));

const failures = [];
for (const [index, requirement] of checklist.requiredSections.entries()) {
  const start = design.indexOf(requirement.heading);
  const nextHeading = checklist.requiredSections[index + 1]?.heading;
  const end = nextHeading ? design.indexOf(nextHeading, start + requirement.heading.length) : design.length;
  const body = start < 0 ? '' : design.slice(start + requirement.heading.length, end);
  const authored = body.replace(/<!--[^]*?-->/g, '').trim();
  if (start < 0 || !authored) failures.push(`${requirement.id}: missing learner-authored content under ${requirement.heading}`);
}

if (failures.length) {
  console.error('Design completeness check failed (expected for untouched TODO starter):');
  failures.forEach(failure => console.error(`- ${failure}`));
  console.error('This check does not judge technical correctness.');
  process.exit(1);
}

console.log('All required sections contain learner-authored text. Human correctness review is still required.');
