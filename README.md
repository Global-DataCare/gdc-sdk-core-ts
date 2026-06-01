# gdc-sdk-core-ts

Runtime-neutral shared contracts and helpers for GDC SDK consumers.

This package is for code that needs to understand and build GDC business flows
without caring about gateway routes, `host/...` vs `:tenantId/...`, transport
adapters, or UNID-specific runtime details.

## Actor Split

The shared SDK family starts by separating actor families, because the flows are
not the same:

- organization side
  - organization controller
  - organization employee / professional member
- individual side
  - individual controller
  - individual member / self
  - related person
  - professional with consented access

This package is the shared business-contract layer for all of those actors. It
does not execute runtime calls, but it defines or normalizes the payloads and
evaluations they all depend on.

## Start Here

If you are new and need to see real SDK initialization and real method usage,
open these documents in this order:

- [docs/SDK_FLOWS_101.md](./docs/SDK_FLOWS_101.md)
  Business-flow map from actor split to consent, invitation, import, and SMART.
- [docs/CONSENT_COMMUNICATION_MUTATIONS_101.md](./docs/CONSENT_COMMUNICATION_MUTATIONS_101.md)
  Uniform get/set/add/enable/disable/remove contract for consent operations and communication resources.
- [gdc-sdk-node-ts/docs/SDK_INTEGRATION_101.md](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/docs/SDK_INTEGRATION_101.md)
  Real backend initialization with `initializeCommunicationIdentity(...)`,
  `new NodeHttpClient(...)`, runtime facades, and step-by-step GW usage.
