# Architecture

## Purpose

`gdc-sdk-core-ts` owns runtime-neutral SDK facades and contracts built on top of
`gdc-common-utils-ts`.

This repository is the canonical place for:

- neutral domain facades
- actor-aware but runtime-neutral profile and capability contracts
- role/sector-oriented capability facades that remain runtime-neutral
- SDK-level orchestration contracts
- shared input/output types reused by multiple runtimes

This repository is not the place for:

- low-level reusable editors/readers that belong in `gdc-common-utils-ts`
- browser/mobile session concerns
- node/BFF transport wiring
- concrete storage, KMS, secure-storage, Firestore, localStorage, or job-manager implementations

## Ownership Rules

Put code here when it:

- wraps shared helpers into a stable domain surface
- stays neutral with respect to frontend, node, or gateway runtime
- can describe actor profiles, role capabilities, or profile-loading contracts without binding to one runtime adapter

Do not put code here when it:

- is a reusable high-level editor/reader/state that can live in `common-utils`
- requires HTTP execution, polling, token/session handling, runtime storage, secure local persistence, Firestore, or KMS implementation details

Do not introduce canonical high-level `get...` / `set...` methods here on
shared semantic classes if those methods can live in `gdc-common-utils-ts`.

## Facade And Profile Policy

`sdk-core` may define:

- neutral domain facades
- actor-profile descriptors
- actor capability surfaces
- actor-aware but runtime-neutral contracts
- role/sector-oriented facades when they describe capability boundaries rather
  than one concrete runtime implementation

Examples that fit here:

- lifecycle facade
- license facade
- consent facade
- communication facade
- actor profile descriptors expressed as role/sector capability models
- capability facades for concrete role or sector families when they stay
  runtime-neutral

What does not fit here:

- frontend-only profile runtime implementation
- node/server-only profile runtime implementation
- concrete secure storage / runtime storage / memory-cache behavior

Runtime actor/profile implementations belong in:

- `gdc-sdk-front-ts` for frontend/confidential-app actor runtimes
- `gdc-sdk-node-ts` for node/server actor runtimes

## Naming Rules

Keep method names consistent:

- use operation prefix first
- specialize toward the end

Examples:

- `prepareSearchLicenseList`
- `prepareSearchLicenseOffer`
- `prepareLifecycleIndividualOrganizationPurge`

Avoid:

- mixing `new...` and `create...` for the same operation family
- CRUD-looking `create...` names for non-create operations

## Layer Boundary

Expected dependency direction:

1. `gdc-common-utils-ts`
2. `gdc-sdk-core-ts`
3. `gdc-sdk-node-ts` / `gdc-sdk-front-ts`

`sdk-core` should wrap and expose shared semantics, not duplicate them.

That includes consuming canonical high-level `get...` / `set...` methods from
`gdc-common-utils-ts` instead of inventing a parallel surface in `sdk-core`.

## Test And Example Policy

High-level tests in this repository should prove facade behavior without
re-explaining plumbing.

They should be:

- step by step
- actor/domain-oriented
- free of transport plumbing unless the test is explicitly about orchestration
- backed by shared examples from `gdc-common-utils-ts` whenever possible
- free of ad-hoc literals when a shared example or fixture already exists

Preferred anchors:

- [tests/license-controller-facade.test.mjs](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/tests/license-controller-facade.test.mjs:1)
- [tests/individual-organization-lifecycle-facade.test.mjs](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/tests/individual-organization-lifecycle-facade.test.mjs:1)
- [tests/101-employees.test.mjs](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/tests/101-employees.test.mjs:1)
- [tests/101-consent-bundle-outbox.test.mjs](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/tests/101-consent-bundle-outbox.test.mjs:1)
- [tests/101-communication-ips-search-outbox.test.mjs](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/tests/101-communication-ips-search-outbox.test.mjs:1)

## JSDoc Policy

Every exported facade or profile contract should explain:

- whether it is neutral or runtime-bound
- what lower-layer shared helper it wraps
- what actor/domain boundary it represents
- what runtime concerns it deliberately excludes

When the facade is role/sector-oriented, its JSDoc should also state that it
describes capabilities, not one concrete frontend or node runtime.
