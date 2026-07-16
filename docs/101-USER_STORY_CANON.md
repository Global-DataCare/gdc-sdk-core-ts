# User Story Canon 101

> 101 note
> - This is the neutral cross-repo user-story canon for the GDC SDK family.
> - Use it to keep docs, tests, and examples aligned across `common-utils`, `sdk-core`, `sdk-front`, `sdk-node`, and GW docs.
> - This document is runtime- and product-neutral. It does not assume specific frontend.

## Canonical Story

When a self-managed user operates through a BFF, a web app, a native app, or a
channel service, the story should be taught in this order:

1. identify/authenticate the actor
2. load one protected profile
3. unlock that profile with its local secret, typically PIN-based
4. recover the cryptographic material owned by that profile
5. materialize one loaded workspace/session
6. obtain one actor-scoped facade such as `asProfessional()` or `asIndividualController()`
7. execute the business operation
8. only then explain transport, submit/poll, DIDComm/plain, or storage details as needed

## Runtime Split

Keep these concepts separate:

- `ProfileRuntime`
  unlocked end-user profile runtime
- `LoadedProfileWorkspace`
  session/workspace returned by `loadProfile(...)`
- actor facade
  `asProfessional()`, `asIndividualController()`, `asOrganizationController()`, etc.
- `TenantServiceRuntime`
  technical wallet/runtime owned by the service, tenant, or BFF for signing,
  encryption, DIDComm/plain wrapping, and confidential storage tasks

Do not mix the end-user profile runtime with the service-tenant runtime.

## Package Roles

- `gdc-common-utils-ts`
  shared helpers, editors, readers, profile/wallet primitives, transport composition
- `gdc-sdk-core-ts`
  runtime-neutral business contracts, helpers, drafts, and flow semantics
- `gdc-sdk-front-ts`
  frontend/native `ProfileRuntime` and actor-scoped runtime orchestration
- `gdc-sdk-node-ts`
  backend/BFF `ProfileRuntime` and actor-scoped runtime orchestration
- `gwtemplate-node-ts`
  GW route, contract, and service-tenant runtime semantics after profile load already happened upstream

## Documentation Rule

Every `101` should make clear where it enters this story.

- if the file starts after `ProfileRuntime`, say so explicitly
- if the file teaches only shared helpers, point upward to `ProfileRuntime`
- if the file teaches service-tenant cryptography, say that it is not the end-user profile runtime

## Product Rule

Product/channel repos may add their own higher layer, but must not rewrite the
base story.

They may add concepts such as:

- channel backend port
- reminder orchestration
- UX flow
- product-specific permission overlays

But those layers must sit on top of the same base sequence:

`ProfileRuntime -> LoadedProfileWorkspace -> actor facade -> business operation`
