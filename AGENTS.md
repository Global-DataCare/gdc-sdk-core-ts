# AGENTS.md

## Mandatory TDD and release gates

Use red-green-refactor for every behavior or flow change. The first physical
line of every new or modified test is the canonical flow-contract comment.
Release evidence follows `test -> local-network -> test-network -> network`.
Run every affected live E2E against real local services; a live E2E reported as
`SKIP` blocks the release. Finish those live E2E gates before `npm publish` or
any container image build. Mocks never replace a real boundary proof.
