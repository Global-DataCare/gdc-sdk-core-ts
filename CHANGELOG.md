# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Added runtime-neutral consent-access helpers in `src/consent-access.ts`:
  - `groupConsentsForControllerView(...)`
  - `evaluateRequestedAccess(...)`
  - `getMissingPermissions(...)`
  - `buildPermissionRequestCommunication(...)`
  - `buildPermissionRequestCommunicationLookupQuery(...)`

### Changed
- Updated README documentation to index the new shared consent-access surface and the agreed precedence model.

### Testing
- `npm run build` passes with the new consent-access surface included in package exports.

## 0.2.0 - 2026-05-23

### Added
- Added the runtime-neutral identity/discovery/bootstrap surface as the first minor release of `gdc-sdk-core-ts`.
- Added canonical communication bundle/document helpers, outbox draft helpers, and vital-sign helpers backed by `gdc-common-utils-ts`.

### Changed
- Aligned shared dependency consumption to `gdc-common-utils-ts@^1.5.0`.
- Switched TypeScript/runtime imports to explicit package export subpaths where needed for stable `NodeNext` resolution.

### Testing
- `npm test` passes against the packaged `gdc-common-utils-ts` artifact.

## 0.1.3 - 2026-05-23

### Added
- Added runtime-neutral identity/discovery bootstrap surface:
  - `MemoryIdentityStore`
  - `DiscoveryFacade`
  - `createStaticDiscoveryFacade(...)`
  - `createBootstrapFacade(...)`
  - provider DID/session resolution helpers
  - SMART token endpoint resolution from provider DID documents
- Added neutral identity/session models for:
  - `deviceIdentity`
  - `actorIdentity`
  - `providerIdentity`

### Testing
- Added tests for:
  - memory identity store
  - static discovery facade
  - bootstrap facade validation
  - provider DID resolution
  - SMART token endpoint resolution

## 0.1.2 - 2026-05-21

### Added
- Strengthened contract-level tests for canonical communication and bundle search shapes:
  - `CommunicationInput`
  - `CommMsgExtendedInput`
  - thread model fields (`thid`, `pthid`, `channelId`, `partOf`)
  - `BundleSearchQuery`
- Added minimal runtime assertion helpers for contract validation so malformed shapes fail early:
  - `assertCommunicationInput(...)`
  - `assertCommMsgExtendedInput(...)`
  - `assertBundleSearchQuery(...)`

### Testing
- Expanded coverage for required-field assumptions and malformed `section`, `date`, and `searchParams` inputs.

## 0.1.1 - 2026-05-20

### Changed
- Removed `Gdc` prefixes from public core contracts:
  - `GdcActorKind` -> `ActorKind`
  - `GdcCapability` -> `Capability`
  - `GdcActorSessionDescriptor` -> `ActorSessionDescriptor`
  - `GdcActorFacadeDescriptor` -> `ActorFacadeDescriptor`
- Kept actor-capability filtering and facade-expansion logic unchanged while aligning names with neutral SDK naming.
- Added shared actor-flag/session contracts and helper in core to avoid frontend-local duplication:
  - `ActorFlags`
  - `ActorSessionDescriptorInput`
  - `buildActorSessionDescriptorFromActorFlags(...)`
- Renamed module file from `actor-contracts` to `actor-model` to avoid ambiguity with other contract domains.
- Added shared polling contracts and utility:
  - `SubmitPayload`, `AsyncPollRequest`, `SubmitResponse`, `PollOptions`, `PollResult`, `SubmitAndPollResult`
  - `resolvePollOptionsFromSeconds(...)`
- Added shared session/profile contracts:
  - `AppInfo`, `InitializeSessionParams`, `Profile`, `ProfileRegistryEntry`
  - `VaultQueryCondition`, `VaultQuery`, `IVaultRepository`
  - `IApiConfig`, `INetwork`, `IVerifier`
- Extended `IncludedResourceType` to include `Communication` for canonical thread/document bundle searches.

### Testing
- Verified package build and type-check after contract rename.

## 0.1.0 - 2026-05-18

### Added
- Created `gdc-sdk-core-ts` as the first extracted shared package for SDK convergence.
- Added runtime-neutral actor and capability contracts:
  - `GdcActorKind`
  - `GdcCapability`
  - `GdcActorSessionDescriptor`
  - `GdcActorFacadeDescriptor`
- Added canonical actor capability filtering and expansion from composite session descriptors to role-scoped facades.

### Security
- Locked the rule that Family/Organization composite sessions must expand into actor-scoped facades instead of inheriting the union of all capabilities.
- Established the shared contract that downstream runtimes must filter capabilities per actor before exposing an operational surface.

### Testing
- Added core package tests for:
  - Family facade expansion
  - cross-actor capability filtering