- [gdc-sdk-front-ts/docs/SDK_INTEGRATION_101.md](https://github.com/Global-DataCare/gdc-sdk-front-ts/blob/main/docs/SDK_INTEGRATION_101.md)
  Real frontend/native initialization with `new ClientSDK(...)`,
  `initializeSession(...)`, provider discovery, and profile/session bootstrap.

Important:

- `gdc-sdk-core-ts` does not initialize a runtime client by itself.
- Runtime initialization lives in `gdc-sdk-node-ts` and `gdc-sdk-front-ts`.
- Shared payload shapes and examples live in `gdc-common-utils-ts`.

Shared example files to open while reading those guides:

- [gdc-common-utils-ts/src/examples/shared.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/shared.ts)
- [gdc-common-utils-ts/src/examples/organization-controller.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/organization-controller.ts)
- [gdc-common-utils-ts/src/examples/individual-controller.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/individual-controller.ts)
- [gdc-common-utils-ts/src/examples/professional.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/professional.ts)
- [gdc-common-utils-ts/src/examples/frontend-session.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/frontend-session.ts)
- [gdc-common-utils-ts/src/examples/relationship-access.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/relationship-access.ts)
- [gdc-common-utils-ts/src/examples/lifecycle.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/lifecycle.ts)
- [gdc-common-utils-ts/docs/LIFECYCLE_101.md](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/LIFECYCLE_101.md)

## Flow Families

The SDK documentation must cover these families from the start:

### Organization bootstrap and activation

- activate organization from ICA proof
- confirm organization order / offer
- prepare legal organization controller bootstrap payloads
- always declare service capabilities during legal-organization activation
- use `orgControllerDid` as the teaching name for the controller DID
- prefer `organizationActivation` as the local activation builder/result name in examples

Primary reusable examples:

- [gdc-common-utils-ts/src/examples/organization-controller.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/organization-controller.ts)

### Employee creation and employee invitation

- create employee payload
- issue employee activation / invitation path
- employee device activation
- employee SMART access

Primary reusable examples:

- [gdc-common-utils-ts/src/examples/organization-controller.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/organization-controller.ts)

### Individual organization bootstrap

- start individual organization
- confirm individual order / offer
- prepare controller-owned individual bootstrap payloads

Primary reusable examples:

- [gdc-common-utils-ts/src/examples/individual-controller.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/individual-controller.ts)

### Related person and professional access to individual

- create `RelatedPerson`
- grant access / create consent
- evaluate requested access
- detect missing permissions
- build permission-request `Communication`
- invite actor and accept invitation

Primary reusable examples:

- [gdc-common-utils-ts/src/examples/related-person.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/related-person.ts)
- [gdc-common-utils-ts/src/examples/professional.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/professional.ts)
- [gdc-common-utils-ts/docs/CONSENT_ACCESS_101.md](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/CONSENT_ACCESS_101.md)

### Permission lifecycle

- create/grant permissions
- edit or replace permissions
- enable / disable / delete permissions
- grouped permission views for controller UX
- permission-request notifications and lookup

Canonical lifecycle naming for all SDK-facing docs and examples:

- `enable`
- `disable`
- `delete`

Do not teach new integrations with mixed public naming such as `revoke`,
`suspend`, or `purge` when the intended API concept is the common lifecycle.

### Clinical data contribution and retrieval

- ingest `Communication`
- import documents/resources into the subject index
- search clinical bundles
- search latest IPS
- request SMART token for subject-scoped access

These flows may be executed by:

- professional
- individual controller
- related person with write permission
- caregiver or other actor with explicit allowed sections/actions

## Main Flows

### 1. Consent access evaluation

Use this when an app or backend needs to answer:

- can this professional or related person access this subject now?
- what permissions are missing?
- how do I build the canonical permission-request `Communication`?

Main helpers:

- `groupConsentsForControllerView(...)`
- `evaluateRequestedAccess(...)`
- `getMissingPermissions(...)`
- `buildPermissionRequestCommunication(...)`
- `buildPermissionRequestCommunicationLookupQuery(...)`

Reference:

- [gdc-common-utils-ts/docs/CONSENT_ACCESS_101.md](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/CONSENT_ACCESS_101.md)

### 2. Relationship invitation and acceptance

Use this when a controller invites a `related person` or `professional` to
connect with an individual or other subject.

The shared flow is:

1. controller creates invitation payload
2. invitee starts OTP challenge
3. invitee confirms OTP
4. invitee sets relationship PIN if required
5. relationship channel becomes active

Main helpers:

- `createRelationshipChannelInvitationInput(...)`
- `createRelationshipChannelInvitationSummary(...)`
- `createRelationshipChannelOtpStartInput(...)`
- `createRelationshipChannelOtpConfirmInput(...)`
- `createRelationshipChannelOtpChallengeSummary(...)`
- `createRelationshipPinPolicy(...)`
- `createRelationshipPinSetInput(...)`
- `createRelationshipPinVerifyInput(...)`
- `createRelationshipLocalKeyEnvelope(...)`

What this package does:

- validates and normalizes the shared payloads
- keeps the contract stable across portal, app, and phone-channel consumers

What this package does not do:

- call GW endpoints
- manage OTP providers
- store PIN hashes
- know anything about UNID reminder `Task` runtime

### 3. Communication and document handling

Use this when an app needs to build or read canonical `Communication` payloads
and attached clinical documents.

Main helpers:

- `createCommunicationResource(...)`
- `buildCommunicationBatchMessage(...)`
- `addFhirResourceToCommunication(...)`
- `addClaimsResourceToCommunication(...)`
- `createCommunicationDraft(...)`
- `createOutboxJobFromDraft(...)`
- `createCommunicationFacade()`

## Who Should Use This Package

- `gdc-sdk-node-ts`
- `gdc-sdk-front-ts`
- portal/backend orchestration layers
- frontend/mobile code that needs stable contracts before runtime wiring

If you need HTTP/GW runtime behavior, use `gdc-sdk-node-ts` or a future runtime
adapter, not this package directly.

## Minimal Examples

### Consent check

```ts
import {
  evaluateRequestedAccess,
  getMissingPermissions,
  type ConsentCoverageRequest,
} from 'gdc-sdk-core-ts';
import {
  EXAMPLE_EMAIL_PROFESSIONAL,
  EXAMPLE_INDIVIDUAL_DID_WEB,
} from 'gdc-common-utils-ts/examples/consent-access';
import {
  HealthcareActorRoles,
  HealthcareBasicSections,
  HealthcareConsentPurposes,
} from 'gdc-common-utils-ts/constants/healthcare';

const request: ConsentCoverageRequest = {
  subject: EXAMPLE_INDIVIDUAL_DID_WEB,
  actor: { actorKind: 'professional', email: EXAMPLE_EMAIL_PROFESSIONAL },
  actorRole: HealthcareActorRoles.Physician,
  purpose: HealthcareConsentPurposes.Treatment,
  sections: [HealthcareBasicSections.HistoryOfMedicationUse.claim],
};

const evaluation = await evaluateRequestedAccess(provider, request);

const missing = getMissingPermissions(evaluation);
```

### Relationship invitation

```ts
import {
  createRelationshipChannelInvitationInput,
  createRelationshipChannelOtpStartInput,
  createRelationshipPinSetInput,
  RelationshipAccessActorKinds,
  RelationshipEnrollmentChannels,
  RelationshipOtpDeliveryChannels,
  RelationshipSubjectKinds,
  type RelationshipChannelInvitationInput,
  type RelationshipChannelOtpStartInput,
  type RelationshipPinSetInput,
} from 'gdc-sdk-core-ts';
import {
  buildIndividualDidWeb,
  HealthcareActorRoles,
  HealthcareConsentPurposes,
} from 'gdc-common-utils-ts';

const tenantId = 'acme-id';
const jurisdiction = 'ES';
const sector = 'health-care';
const providerOrganizationDid = subjectProfile.organizationDid;
const subjectLocalId = subjectProfile.subjectId;
const subjectDid = buildIndividualDidWeb({
  organizationDidWeb: providerOrganizationDid,
  subjectId: subjectLocalId,
});
const emailProfessional = professionalDirectoryEntry.email;
const actorKind = RelationshipAccessActorKinds.Professional;
const actorIdentifier = emailProfessional;
const actorRole = HealthcareActorRoles.Physician;
const deliveryChannel = RelationshipEnrollmentChannels.Phone;
const deliveryTarget = professionalDirectoryEntry.phone;
const purpose = HealthcareConsentPurposes.Treatment;
const phonePinOptional = false;

const invitationInput: RelationshipChannelInvitationInput = {
  tenantId,
  jurisdiction,
  sector,
  subjectId: subjectDid,
  subjectKind: RelationshipSubjectKinds.Person,
  actorKind,
  actorIdentifier,
  actorRole,
  deliveryChannel,
  deliveryTarget,
  purpose,
  relationshipLabel: 'primary-physician',
  phonePinOptional,
};

const invitation = createRelationshipChannelInvitationInput(invitationInput);

const invitationId = 'rel-invite-001';

const otpStartInput: RelationshipChannelOtpStartInput = {
  invitationId,
  deliveryChannel: RelationshipOtpDeliveryChannels.Sms,
  locale: 'es-ES',
};

const otpStart = createRelationshipChannelOtpStartInput(otpStartInput);

const challengeId = 'otp-challenge-001';
const pin = '482915';

const pinSetInput: RelationshipPinSetInput = {
  invitationId,
  challengeId,
  channel: deliveryChannel,
  pin,
  pinConfirmation: pin,
  policy: {
    minLength: 6,
    numericOnly: true,
  },
};

const pinSet = createRelationshipPinSetInput(pinSetInput);
```

Where those variables come from:

- `tenantId`, `jurisdiction`, `sector`
  come from the selected GW tenant route context
- `subjectDid`
  should be built with `buildIndividualDidWeb(...)` from the provider/subject identifiers you already have
- `actorKind`, `actorIdentifier`, `actorRole`
  come from the invited professional or related person
- `deliveryChannel`, `deliveryTarget`
  come from the chosen channel for enrollment
- `invitationId`, `challengeId`
  come from the backend after creating the invitation and starting OTP
- `pin`
  comes from the invitee during channel enrollment

## API Index

The canonical contract should live in JSDoc on exported code. This README is the
entrypoint, not the exhaustive reference.

## Full Public Surface

The following modules define the complete public SDK surface exported by this
package:

- [`src/actor-model.ts`](src/actor-model.ts)
  - types: `ActorKind`, `Capability`, `ActorSessionDescriptor`, `ActorFacadeDescriptor`, `ActorFlags`, `ActorSessionDescriptorInput`
  - functions: `filterCapabilitiesForActor(...)`, `expandActorSessionDescriptorToFacades(...)`, `buildActorSessionDescriptorFromActorFlags(...)`
- [`src/bootstrap-facade.ts`](src/bootstrap-facade.ts)
  - types: `BootstrapValidationIssue`, `OrganizationActivationPayload`, `BootstrapFacade`
  - function: `createBootstrapFacade()`
- [`src/communication-bundle-contracts.ts`](src/communication-bundle-contracts.ts)
  - types: `AttachmentObj`, `CommunicationInput`, `CommMsgExtendedInput`, `DateRange`, `SectionFilter`, `IncludedResourceType`, `BundleSearchQuery`, `CompositionSearchQuery`, `ProjectedResourceSummary`, `BundleSearchResult`, `CommunicationAuditRecord`
  - functions: `assertCommunicationInput(...)`, `assertCommMsgExtendedInput(...)`, `assertBundleSearchQuery(...)`
- [`src/consent-access.ts`](src/consent-access.ts)
  - types: `PermissionRequestCommunicationInput`, `PermissionRequestCommunicationLookup`, `ActiveConsentProvider`
  - functions: `groupConsentsForControllerView(...)`, `evaluateRequestedAccess(...)`, `getMissingPermissions(...)`, `buildPermissionRequestCommunication(...)`, `buildPermissionRequestCommunicationLookupQuery(...)`
- [`src/communication-draft.ts`](src/communication-draft.ts)
  - constant: `CommunicationOutboxStatuses`
  - types: `CommunicationOutboxStatus`, `CommunicationDraft`, `CommunicationDraftCreationOptions`, `OutboxJob`, `CommunicationOutboxJob`, `CommunicationOutboxJobOptions`
  - functions: `createCommunicationDraft(...)`, `getCommunicationFromDraft(...)`, `isCommunicationDraftReady(...)`, `addFhirResourceToDraft(...)`, `addClaimsResourceToDraft(...)`, `createOutboxJobFromDraft(...)`, `updateOutboxJobStatus(...)`
- [`src/communication-document-facade.ts`](src/communication-document-facade.ts)
  - types: `ResolvedCommunicationDocument`, `FhirDocumentSection`, `FhirDocumentFacade`
  - functions: `getDocumentFromCommunication(...)`, `createFhirDocumentFacade(...)`, `createCommunicationFacade()`
- [`src/communication-outbox.ts`](src/communication-outbox.ts)
  - types/interfaces: `OutboxQuery`, `IOutboxRepository`
  - class: `OutboxRepositoryMemory`
- [`src/communication-resource-helpers.ts`](src/communication-resource-helpers.ts)
  - types: `FhirResourceLike`, `CommunicationResourceLike`, `AttachmentEncodingInput`, `CommunicationCreationOptions`, `ResourceAttachmentOptions`, `CommunicationPayloadResolution`, `ObservationCodeFilter`, `CommunicationBatchMessageOptions`
  - functions: `createCommunicationResource(...)`, `buildCommunicationBatchMessage(...)`, `addFhirResourceToCommunication(...)`, `addClaimsResourceToCommunication(...)`, `resolveCommunicationPayloads(...)`, `getFirstBundleDocumentFromCommunication(...)`, `getBundleDocumentEntries(...)`, `getBundleDocumentResourcesByType(...)`, `getMedicationClaimsFromCommunicationDocument(...)`, `sortFhirResourcesByDateDescending(...)`, `getObservationsByCodeFromCommunicationDocument(...)`
- [`src/did-resolution-session.ts`](src/did-resolution-session.ts)
  - functions: `getProviderDidFromSubjectDid(...)`, `resolveDidDocumentServices(...)`, `resolveProviderIdentityForSubject(...)`
- [`src/discovery-facade.ts`](src/discovery-facade.ts)
  - types/interfaces: `DiscoveryResolutionResult`, `DiscoveryFacade`
  - function: `createStaticDiscoveryFacade(...)`
- [`src/identity-model.ts`](src/identity-model.ts)
  - types: `DidServiceLike`, `DidDocumentLike`, `ResolvedServiceEndpointLike`, `TransportIdentityState`, `ActorIdentityState`, `ProviderIdentityState`
- [`src/identity-store.ts`](src/identity-store.ts)
  - interfaces: `DidDocumentStore`, `IdentityStore`
  - class: `MemoryIdentityStore`
- [`src/polling-model.ts`](src/polling-model.ts)
  - types: `SubmitPayload`, `AsyncPollRequest`, `SubmitResponse`, `PollOptions`, `PollResult`, `SubmitAndPollResult`
  - function: `resolvePollOptionsFromSeconds(...)`
- [`src/relationship-access.ts`](src/relationship-access.ts)
  - types: `RelationshipEnrollmentChannel`, `RelationshipSubjectKind`, `RelationshipAccessActorKind`, `RelationshipInvitationStatus`, `RelationshipOtpDeliveryChannel`, `RelationshipPinKdf`, `RelationshipChannelInvitationInput`, `RelationshipChannelInvitationSummary`, `RelationshipChannelOtpStartInput`, `RelationshipChannelOtpConfirmInput`, `RelationshipChannelOtpChallengeSummary`, `RelationshipPinPolicy`, `RelationshipPinSetInput`, `RelationshipPinVerifyInput`, `RelationshipLocalKeyEnvelope`
  - functions: `createRelationshipChannelInvitationInput(...)`, `createRelationshipChannelInvitationSummary(...)`, `createRelationshipChannelOtpStartInput(...)`, `createRelationshipChannelOtpConfirmInput(...)`, `createRelationshipChannelOtpChallengeSummary(...)`, `createRelationshipPinPolicy(...)`, `createRelationshipPinSetInput(...)`, `createRelationshipPinVerifyInput(...)`, `createRelationshipLocalKeyEnvelope(...)`
- [`src/session-model.ts`](src/session-model.ts)
  - types/interfaces: `AppType`, `AppInfo`, `DeviceTrustLevel`, `PersistenceMode`, `DataPersistencePolicy`, `InitializeSessionParams`, `Profile`, `ProfileRegistryEntry`, `VaultQueryCondition`, `VaultQuery`, `IVaultRepository`, `IApiConfig`, `INetwork`, `IVerifier`
- [`src/smart-endpoint-resolver.ts`](src/smart-endpoint-resolver.ts)
  - function: `resolveSmartTokenEndpointForSubject(...)`
- [`src/vital-signs.ts`](src/vital-signs.ts)
  - types: `VitalSignQuantityInput`, `BloodPressureInput`, `VitalSignsDocumentBase`
  - functions: `createHeartRateObservation(...)`, `createBodyTemperatureObservation(...)`, `createBloodPressureObservation(...)`, `createVitalSignsFacade(...)`

### Actor/session contracts

- [`filterCapabilitiesForActor(...)`](src/actor-model.ts)
- [`expandActorSessionDescriptorToFacades(...)`](src/actor-model.ts)
- [`buildActorSessionDescriptorFromActorFlags(...)`](src/actor-model.ts)
- [`DeviceTrustLevel`, `PersistenceMode`, `DataPersistencePolicy`](src/session-model.ts)
- [`MemoryIdentityStore`](src/identity-store.ts)

### Identity/discovery/bootstrap

- [`createBootstrapFacade(...)`](src/bootstrap-facade.ts)
- [`createStaticDiscoveryFacade(...)`](src/discovery-facade.ts)
- [`resolveProviderIdentityForSubject(...)`](src/did-resolution-session.ts)
- [`resolveSmartTokenEndpointForSubject(...)`](src/smart-endpoint-resolver.ts)
- [`gdc-common-utils-ts/docs/DATASPACE_DISCOVERY_DEFAULTS_101.md`](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/DATASPACE_DISCOVERY_DEFAULTS_101.md)
  - shared portal/backend bootstrap guide for `defaults-only`,
    `default-first`, and `internet-first` discovery seeding

Discovery boundary rule:

- `gdc-sdk-core-ts` defines runtime-neutral contracts only
- host DSP resolution from `/.well-known/dspace-version` and `/dsp/catalog/dcat.json`
  belongs to `gdc-sdk-node-ts` or a backend/BFF adapter
- frontend DTO/card mapping belongs to `gdc-sdk-front-ts`

### Polling helpers

- [`resolvePollOptionsFromSeconds(...)`](src/polling-model.ts)

### Communication/document contracts

- [`assertCommunicationInput(...)`](src/communication-bundle-contracts.ts)
- [`assertCommMsgExtendedInput(...)`](src/communication-bundle-contracts.ts)
- [`assertBundleSearchQuery(...)`](src/communication-bundle-contracts.ts)

### Consent access

- [`groupConsentsForControllerView(...)`](src/consent-access.ts)
- [`evaluateRequestedAccess(...)`](src/consent-access.ts)
- [`getMissingPermissions(...)`](src/consent-access.ts)
- [`buildPermissionRequestCommunication(...)`](src/consent-access.ts)
- [`buildPermissionRequestCommunicationLookupQuery(...)`](src/consent-access.ts)

Consent precedence in the shared model:

1. explicit deny for a concrete email
2. explicit permit for a concrete email
3. organization decision
4. jurisdiction decision
5. default deny

### Relationship access

- [`createRelationshipChannelInvitationInput(...)`](src/relationship-access.ts)
- [`createRelationshipChannelInvitationSummary(...)`](src/relationship-access.ts)
- [`createRelationshipChannelOtpStartInput(...)`](src/relationship-access.ts)
- [`createRelationshipChannelOtpConfirmInput(...)`](src/relationship-access.ts)
- [`createRelationshipChannelOtpChallengeSummary(...)`](src/relationship-access.ts)
- [`createRelationshipPinPolicy(...)`](src/relationship-access.ts)
- [`createRelationshipPinSetInput(...)`](src/relationship-access.ts)
- [`createRelationshipPinVerifyInput(...)`](src/relationship-access.ts)
- [`createRelationshipLocalKeyEnvelope(...)`](src/relationship-access.ts)

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
- [`getCommunicationFromDraft(...)`](src/communication-draft.ts)
- [`isCommunicationDraftReady(...)`](src/communication-draft.ts)
- [`addFhirResourceToDraft(...)`](src/communication-draft.ts)
- [`addClaimsResourceToDraft(...)`](src/communication-draft.ts)
- [`createOutboxJobFromDraft(...)`](src/communication-draft.ts)
- [`updateOutboxJobStatus(...)`](src/communication-draft.ts)
- [`OutboxJob`](src/communication-draft.ts)
- [`CommunicationOutboxJob`](src/communication-draft.ts)
- [`IOutboxRepository`](src/communication-outbox.ts)
- [`OutboxRepositoryMemory`](src/communication-outbox.ts)

### High-level document facade

- [`getDocumentFromCommunication(...)`](src/communication-document-facade.ts)
- [`createFhirDocumentFacade(...)`](src/communication-document-facade.ts)
- [`createCommunicationFacade()`](src/communication-document-facade.ts)

### Vital signs

- [`createHeartRateObservation(...)`](src/vital-signs.ts)
- [`createBodyTemperatureObservation(...)`](src/vital-signs.ts)
- [`createBloodPressureObservation(...)`](src/vital-signs.ts)
- [`createVitalSignsFacade(...)`](src/vital-signs.ts)

## Documentation Rule

- JSDoc on exported code is canonical.
- README should explain the business flows first.
- Runtime routing details belong in node/front runtime docs, not in this package.
