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
5. Keep `actorDid` as authenticated sender/submitter evidence. For personal
   content, `ClinicalSourceAuthorSelections.Owner` means that the individual
   originated or dictated the fact; `Creator` means that the registered member
   originated it. The registered RelatedPerson is the attester in either case.
   BFFs use `assignmentIdentifier`; deprecated `authorIdentifier` is only the
   persisted DCR/profile wire name for that assignment and never selects the
   author.
6. A telephone-transcribed section Bundle stays in the owning pending workflow
   until an authorized member explicitly attests it. If Communication status
   represents that workflow, use governed FHIR event states (`preparation`,
   then `completed` or `not-done`), never an invented `draft` value.

## Local-first gates

### Subject index and PDQm red lines

- Fabric subject-identifier lookup returns only `indexProviderDid`. Resolve
  that `did:web`; do not return a card, provider code or duplicated URL.
- Human-health cross-reference uses IHE PDQm POST `Patient/$match`. Legacy FHIR
  sends one `Parameters` body whose `parameter[]` contains the input Patient.
- DIDComm uses one primary Bundle with
  `body.data[0].resource = Parameters` and `request = POST Patient/$match`.
  Plain transport is `application/didcomm-plain+json`; strict transport signs
  and encrypts the same message into `application/x-www-form-urlencoded`
  `request=<JWE>` and reads `response=<JWE>`.
- The response is the same result Bundle across legacy FHIR, DIDComm plain and
  strict transport. Never substitute a GET identity query or expose the
  Fabric hash in the provider-facing FHIR operation.

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

## Mandatory release authorization continuity

For any release chain that requires npm authorization, make at most three
attempts and keep each command session and browser window alive for up to five
minutes. Never end the turn or imply continued work while a window is pending.
After all three attempts fail, keep the release unpublished and continue the
local `test` stage with an immutable `npm pack` tarball. Never commit a
`file:`, Git, workspace or vendored tarball dependency.

Follow the canonical contract in
[`docs/LOCAL_FIRST_RELEASE_CONTRACT.md`](../../../docs/LOCAL_FIRST_RELEASE_CONTRACT.md):

- Do not attempt `npm publish` until every affected local `test` gate is
  green, including unit, integration, local services, real UI and Playwright.
- An npm publish or authorization failure must never stop the `test` stage.
- Continue unit, integration, local service, UI and Playwright gates with the
  immutable tarball installed `--no-save` on pushed but unmerged branches.
- The `npm pack` tarball is temporary: install it `--no-save`, then restore
  the registry dependency and lockfile before committing dependency state.
- After a failure, resume only the smallest failed gate; do not repeat a green
  gate unless the fix changed its boundary, it creates required state, or the
  environment is no longer trustworthy.
- Resume the failed gate; rerun a predecessor only for required state, a
  changed earlier boundary or an untrustworthy environment.
- After publication, install the exact registry version and run only the minimal
  install/export smoke; do not repeat the green local matrix unless the
  published artifact differs from the tested tarball or invalidates that
  evidence.
- Missing exact registry publication blocks only consumer merge, image build,
  `local-network`, `test-network`/staging and `network` promotion.
- A gateway consumer installs the exact registry version before its merge,
  image build and `local-network`. A portal consumer may retain the immutable
  tarball on its pushed, unmerged branch throughout `local-network`; after
  `local-network` is green, it installs the exact registry version and runs
  only the artifact smoke before its merge and staging.
- Publish only after the local matrix is green, install the exact registry
  version in the gateway before `local-network`, and install it in portals
  before staging.
- Registry order is dependency publish and verification, then consumer install
  and lockfile pin, then package merge, consumer merge, image build and deploy.
- Every test file's first line must be a `Flow contract:` comment linking this
  policy. Apply TDD red -> green -> refactor: red must fail because the
  production behavior is absent or wrong; green must prove the production
  contract. A skip, accepted error, placeholder, pending setup, fixture-only UI
  or mock replacing a real boundary is never green.
- Reuse canonical types and terminology from HL7/FHIR, LOINC, SNOMED CT,
  ICD-10, WHO ATC, Schema.org or the applicable governed standard before
  inventing a local type, enum, code, identifier or vocabulary.
- Put missing reusable types in the versioned domain data package or
  `common-utils`, with tests in that owning shared package, before downstream
  use.
- Reuse canonical fixtures, builders, claims, identifiers and vocabulary from
  the versioned domain data package (`<version>-data` or
  `<version>-data-utils`) or `common-utils`; no duplicated literals are
  allowed. If the reusable datum does not exist, add it first to its owning
  shared package with tests and consume that export downstream.
