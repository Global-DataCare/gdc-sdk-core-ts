# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Added runtime-neutral dataspace discovery building blocks in `sdk-core` so
  Node and frontend runtimes can share the same HTTP/default-first resolution
  logic:
  - `DataspaceResolver`
  - `HttpDataspaceResolver`
  - `DefaultFirstDataspaceDiscovery`
  - shared discovery types and exports
- Added canonical `Communication.topic` claim helpers to the shared
  `CommunicationClaims` surface.

### Changed
- Clarified the discovery boundary in the README and facade comments so host
  discovery starts from the contextualized hosting-operator base URL rather
  than the host root.
- Clarified the canonical host-scoped DSP entrypoint shape as
  `/host/cds-{hostCoverageScope}/{version}/{hostNetwork}/.well-known/dspace-version`
  so host coverage scope stays distinct from legal jurisdiction.
- Updated the consent outbox coverage to write and assert the canonical
  `Communication.topic` claim through the shared claim helpers.

### Testing
- `npm run build`

## [0.8.2] - 2026-06-04

### Changed
- Updated the shared dependency target to `gdc-common-utils-ts@^1.17.0`.

### Testing
- `npm run type-check`
- `npm test`

## [0.8.1] - 2026-06-04

### Added
- Added canonical actor-facade surface contracts in `sdk-core` so runtime
  packages can converge on one shared actor-to-surface map:
  - `src/actor-facade-surface.ts`
  - `tests/actor-facade-surface.test.mjs`

### Changed
- Expanded the actor capability matrix so individual-controller and
  individual-member flows include the related-person and communication
  capabilities already consumed by runtime packages.
- Kept `docs/101-EMPLOYEES.md` focused on employee semantics while moving the
  bundle/editor mechanics to the canonical `common-utils` employee editor 101.

### Testing
- `node --test tests/actor-contracts.test.mjs tests/actor-facade-surface.test.mjs tests/101-employees.test.mjs`
- `npm run build`

## [0.8.0] - 2026-06-04

### Changed
- Updated the shared dependency target to `gdc-common-utils-ts@^1.16.0`.
- Reworked the employee teaching and test path around:
  - `BundleEditor`
  - `BundleEntryEditor`
  - `EmployeeEntryEditor`
  instead of mixing employee-specific setters directly into the generic bundle
  editor surface.
- Clarified the employee `101` so create/search/disable/purge all show:
  - one declared bundle operation
  - one allowed employee resource type
  - one employee entry editor opened from `newEntry(...).asEmployee()`

### Testing
- `node --test tests/employee-draft.test.mjs tests/101-employees.test.mjs`
- `npm run build`

## [0.7.0] - 2026-06-04

### Added
- Added the employee `101` and tests around the new shared bundle-editing
  flow:
  - `docs/101-EMPLOYEES.md`
  - `tests/101-employees.test.mjs`

### Changed
- Switched employee bundle editing to consume the shared `BundleEditor`
  provided by `gdc-common-utils-ts`.
- Updated the employee teaching path so the `sdk-core` guide explains:
  - one bundle operation per bundle
  - one active entry at a time
  - generic claim editing plus employee-specific setters
  - create / search / disable / purge as separate sections
- Updated the shared dependency target to `gdc-common-utils-ts@^1.15.0`.

### Testing
- `node --test tests/employee-draft.test.mjs tests/101-employees.test.mjs`
- `npm run build`

## [0.6.9] - 2026-06-02

### Changed
- Updated the shared dependency target to `gdc-common-utils-ts@^1.14.10`.
- Renamed the consent outbox guide to the clearer:
  - `docs/CONSENT_COMMUNICATION_101.md`
- Added a dedicated IPS outbox guide:
  - `docs/IPS_COMMUNICATION_OUTBOX_101.md`
- Simplified the `101` outbox tests so they focus on the developer-facing
  result:
  - `createOutboxJobFromDraft(...)`

### Testing
- `node --test tests/101-consent-bundle-outbox.test.mjs tests/101-communication-ips-search-outbox.test.mjs`
- `npm run build`

## [0.6.1] - 2026-06-01

### Changed
- Updated the shared dependency target to `gdc-common-utils-ts@^1.14.0`.
- Linked the new shared discovery defaults/bootstrap guide so portal/backend
  implementations can use `default-first` seeding without inventing their own
  contracts.

### Testing
- `npm test`
- `npm run build`

## [0.6.0] - 2026-06-01

### Changed
- Updated the shared dependency target to `gdc-common-utils-ts@^1.13.0`.
- Aligned the discovery boundary documentation with the DSP `dspace-version`
  and `/dsp/catalog/...` contract used by the node/frontend SDKs.

### Testing
- `npm test`
- `npm run build`

## [0.5.2] - 2026-05-28

### Changed
- Updated shared dependency target to `gdc-common-utils-ts@^1.11.0`.
- Kept the core actor/bootstrap surface aligned with the new shared key-binding and JOSE algorithm documentation.

### Testing
- `npm test`
- `npm run build`

## [0.5.1] - 2026-05-27

### Changed
- Updated shared dependency target to `gdc-common-utils-ts@^1.10.0`.
- Aligned bootstrap capability tests with the clearer `IndexReader` /
  `IndexProvider` naming while keeping backward compatibility in the shared
  package.

### Testing
- `npm test`
- `npm run build`

## [0.3.2] - 2026-05-26

### Added
- Added the clearer public alias `createOrganizationActivation(...)` alongside the existing compatibility builder `createOrganizationActivationDraft(...)`.
- Added the shared `OrganizationActivationInput` export for SDK consumers that want one canonical activation contract.

### Changed
- Updated onboarding docs and examples to teach:
  - `organizationActivation` as the local activation builder/result name
  - mandatory legal-organization service capabilities during `_activate`
  - `orgControllerDid` as the default controller DID teaching name
- Updated dependency target to `gdc-common-utils-ts@^1.7.0`.

### Testing
- `npm run build`
- `npm test`

## [0.3.1] - 2026-05-25

### Changed
- Switched cross-repository README links to GitHub URLs so the published npm package documentation works outside the local workspace checkout.

### Testing
- README/doc-only release; runtime surface unchanged from `0.3.0`.

## [0.3.0] - 2026-05-25

### Added
- Added shared host application identity helpers in `src/app-identity.ts`:
  - `DEFAULT_APP_VERSION`
  - `resolveAppInfo(...)`
  - `normalizeAppId(...)`
  - `normalizeAppVersion(...)`
  - `buildAppHeaders(...)`
- Added tests for the new app identity normalization behavior in:
  - `tests/app-identity.test.mjs`

### Changed
- Updated `AppInfo` so GW CORE host app identity is explicit and canonical:
  - `appId` is mandatory
  - `appVersion` replaces the old ambiguous `version` field
- Aligned documentation with the current shared naming and initialization rules:
  - `initializeCommunicationIdentity(...)` as the canonical bootstrap helper name
  - `subjectDid` as the default semantic subject variable name
  - canonical lifecycle naming `enable / disable / delete`
- Updated shared dependency consumption target to `gdc-common-utils-ts@^1.6.0`.

### Testing
- `npm run build` passes with the new app identity surface exported.

## [0.2.1] - 2026-05-24

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
