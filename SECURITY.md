# Security

## Scope

`gdc-sdk-core-ts` is a runtime-neutral contract package. It does not perform network calls, token exchange, cryptographic storage, or direct onboarding requests.

Its security role is narrower and critical:

- define actor boundaries
- define capability boundaries
- prevent composite session descriptors from being treated as one over-privileged surface

## Security invariants

### 1. Actor capability isolation

A session descriptor may expose multiple actor kinds, for example:

- `individual_controller`
- `individual_member`

This must **not** imply that each resulting facade receives every capability from the composite descriptor.

The package enforces:

- actor-scoped filtering via `filterCapabilitiesForActor`
- role-scoped expansion via `expandActorSessionDescriptorToFacades`

### 2. Shared source of truth

The capability matrix in this package is the canonical baseline for converged SDKs.

Downstream packages should:

- consume these contracts
- avoid redefining actor/capability matrices independently
- defensively re-filter capabilities before exposing runtime sessions

### 3. No public-client trust decisions here

This package does not decide:

- whether a public client may call ICA directly
- whether Firebase/OIDC projects are trusted by the operator
- how bearer tokens are verified
- how wallets store keys

Those decisions belong to runtime packages and backend deployment policy.

## Recommended downstream posture

- Public clients should prefer BFF / Cloud Functions / backend mediation for ICA `_verify` and GW `_activate`.
- Runtime packages must preserve actor separation even if upstream descriptors are malformed or over-broad.
