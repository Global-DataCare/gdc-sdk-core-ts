# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- Added `docs/ARCHITECTURE_CONTROLLER_DEVICE_LIFECYCLES.md` as the canonical shared
  lifecycle note for:
  - legal organization controller recovery via `_issue`
  - professional device activation/replacement
  - individual controller recovery
- Added `docs/101-CONTROLLER_DEVICE_LIFECYCLE_SNIPPETS.md` with short
  copy/paste-oriented snippets that use high-level builders and read helpers
  instead of teaching raw GW payload parsing.
- Linked the new lifecycle note from `README.md` and `ARCHITECTURE.md` so the
  shared SDK layer exposes one neutral source of truth before runtime-specific
  docs add route execution details.
- Added `src/controller-device-lifecycle-readers.ts` so SDK callers can read
  commercial offer ids and activation codes through shared
  `getClaimsInFirstDataEntry(...)` / `getClaimsInBundleEntryAt(...)` helpers instead of repeating
  `body.data[0].meta.claims` parsing in runtime code and docs.

## [2.0.10] - 2026-06-29

- Added `docs/ARCHITECTURE_CONTROLLER_DEVICE_LIFECYCLES.md` as the canonical shared
  lifecycle note for:
  - legal organization controller recovery via `_issue`
  - professional device activation/replacement
  - individual controller recovery
- Added `docs/101-CONTROLLER_DEVICE_LIFECYCLE_SNIPPETS.md` with short
  copy/paste-oriented snippets that use high-level builders and read helpers
  instead of teaching raw GW payload parsing.
- Linked the new lifecycle note from `README.md` and `ARCHITECTURE.md` so the
  shared SDK layer exposes one neutral source of truth before runtime-specific
  docs add route execution details.
- Added `src/controller-device-lifecycle-readers.ts` so SDK callers can read
  commercial offer ids and activation codes through shared
  `getClaimsInFirstDataEntry(...)` / `getClaimsInBundleEntryAt(...)` helpers instead of repeating
  `body.data[0].meta.claims` parsing in runtime code and docs.
- Updated the shared dependency target to `gdc-common-utils-ts@^2.0.17`.

## [2.0.9] - 2026-06-27

- Added the runtime-neutral wallet contract to the sdk-core layer so app,
  browser, and backend runtimes can share one canonical `IWallet` model
  without placing it in `gdc-common-utils-ts`:
  - `src/wallet-contract.ts`
  - `src/index.ts`
  - `tests/iwallet-unified-compat.test.mjs`
- Added a runtime-neutral `UserProfileIndex` contract for local profile
  selection before PIN unlock in voice, web, and app channels:
  - `src/user-profile-index.ts`
  - `tests/user-profile-index.test.mjs`
- Restricted shared lookup keys to hashed contact tokens only:
  - raw phone/email values are not modeled in the shared contract
  - `sha256-salted` lookup tokens are the canonical storage form

## [2.0.8] - 2026-06-24

- Updated dependency target to gdc-common-utils-ts@^2.0.11.


## [2.0.7] - 2026-06-24

- Updated dependency target to gdc-common-utils-ts@^2.0.10.

## [2.0.6] - 2026-06-23

- Updated dependency target to gdc-common-utils-ts@^2.0.7.


## [2.0.5] - 2026-06-18

- Updated dependency target to gdc-common-utils-ts@^2.0.6.


## [2.0.4] - 2026-06-19

### Changed
- Updated the shared dependency target to `gdc-common-utils-ts@^2.0.6`.

## [2.0.3] - 2026-06-18

### Added
- Added a runtime-neutral host submission contract for the first
  legal-organization onboarding step that sends signed PDF evidence,
  controller binding material, and optional organization signing material to GW
  CORE `Organization/_transaction` before the later `_activate` step:
  - `src/legal-organization-verification-submission.ts`
  - `tests/101-legal-organization-verification-transaction.test.mjs`

### Changed
- Bumped the package patch version from `2.0.2` to `2.0.3`.
- Updated the shared dependency target to `gdc-common-utils-ts@^2.0.4`.
- Exported the runtime-neutral legal-organization verification submission
  helpers from the package entrypoint:
  - `src/index.ts`
- Clarified in the shared package guidance that:
  - `Organization/_transaction` is the canonical first legal-organization step
  - `_activate` is the later ICA-proof consumption step
  - runtime communication keys remain distinct from controller business keys

### Testing
- `npm run type-check`
- `npm test`

