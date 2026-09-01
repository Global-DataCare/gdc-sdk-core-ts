// Flow contract: reuse shared test fixtures and canonical types; do not introduce duplicated literals.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('release guidance blocks skipped live E2E before publication or images', async () => {
  const contracts = await Promise.all([
    readFile(new URL('../AGENTS.md', import.meta.url), 'utf8'),
    readFile(new URL('../README.md', import.meta.url), 'utf8'),
    readFile(new URL('../.codex/skills/enforce-release-test-discipline/SKILL.md', import.meta.url), 'utf8'),
  ]);
  for (const contract of contracts) {
    assert.match(contract, /test -> local-network -> test-network -> network/);
    assert.match(contract, /live.*E2E.*SKIP.*release/s);
    assert.match(contract, /live.*E2E.*npm publish.*container image/s);
  }
});
