# AGENTS.md

## Mandatory TDD and release gates

Use red-green-refactor for every behavior or flow change. The first physical
line of every new or modified test is the canonical flow-contract comment.
Release evidence follows `test -> local-network -> test-network -> network`.
Run every affected live E2E against real local services; a live E2E reported as
`SKIP` blocks the release. Finish those live E2E gates before `npm publish` or
any container image build. Mocks never replace a real boundary proof.

Treat release closure as one indivisible sequence: push the branch, run
`npm publish` from that branch, verify the registry artifact and a clean
registry installation, then merge to `main`, push `main`, and delete the
branch. Publish dependencies bottom-up before promoting each consumer.

For an interactive npm authorization, keep the command session alive for up
to five minutes and make at most three fresh authorization attempts. Only
after all three fail may a downstream consumer be prepared and tested against
the immutable tarball produced by `npm pack`. Never commit a `file:` dependency
or treat that tarball as publication proof. Publishing the consumer, merging
it to `main`, building an image, or deploying remains blocked until the
dependency is installed and reverified from the npm registry.
