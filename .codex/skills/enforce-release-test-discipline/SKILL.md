---
name: enforce-release-test-discipline
description: Enforce branch, TDD, local live E2E, changelog, patch publication, consumer promotion and merge discipline for shared SDK changes.
---

# Enforce Release and Test Discipline

## Branch and TDD

1. Preserve unrelated work and create a named branch from the intended base.
2. Write the smallest executable contract first and retain its intended red
   failure before implementation.
3. Begin every new or modified test with:
   `// Flow contract: reuse shared test fixtures and canonical types; do not introduce duplicated literals.`
4. Use canonical fixtures and constants from their owning shared package.

## Local-first gates

- Always follow `test -> local-network -> test-network -> network`.
- Run focused, integration, full, type and build checks first.
- Enable every affected package or SDK live E2E against real local services.
  A live E2E reported as `SKIP` blocks the release.
- Complete all live E2E before `npm publish` or any container image build.
  Mocks and API-only tests are diagnostic evidence, not boundary proof.

## Release

1. Update the changelog and immutable patch version.
2. Release the dependency chain bottom-up, one package and then each consumer.
3. Push the branch, run `npm publish` from that branch in a real TTY, verify
   registry version, integrity and a clean registry installation, then merge
   explicitly into `main`, push `main`, delete the branch and verify a clean
   worktree.
4. Never open an unrelated next fix while that closure is incomplete.

## Interactive npm authorization fallback

1. Keep each authorization command and its browser window alive for up to five
   minutes. If it expires or is rejected, create a fresh window; make at most
   three attempts and never end the turn while one is pending.
2. After three failed attempts, `npm pack` may create an immutable tarball so a
   downstream consumer can be prepared and its local tests can continue.
3. Tarball validation is provisional. Do not commit `file:` dependencies, mark
   publication complete, publish the consumer, merge it to `main`, build an
   image, or deploy anything from that dependency chain.
4. When npm publication becomes available, install the exact dependency from
   the registry, regenerate the lockfile, rerun the affected verification, and
   only then publish the consumer, verify it, merge to `main`, and deploy.
