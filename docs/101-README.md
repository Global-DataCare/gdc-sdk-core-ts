# 101 Reading Path

> 101 note
> - Start here when you need the `gdc-sdk-core-ts` learning order.
> - `gdc-common-utils-ts` owns the canonical step-by-step editors/readers and shared fixtures.
> - This repo starts after that shared authoring step and owns runtime-neutral drafts, outbox contracts, facades, and shared business contracts.
> - Continue upward into `gdc-sdk-node-ts` or `gdc-sdk-front-ts` for concrete actor/runtime execution.

## Read First

1. [101-SDK_PACKAGE_BOUNDARIES.md](./101-SDK_PACKAGE_BOUNDARIES.md)
2. [101-USER_STORY_CANON.md](./101-USER_STORY_CANON.md)
3. [gdc-common-utils-ts/docs/101-BFF_AND_CHANNEL_MESSAGE_FLOW.md](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/101-BFF_AND_CHANNEL_MESSAGE_FLOW.md)
4. [101-SDK_FLOWS.md](./101-SDK_FLOWS.md)
5. [101-EMPLOYEES.md](./101-EMPLOYEES.md)

## User Story Start

For a self-managed user in a BFF, web app, or native app, the full story
starts with shared authoring in `gdc-common-utils-ts`, then moves into
`gdc-sdk-core-ts` for runtime-neutral contracts, and only after that into the
runtime packages that load one profile into one workspace/session and expose
one actor facade.

That authenticated-user entrypoint lives upstream in `sdk-node`:

- profile load and actor resolution:
  [gdc-sdk-node-ts/tests/101-backend-profile-runtime.test.mjs](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/tests/101-backend-profile-runtime.test.mjs)
- chainable profile workspace:
  [gdc-sdk-node-ts/tests/101-profile-workspace-runtime.test.mjs](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/tests/101-profile-workspace-runtime.test.mjs)
- wallet-backed session jobs:
  [gdc-sdk-node-ts/tests/101-wallet-backed-job-manager.test.mjs](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/tests/101-wallet-backed-job-manager.test.mjs)

After that runtime entry, this repo is the place for:

- employee semantics:
  [tests/101-employees.test.mjs](../tests/101-employees.test.mjs)
- communication outbox/runtime-neutral staging:
  [tests/101-communication-ips-search-outbox.test.mjs](../tests/101-communication-ips-search-outbox.test.mjs)
- durable outbox scheduling, idempotency, and honest confirmation:
  [tests/101-durable-communication-outbox.test.mjs](../tests/101-durable-communication-outbox.test.mjs)
- profile runtime contracts:
  [tests/101-profile-runtime.test.mjs](../tests/101-profile-runtime.test.mjs)

Responsibility split:

- `gdc-common-utils-ts` owns the canonical step-by-step editors/readers and
  the reusable example payloads
- in that lower layer, the business payload is authored before any runtime
  package sees it
- for current health document cases, the canonical lower-layer example is one
  `Bundle.type=document` with `Composition` first entry
- backend search is still taught separately with public FHIR search params
  such as `Composition.section`
- this repo explains runtime-neutral business contracts, facades, and outbox
  staging after shared authoring
- `gdc-sdk-node-ts` / `gdc-sdk-front-ts` explain the concrete unlocked profile
  runtime entrypoints
- GW explains what happens only after message reception

Canonical snippet boundary:

```ts
// Do not rebuild the clinical Communication payload here.
// Reuse the common-utils canonical path:
// document Bundle with Composition first entry -> Communication -> DIDComm/plain
//
// This repo starts after that authoring step and stages the already-authored
// business payload into one draft/outbox job for the runtime layer.
```

Lower-layer canonical references:

- [gdc-common-utils-ts/__tests__/101-communication-medication-document.test.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/__tests__/101-communication-medication-document.test.ts)
- [gdc-common-utils-ts/__tests__/101-communication-profile-wallet-e2e.test.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/__tests__/101-communication-profile-wallet-e2e.test.ts)

## Main Executable 101 Tests

- [tests/101-employees.test.mjs](../tests/101-employees.test.mjs)
- [tests/101-communication-ips-search-outbox.test.mjs](../tests/101-communication-ips-search-outbox.test.mjs)
- [tests/101-durable-communication-outbox.test.mjs](../tests/101-durable-communication-outbox.test.mjs)
- [tests/101-consent-bundle-outbox.test.mjs](../tests/101-consent-bundle-outbox.test.mjs)
- [tests/101-profile-runtime.test.mjs](../tests/101-profile-runtime.test.mjs)

## Boundary

- Teach here: runtime-neutral drafts, editors, readers, outbox jobs, and claim contracts.
- Do not make concrete wallet/profile transport or submit/poll runtime the main path here.
- Continue upward: `gdc-sdk-node-ts/docs/101-SDK_INTEGRATION.md`.
