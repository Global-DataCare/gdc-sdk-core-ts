# SDK Package Boundaries

This document explains why the SDK family is split across `gdc-sdk-core-ts`,
`gdc-sdk-node-ts`, and `gdc-sdk-front-ts`, what each package owns, and why the
actor-scoped facades exist.

Teaching rule for this `101`:

- start from package responsibilities before implementation details
- keep high-level package ownership separate from low-level helper examples
- keep actor ownership explicit

## Problem This Split Solves

The same business flows must be consumed from very different runtimes:

- backend / BFF / worker processes
- web and mobile frontend apps
- test harnesses and local tooling

Those runtimes need the same business vocabulary:

- actor kinds
- capabilities
- consent payloads
- communication payloads
- search request shapes
- lifecycle semantics
- polling result shapes

But they do not share the same transport or execution model:

- Node can call GW directly and poll long-running jobs
- frontends usually work through local state, app adapters, or a BFF
- product-specific runtimes may add extra storage, notification, or queue layers

If the SDK mixes shared contracts with one concrete runtime, two problems appear
immediately:

1. frontend and backend surfaces drift
2. actor-scoped APIs start exposing operations that belong to another actor

## Ownership Rules

### `gdc-sdk-core-ts`

Use `core` for runtime-neutral material:

- shared domain types
- actor and capability models
- consent/communication/search payload contracts
- lifecycle semantics
- pure builders, validators, and normalizers
- runtime-neutral result envelopes such as polling shapes

Do not put these in `core`:

- GW route construction
- Node HTTP clients
- browser storage adapters
- direct fetch/axios transport code
- runtime-only credential exchange behavior

Rule of thumb:

- if both `front` and `node` should understand it the same way, it probably
  belongs in `core`
- if it can be unit-tested without transport, it probably belongs in `core`

### `gdc-sdk-node-ts`

Use `node` for backend/runtime execution:

- GW route/path selection
- HTTP submission and polling
- bearer token handling
- runtime orchestration against real GW deployments
- Node-specific actor facades backed by a runtime client

`node` should not redefine the business contract when `core` already owns it.

### `gdc-sdk-front-ts`

Use `front` for frontend/runtime composition:

- session/profile bootstrap
- frontend actor facades
- device/app-facing service composition
- local draft/outbox/session integration
- browser/mobile adapter wiring

`front` must stay aligned with `node` at the actor-facade level even when the
transport implementation differs.

## Why Actor-Scoped Facades Exist

The facades are not only convenience wrappers. They are an API-boundary tool.

They exist to make these constraints explicit:

- organization onboarding belongs to host / organization-controller flows
- employee provisioning belongs to organization-controller flows
- employee device activation belongs to organization-employee flows
- subject bootstrap and consent management belong to individual-controller flows
- professional access belongs to the professional actor after provisioning

Without actor-scoped facades, everything collapses into one large client and
callers can accidentally compose invalid flows.

## Why `ProfessionalSdk` Must Not Expose Employee Provisioning

`ProfessionalSdk` represents the actor after the organization and employee have
already been provisioned.

That actor may need:

- SMART token requests
- consented access
- clinical/document submission or retrieval

That actor should not own:

- legal organization activation
- employee creation
- employee invitation / seat issuance
- employee bootstrap steps that belong to the controller/admin

Those operations are organization-scoped provisioning actions, not
professional-runtime actions.

## Why Frontend Also Needs These Facades

Even when the frontend does not call GW directly, it still needs the same actor
surface for:

- permissioned screen composition
- safe UI-level feature exposure
- session-based action routing
- BFF/API integration that mirrors backend actor boundaries

So `front` should converge on the same facade names and role boundaries as
`node`, while keeping its own runtime adapters behind those facades.

## Convergence Rule

When adding a new flow:

1. define or normalize the shared contract in `core` if it is runtime-neutral
2. expose it through the correct actor facade(s)
3. implement runtime-specific execution in `node` and/or `front`
4. keep actor boundaries identical across runtimes unless a difference is
   explicitly documented