### Added
- Added the first v2 runtime-neutral profile/job contract slice so frontend and
  node runtimes can converge on one actor-aware `loadProfile` shape before
  implementing runtime-specific storage, sync, and transport behavior:
  - `src/profile-runtime.ts`
  - `tests/101-profile-runtime.test.mjs`
  - `docs/V2_PROFILE_RUNTIME_MIGRATION.md`
- Added a runtime-neutral organization-controller ICA credential retrieval
  facade so frontend and BFF runtimes can build and execute direct
  `GET _retrieve` calls for both the organization VC and the controller legal
  representative VC without hardcoding route/query rules in app code:
  - `src/organization-controller-credential-facade.ts`
  - `tests/organization-controller-credential-facade.test.mjs`
- Added explicit shared documentation and JSDoc that separate:
  - runtime/device/profile/BFF communication keys
  - controller business/operation-signing keys used for binding flows

### Changed
- Bumped the package patch version from `2.0.0` to `2.0.1`.
- Updated the shared dependency target to `gdc-common-utils-ts@^2.0.2`.
- Expanded the runtime-neutral actor session/profile layer so SDK runtimes can
  derive one descriptor directly from one known actor kind and reuse the shared
  `ProfileAppType` vocabulary from `gdc-common-utils-ts`:
  - `src/actor-model.ts`
  - `src/session-model.ts`
- Expanded the organization-controller facade surface to advertise direct ICA
  retrieval of organization and legal-representative credentials:
  - `src/actor-facade-surface.ts`
  - `tests/actor-facade-surface.test.mjs`
- Promoted the v2 profile/runtime split into the top-level package guidance so
  future work keeps `JobManager`, outbox, queue, and vault ownership
  runtime-neutral in `sdk-core` and concrete in runtime packages:
  - `ARCHITECTURE.md`
  - `CONTRIBUTING.md`
  - `README.md`
- Exported the new profile-runtime and organization-controller ICA retrieval
  facades from the package entrypoint:
  - `src/index.ts`
- Fixed the shared consent claim helper re-export so the runtime-neutral type
  alias remains a type-only export:
  - `src/consent-claim-helpers.ts`
- Clarified the onboarding teaching contract in shared docs so confidential
  apps, device profiles, and BFF portals do not conflate transport DIDComm keys
  with `controller.publicKeyJwk`.

### Testing
- `npm run type-check`
- `npm test`

## [2.0.0] - 2026-06-15

### Added
- Added canonical v2 architecture and contribution rules for runtime-neutral
  facades and actor/profile capability contracts:
  - `ARCHITECTURE.md`
  - `CONTRIBUTING.md`

### Changed
- Standardized lifecycle facade naming around operation-first preparation
  methods:
  - `prepareLifecycleIndividualOrganization(...)`
  - `prepareLifecycleIndividualOrganizationDisable(...)`
  - `prepareLifecycleIndividualOrganizationPurge(...)`
  in:
  - `src/individual-organization-lifecycle-facade.ts`
  - `tests/individual-organization-lifecycle-facade.test.mjs`
- Standardized search facade naming around operation-first preparation methods:
  - `prepareSearchLicenseList(...)`
  - `prepareSearchLicenseOffer(...)`
  - `prepareSearchLicenseOrder(...)`
  in:
  - `src/license-controller-facade.ts`
  - `tests/license-controller-facade.test.mjs`
- Rebased runtime-neutral lifecycle and hosting surfaces onto the shared v2
  `Editor` and `State` terminology from `gdc-common-utils-ts`:
  - `src/hosting-controller-facade.ts`
  - `src/individual-organization-lifecycle-facade.ts`
- Documented the v2 layering rule that shared high-level `get...` / `set...`
  methods must originate in `gdc-common-utils-ts` before they are wrapped by
  role/sector capability facades in `sdk-core`.

### Breaking
- Runtime-neutral consumers must migrate from mixed `create...` / `new...`
  preparation names to the canonical `prepare...` families.
- Runtime-neutral consumers must align with the v2 shared `Editor` / `State`
  surface instead of relying on older `Draft` naming for lifecycle and
  non-provisional helper state.

### Added
- Expanded the shared actor-facade surface so organization/personal runtime
  layers can advertise `searchCommunicationParticipants(...)` as a canonical
  communication search capability:
  - `src/actor-facade-surface.ts`
  - `tests/actor-facade-surface.test.mjs`

### Changed
- Updated the shared search-bundle helper so canonical search payloads can use
  business-level bundle types such as `search` and `search-response` rather
  than always forcing `batch`:
  - `src/search-bundle.ts`

## [0.11.1] - 2026-06-14

