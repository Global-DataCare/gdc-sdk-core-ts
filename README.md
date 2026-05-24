# gdc-sdk-core-ts

Minimal runtime-neutral core extracted from the current SDK convergence work.

Key docs:

- [CHANGELOG.md](CHANGELOG.md)
- [SECURITY.md](SECURITY.md)
- [../gdc-common-utils-ts/docs/CONSENT_ACCESS_101.md](../gdc-common-utils-ts/docs/CONSENT_ACCESS_101.md)

Current scope:

- actor kinds
- capability labels
- session descriptor
- facade descriptor
- actor capability filtering
- expansion from composite session descriptor to role-scoped facades
- runtime-neutral identity/discovery/bootstrap contracts
- provider DID to endpoint resolution helpers

Explicitly out of scope in this first slice:

- Node adapters
- Expo adapters
- fetch / crypto initialization
- gateway clients
- ICA / GW orchestration flows

Purpose:

- become the future shared source of truth for actor/capability contracts
- avoid re-encoding Family/Organization role semantics separately in frontend and backend SDKs

## API Index

The canonical contract should live in JSDoc on exported code. This README is the linked index.

### Actor/session contracts

- [`filterCapabilitiesForActor(...)`](src/actor-model.ts)
  - Keeps only capabilities valid for a given actor kind.
  - Params: `actorKind`, `capabilities`.
- [`expandActorSessionDescriptorToFacades(...)`](src/actor-model.ts)
  - Splits a composite actor session into one facade per actor kind.
  - Params: `descriptor`.
- [`buildActorSessionDescriptorFromActorFlags(...)`](src/actor-model.ts)
  - Derives actor kinds and capabilities from boolean actor flags.
  - Params: `input.appType`, `input.profileId`, `input.profileDid?`, `input.role?`, `input.actorFlags`.
- [`DeviceTrustLevel`, `PersistenceMode`, `DataPersistencePolicy`](src/session-model.ts)
  - Shared trust and persistence policy contracts for wallet, drafts, and outbox handling.
- [`MemoryIdentityStore`](src/identity-store.ts)
  - In-memory separation of transport identity, actor identity, provider identity, and DID document cache.

### Identity/discovery/bootstrap

- [`createBootstrapFacade(...)`](src/bootstrap-facade.ts)
  - Builds canonical `_activate` payloads and validates canonical-vs-legacy priority.
- [`createStaticDiscoveryFacade(...)`](src/discovery-facade.ts)
  - In-memory discovery facade for tests, demos, and pre-resolved metadata injection.
- [`resolveProviderIdentityForSubject(...)`](src/did-resolution-session.ts)
  - Resolves provider DID and cached provider identity from a subject DID.
- [`resolveSmartTokenEndpointForSubject(...)`](src/smart-endpoint-resolver.ts)
  - Resolves the published SMART token endpoint from provider DID metadata.

### Polling helpers

- [`resolvePollOptionsFromSeconds(...)`](src/polling-model.ts)
  - Converts poll timeout/interval seconds into SDK poll options.
  - Params: `timeoutSeconds?`, `intervalSeconds?`, `defaults?`.

### Communication/document contracts

- [`assertCommunicationInput(...)`](src/communication-bundle-contracts.ts)
  - Validates runtime-neutral communication input payloads.
- [`assertCommMsgExtendedInput(...)`](src/communication-bundle-contracts.ts)
  - Validates runtime-neutral `CommMsgExtended` inputs.
- [`assertBundleSearchQuery(...)`](src/communication-bundle-contracts.ts)
  - Validates canonical clinical bundle search queries.

### Consent access

- [`groupConsentsForControllerView(...)`](src/consent-access.ts)
  - Loads all active subject consents and groups them by actor-specific, organization, jurisdiction, and phone-extension target.
- [`evaluateRequestedAccess(...)`](src/consent-access.ts)
  - Evaluates one SMART-style access request against the full active consent set, with first-tier precedence intended for concrete email matches.
- [`getMissingPermissions(...)`](src/consent-access.ts)
  - Extracts deterministic missing coverage from the evaluation result.
- [`buildPermissionRequestCommunication(...)`](src/consent-access.ts)
  - Builds the canonical permission-request `Communication`.
- [`buildPermissionRequestCommunicationLookupQuery(...)`](src/consent-access.ts)
  - Builds a subject-scoped lookup query by `Communication.identifier`, `thid`, or `DocumentReference.contenthash`.

Consent precedence implemented by the shared model:

1. explicit deny for a concrete email
2. explicit permit for a concrete email
3. organization decision
4. jurisdiction decision
5. default deny

### Relationship invitation / acceptance

- [`createRelationshipChannelInvitationInput(...)`](src/relationship-access.ts)
  - Normalizes the shared invitation payload that a controller uses to invite a related person or professional to connect with a subject through `phone`, `email`, or `app`.
- [`createRelationshipChannelInvitationSummary(...)`](src/relationship-access.ts)
  - Normalizes the runtime summary returned for an invitation and its state.