### Changed
- Updated the shared dependency target to `gdc-common-utils-ts@^1.24.1`.
- Refreshed the lockfile so `sdk-core` resolves the published
  `gdc-common-utils-ts@1.24.1` package.
- Kept the `sdk-core` source surface stable in this patch:
  - no runtime-neutral facade contracts changed
  - no actor/capability matrices changed
  - the release exists to align downstream SDK layers on the latest published
    confidential-storage public-projection contract

### Shared Surface Brought In By `gdc-common-utils-ts@1.24.1`
- Shared confidential-storage runtime metadata now available through the
  baseline includes:
  - `AuditInfo.disposition`
  - `PublicInfo`
  - `ConfidentialStorageDoc.public`
- Shared model JSDoc now clarifies that `public` contains copied or generated
  lookup/routing metadata that stays outside encrypted `content` and must not
  be treated as a second canonical payload.

### Testing
- `npm install gdc-common-utils-ts@^1.24.1`
- `npm run build`
- `npm test`

## [0.11.0] - 2026-06-13

### Added
- Added a neutral host-registry lifecycle facade and shared submit/poll helpers
  in:
  - `src/hosting-controller-facade.ts`
- Added runtime-neutral host route and input contracts for:
  - legal-organization order confirmation
  - hosted-tenant disable/purge payload authoring
  - host disable/purge payload authoring
- Added canonical host facade surface coverage in:
  - `tests/actor-facade-surface.test.mjs`

### Changed
- Expanded the actor-facade surface matrix so `HostOnboarding` now advertises:
  - `activateOrganizationInGatewayFromIcaProof(...)`
  - `confirmLegalOrganizationOrder(...)`
  - `disableHost(...)`
  - `purgeHost(...)`
  - `submitAndPoll(...)`
- Expanded the actor capability matrix so shared host/tenant runtime contracts
  now expose:
  - `HostingActivateOrganization`
  - `HostingConfirmOrder`
  - `HostingDisableHost`
  - `HostingPurgeHost`
  - `OrganizationDisableTenant`
  - `OrganizationPurgeTenant`
- Updated `buildActorSessionDescriptorFromActorFlags(...)` so organization
  controllers inherit the tenant disable/purge capabilities in the canonical
  runtime-neutral actor descriptor.
- Exported the new hosting facade from the public package entrypoint in:
  - `src/index.ts`
- Updated the shared dependency target to `gdc-common-utils-ts@^1.24.0`.
- Restored the lockfile to resolve the published `gdc-common-utils-ts@1.24.0`
  package instead of the temporary local `file:../gdc-common-utils-ts` link.

### Shared Surface Brought In By `gdc-common-utils-ts@1.24.0`
- Shared host/operator and tenant capability metadata now available through the
  baseline include:
  - canonical `Hosting...` actor capabilities
  - canonical `OrganizationDisableTenant` / `OrganizationPurgeTenant`
  - `ActorCapabilityDocs`
  - `getActorCapabilityDoc(...)`
- Shared activation-policy support now available through the baseline includes:
  - service `category` authorization validation
  - service `serviceType` authorization validation
  - wildcard host-category authorization support
- Shared hosted-identity and persistence helpers now available through the
  baseline include:
  - hosted provider DID builders
  - provider-sector DID builders
  - canonical individual/member DID builders
  - confidential-storage blob persistence helpers
  - deep undefined sanitization helpers

### Testing
- `npm install gdc-common-utils-ts@^1.24.0`
- `npm run build`
- `npm test`

## [0.10.2] - 2026-06-13

### Changed
- Updated the shared dependency target to `gdc-common-utils-ts@^1.23.0`.
- Refreshed the lockfile so `sdk-core` resolves the published `1.23.0`
  package tarball instead of the previous `1.21.0` line.
- Pulled the newly published shared invoice/charge-item claims surface into the
  runtime-neutral dependency baseline so downstream node/frontend SDK layers
  that combine `sdk-core` with the shared utilities can align on one published
  source for:
  - canonical invoice claim keys
  - canonical charge-item claim keys
  - invoice/charge-item contextualized claim variants
  - invoice repeated-row builder semantics
  - invoice `meta.claims` projection support
- Kept the `sdk-core` source surface intentionally stable in this patch:
  - no runtime-neutral facade files changed
  - no actor/capability contracts changed
  - the release is a dependency and packaging alignment cut so downstream
    packages install the current published shared claims surface