- [`createRelationshipChannelOtpStartInput(...)`](src/relationship-access.ts)
  - Normalizes OTP challenge start input for portal, app, or IVR flows.
- [`createRelationshipChannelOtpConfirmInput(...)`](src/relationship-access.ts)
  - Normalizes OTP confirmation input.
- [`createRelationshipChannelOtpChallengeSummary(...)`](src/relationship-access.ts)
  - Normalizes OTP challenge state returned by the backend.
- [`createRelationshipPinPolicy(...)`](src/relationship-access.ts)
  - Normalizes relationship PIN policy hints.
- [`createRelationshipPinSetInput(...)`](src/relationship-access.ts)
  - Normalizes PIN setup input after OTP verification.
- [`createRelationshipPinVerifyInput(...)`](src/relationship-access.ts)
  - Normalizes PIN verification input for an active relationship channel.
- [`createRelationshipLocalKeyEnvelope(...)`](src/relationship-access.ts)
  - Normalizes the portable envelope used by offline-first apps to store a relationship-scoped local symmetric key.

### Communication/document builders and readers

- [`createCommunicationResource(...)`](src/communication-resource-helpers.ts)
- [`buildCommunicationBatchMessage(...)`](src/communication-resource-helpers.ts)
- [`addFhirResourceToCommunication(...)`](src/communication-resource-helpers.ts)
- [`addClaimsResourceToCommunication(...)`](src/communication-resource-helpers.ts)
- [`resolveCommunicationPayloads(...)`](src/communication-resource-helpers.ts)
- [`getFirstBundleDocumentFromCommunication(...)`](src/communication-resource-helpers.ts)
- [`getBundleDocumentEntries(...)`](src/communication-resource-helpers.ts)
- [`getBundleDocumentResourcesByType(...)`](src/communication-resource-helpers.ts)
- [`getMedicationClaimsFromCommunicationDocument(...)`](src/communication-resource-helpers.ts)
- [`sortFhirResourcesByDateDescending(...)`](src/communication-resource-helpers.ts)
- [`getObservationsByCodeFromCommunicationDocument(...)`](src/communication-resource-helpers.ts)

### Drafts and outbox

- [`createCommunicationDraft(...)`](src/communication-draft.ts)
  - Creates an in-memory draft around a FHIR `Communication`.
  - Main params: `subject`, `sender?`, `recipient?`, `noteText?`, `draftId?`, `createdAt?`.
- [`getCommunicationFromDraft(...)`](src/communication-draft.ts)
  - Returns the current FHIR `Communication` being edited.
- [`isCommunicationDraftReady(...)`](src/communication-draft.ts)
  - Checks whether the draft already has at least one payload.
- [`addFhirResourceToDraft(...)`](src/communication-draft.ts)
  - Appends a concrete FHIR resource/document to the draft.
- [`addClaimsResourceToDraft(...)`](src/communication-draft.ts)
  - Appends a claims-only pseudo-resource to the draft.
- [`createOutboxJobFromDraft(...)`](src/communication-draft.ts)
  - Freezes the draft into a transport-oriented outbox job with prebuilt batch envelope.
- [`updateOutboxJobStatus(...)`](src/communication-draft.ts)
  - Moves an outbox job through `draft`, `ready`, `submitting`, `sent`, `completed`, `failed`, or `error-retryable`.
- [`OutboxJob`](src/communication-draft.ts)
  - Generic outbox job shape with `payload` and `envelope`.
- [`CommunicationOutboxJob`](src/communication-draft.ts)
  - First concrete specialization where the payload is a FHIR `Communication`.
- [`IOutboxRepository`](src/communication-outbox.ts)
  - Runtime-neutral repository contract for drafts and outbox jobs.
- [`OutboxRepositoryMemory`](src/communication-outbox.ts)
  - Memory-backed baseline implementation for tests, demos, and local runtimes.

### High-level document facade

- [`getDocumentFromCommunication(...)`](src/communication-document-facade.ts)
  - Resolves direct attachment vs embedded `DocumentReference`.
- [`createFhirDocumentFacade(...)`](src/communication-document-facade.ts)
  - Exposes `getBundle()`, `getSections()`, `getResources(resourceType?)`, `getByDates(...)`, `getContainingTextOrDisplay(...)`.
- [`createCommunicationFacade()`](src/communication-document-facade.ts)
  - Exposes `getDocument(...)` and `getFhirDocument(...)`.

### Vital signs

- [`createHeartRateObservation(...)`](src/vital-signs.ts)
- [`createBodyTemperatureObservation(...)`](src/vital-signs.ts)
- [`createBloodPressureObservation(...)`](src/vital-signs.ts)
- [`createVitalSignsFacade(...)`](src/vital-signs.ts)

### Documentation rule

- JSDoc on exported code is canonical.
- README entries should link to source and summarize the main parameters.
- New public exports should be documented in code first and then added here.