### Shared Surface Brought In By `gdc-common-utils-ts@1.23.0`
- Invoice-level claims now available through the shared baseline include:
  - `Invoice.identifier`
  - `Invoice.date`
  - `Invoice.status`
  - `Invoice.subject`
  - `Invoice.recipient`
  - `Invoice.issuer`
  - `Invoice.issuer-display`
  - `Invoice.payment-terms`
  - `Invoice.payment-url`
  - `Invoice.totalnet-value`
  - `Invoice.totalnet-currency`
  - `Invoice.totalgross-value`
  - `Invoice.totalgross-currency`
- Charge-item-level claims now available through the shared baseline include:
  - `ChargeItem.identifier`
  - `ChargeItem.status`
  - `ChargeItem.part-of`
  - `ChargeItem.code`
  - `ChargeItem.code-text`
  - `ChargeItem.category`
  - `ChargeItem.supplier-productcode`
  - `ChargeItem.quantity`
  - `ChargeItem.quantity-number`
  - `ChargeItem.quantity-unit`
  - `ChargeItem.items-per-unit`
  - `ChargeItem.items-quantity`
  - `ChargeItem.items-quantity-number`
  - `ChargeItem.items-quantity-unit`
- Builder and projection helpers now available in the shared baseline include:
  - invoice claim construction through `createInvoiceBundleEditor()`
  - repeated invoice + charge-item claim-row generation
  - contextualized claim generation for `org.hl7.fhir.api.*`
  - invoice `resource.meta.claims` embedding in generated FHIR resources

### Testing
- `npm install gdc-common-utils-ts@^1.23.0`

## [0.10.1] - 2026-06-13

### Added
- Added a neutral `IndividualOrganizationLifecycleFacade` over the shared
  lifecycle draft/result readers, with explicit helpers for:
  - disable and purge draft creation
  - identifier/owner/resource-id setters
  - claims merge/build
  - lifecycle result readback
- Added a neutral `LicenseControllerFacade` over the shared license search/list
  helpers so runtimes can expose one canonical surface for:
  - license list/search
  - commercial offer search/list
  - commercial order search/list

### Changed
- Expanded actor facade surface parity so shared runtime-neutral contracts now
  expose:
  - `searchOrganizationEmployees(...)`
  - `searchClinicalBundle(...)`
  - `getLatestIps(...)`
  where the actor surface already had corresponding runtime support.
- Expanded the neutral actor surface again so license-centric runtimes can
  publish:
  - `searchLicenses(...)`
  - `listLicenses(...)`
  - `searchLicenseOffers(...)`
  - `listLicenseOffers(...)`
  - `searchLicenseOrders(...)`
  - `listLicenseOrders(...)`
- Extended consent claim-helper parity so `ConsentClaims` now supports the same
  add/remove grouped-list mutations for:
  - actor identifiers
  - actor roles
  - purposes
  - sections
- Updated the shared dependency target to `gdc-common-utils-ts@^1.21.0`.
- Refreshed the release roadmap in `TODO.md` to reflect the broader neutral
  surface around lifecycle, bundle authoring, license/query DTOs, and consent
  management.

### Testing
- `npm run build`
- `npm test -- 101-resource-claims.test.mjs individual-organization-lifecycle-facade.test.mjs`

## [0.9.1] - 2026-06-11

### Changed
- Updated the shared dependency target to `gdc-common-utils-ts@^1.20.1` so
  downstream SDK packages consume the published licensing/`IndividualProduct`
  helper surface.

### Testing
- `npm run build`

## [0.9.0] - 2026-06-10

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
- Added the first shared individual onboarding facade so frontend/backend
  runtimes can reuse one canonical onboarding draft flow:
  - `src/individual-onboarding-facade.ts`
- Added explicit onboarding helpers for:
  - deriving controller-prefilled form fields from KYC
  - controller/subject setter ergonomics
  - validation
  - claims merge/build
  - `DocumentReference` draft output
  - onboarding PDF request-bundle creation
- Added focused executable onboarding coverage in:
  - `tests/individual-onboarding-facade.test.mjs`

### Changed
- Updated the shared dependency target to the onboarding-capable
  `gdc-common-utils-ts@^1.20.0`.
- Clarified the discovery boundary in the README and facade comments so host
  discovery starts from the contextualized hosting-operator base URL rather
  than the host root.
- Clarified the canonical host-scoped DSP entrypoint shape as
  `/host/cds-{hostCoverageScope}/{version}/{hostNetwork}/.well-known/dspace-version`
  so host coverage scope stays distinct from legal jurisdiction.
- Updated the consent outbox coverage to write and assert the canonical
  `Communication.topic` claim through the shared claim helpers.

### Testing
- `npm test`
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
