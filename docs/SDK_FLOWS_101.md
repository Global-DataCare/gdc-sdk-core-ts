# SDK Flows 101

This guide explains the main GW/GDC flows through SDK usage, step by step, with
links to the shared example files that define the actual payload data.

Use this when you are new to the SDK family and need to answer:

- which flow starts first
- which function/method/class is used at each step
- what data each call needs
- where that data comes from
- which shared example file to open to see the exact shape

## Before Anything Else: Where Initialization Really Lives

If what you need first is:

- how the backend SDK is initialized
- how the frontend/native SDK is initialized
- which constructor or class is used first
- what concrete arguments are passed

open these files before reading the rest of this document:

1. [gdc-sdk-node-ts/docs/SDK_END_TO_END_101.md](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/docs/SDK_END_TO_END_101.md)
   Ordered Node backend onboarding with end-to-end flows and copy/paste
   examples.
2. [gdc-sdk-node-ts/docs/SDK_INTEGRATION_101.md](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/docs/SDK_INTEGRATION_101.md)
   Backend runtime initialization and real GW usage.
3. [gdc-sdk-front-ts/docs/SDK_INTEGRATION_101.md](https://github.com/Global-DataCare/gdc-sdk-front-ts/blob/main/docs/SDK_INTEGRATION_101.md)
   Frontend/native runtime initialization and real app-session usage.

The most important real initialization steps are:

- backend technical identity bootstrap:
  [initializeCommunicationIdentity(...) in gdc-sdk-node-ts/docs/SDK_INTEGRATION_101.md](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/docs/SDK_INTEGRATION_101.md)
- backend runtime client creation:
  [`new NodeHttpClient(...)` in gdc-sdk-node-ts/docs/SDK_INTEGRATION_101.md](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/docs/SDK_INTEGRATION_101.md)
- frontend technical identity bootstrap:
  [initializeCommunicationIdentity(...) in gdc-sdk-front-ts/docs/SDK_INTEGRATION_101.md](https://github.com/Global-DataCare/gdc-sdk-front-ts/blob/main/docs/SDK_INTEGRATION_101.md)
- frontend SDK creation:
  [`new ClientSDK(...)` in gdc-sdk-front-ts/docs/SDK_INTEGRATION_101.md](https://github.com/Global-DataCare/gdc-sdk-front-ts/blob/main/docs/SDK_INTEGRATION_101.md)
- frontend session bootstrap:
  [`initializeSession(...)` in gdc-sdk-front-ts/docs/SDK_INTEGRATION_101.md](https://github.com/Global-DataCare/gdc-sdk-front-ts/blob/main/docs/SDK_INTEGRATION_101.md)

This file is the business-flow map. Those two files are the runtime
initialization manuals.

Initialization split to keep explicit:

- `appId` / `appVersion`
  identify the integrating app towards GW CORE
- technical communication profile id
  identifies the local device/channel/runtime that owns transport keys
- actor DIDs
  identify human/domain actors

## Documentation And SDK Usage Rules

These rules are mandatory for new docs, examples, tests, and AI-generated code.

### 1. Start from semantic variables, not wire payloads

Teach integrations from variables the caller already understands, for example:

- `subjectDid`
- `professionalDid`
- `orgControllerDid`
- `individualControllerDid`
- `emailProfessional`
- `emailControllerOrg`
- `emailControllerIndividual`
- `emailRelatedPerson`
- `vpToken`
- `controllerSameAs`
- `publicSignKey`
- `publicKeys`

Only after that should docs show:

- builder/helper
- SDK method
- runtime request

Never start a `101` by teaching raw GW request bodies.

### 2. Prefer builders/helpers over hand-shaped nested objects

If a value can be built by a helper, show the helper:

- `buildControllerBindingInput(...)`
- `buildOrganizationActivationRequest(...)`
- `buildIndividualDidWeb(...)`
- `createRelationshipChannelInvitationInput(...)`

Do not teach callers to hand-shape:

- `controller.publicKeyJwk`
- `controller.jwks`
- nested `body.data[0].resource.meta.claims`

unless the document is explicitly a low-level wire-format reference.

### 2.1 Activation capability naming

Use these names consistently:

- SDK builder API: `serviceCapabilities`
- persisted activation claim: `org.schema.Service.serviceType`
- frontend UX/profile layer: `facets`

Do not mix them.

`serviceCapabilities` is the typed SDK input used while preparing `_activate`.
It is serialized into the persisted claim `org.schema.Service.serviceType`.
Frontend facets are a separate UI/runtime interpretation layer and must not be
taught as if they were the persisted activation contract.

Legal-organization onboarding rule:

- every onboarding example must include service capabilities
- those capabilities are mandatory business input for `_activate`
- do not teach legal-organization activation as if capabilities were optional

### 3. Use canonical names

Canonical subject and actor naming in docs/examples:

- subject DID: `subjectDid`
- professional DID: `professionalDid`
- organization controller DID: `orgControllerDid`
- individual controller DID: `individualControllerDid`
- professional email: `emailProfessional`
- organization controller email: `emailControllerOrg`
- individual controller email: `emailControllerIndividual`
- related person email: `emailRelatedPerson`

Legacy aliases may remain in code only for compatibility. They should not be
the names used to teach new integrations.

### 4. Do not hardcode semantic enums inline when shared constants exist

Prefer shared constants/types such as:

- `HealthcareActorRoles`
- `HealthcareConsentPurposes`
- `RelationshipAccessActorKinds`
- `RelationshipEnrollmentChannels`
- `RelationshipSubjectKinds`
- `RelationshipOtpDeliveryChannels`

Avoid new examples that start from raw literals such as:

- `'professional'`
- `'related-person'`
- `'phone'`
- `'email'`
- `'TREAT'`
- `'CARE'`

unless the snippet is documenting the literal contract itself.

### 5. Do not hand-invent a subject DID

Use `buildIndividualDidWeb(...)` when the caller has:

- provider organization DID
- local subject identifier

Do not document arbitrary manually concatenated `did:web` strings as the
recommended path.

### 6. Separate business flow from runtime shape

The `101` should explain:

1. what the user is trying to do
2. which variables they already have
3. which helper normalizes them
4. which SDK method executes the flow
5. what identifier/result comes back for the next step

The raw request/response body shape is secondary reference material.

### 7. Explain where each variable comes from

Every major step should state the origin of its inputs:

- form field
- directory entry
- previous SDK call result
- GW route context
- identity bootstrap output
- ICA proof / token exchange output

If the reader cannot tell where a value comes from, the example is incomplete.

### 8. Tests and examples are reference sources, not the first teaching layer

Shared examples and tests are important, but the primary `101` narrative must
still explain:

- why a variable exists
- how it is obtained
- why a helper is used

Do not replace explanation with fixture imports alone.

## Reading Rule

For every step below, read in this order:

1. this flow description
2. the shared example file in `gdc-common-utils-ts`
3. the runtime integration guide for node or front
4. the helper or runtime method in `gdc-sdk-core-ts` or `gdc-sdk-node-ts`

## Shared Example Sources

- [shared.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/shared.ts)
  Shared route context, tenant, jurisdiction, sector, controller binding, and
  helper payload builders.
- [organization-controller.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/organization-controller.ts)
  Organization activation, order/offer, employee creation, employee activation.
- [individual-controller.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/individual-controller.ts)
  Individual bootstrap, order/offer, consent grant, ingestion, search.
- [professional.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/professional.ts)
  SMART access, professional roles, section access, scope examples.
- [related-person.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/related-person.ts)
  RelatedPerson payload baseline.
- [consent-access.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/consent-access.ts)
  Subject, actor, role, jurisdiction, and consent-rule examples.
- [relationship-access.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/relationship-access.ts)
  Invitation, OTP, relationship PIN, and local-key-envelope examples.

## Actor Families

The flows are different depending on the actor family:

- organization controller
- organization employee / professional member
- individual controller
- individual member / self
- related person
- professional with consented access

## Runtime Entry Points By Consumer

If you are integrating from a backend:

- start with [gdc-sdk-node-ts/docs/SDK_INTEGRATION_101.md](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/docs/SDK_INTEGRATION_101.md)
- first runtime class to instantiate:
  [NodeHttpClient](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/src/node-runtime-client.ts)
- role-oriented facades after that:
  [OrganizationControllerSdk](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/src/orchestration/organization-controller-sdk.ts),
  [IndividualControllerSdk](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/src/orchestration/individual-controller-sdk.ts),
  [ProfessionalSdk](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/src/orchestration/professional-sdk.ts)

If you are integrating from a web/native app:

- start with [gdc-sdk-front-ts/docs/SDK_INTEGRATION_101.md](https://github.com/Global-DataCare/gdc-sdk-front-ts/blob/main/docs/SDK_INTEGRATION_101.md)
- first runtime class to instantiate:
  [ClientSDK](https://github.com/Global-DataCare/gdc-sdk-front-ts/blob/main/src/ClientSDK.ts)
- session/profile runtime after that:
  [ProfileManager](https://github.com/Global-DataCare/gdc-sdk-front-ts/blob/main/src/ProfileManager.ts),
  [ProfileRegistry](https://github.com/Global-DataCare/gdc-sdk-front-ts/blob/main/src/ProfileRegistry.ts)

## 1. Organization Activation

Goal:

- create a legal organization in GW
- bind controller identity
- confirm the order/offer after activation

Open these files first:

- [organization-controller.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/organization-controller.ts)
- [shared.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/shared.ts)
- [activation-request.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/utils/activation-request.ts)

Main SDK entry:

- [createBootstrapFacade(...) ](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/src/bootstrap-facade.ts)

Node runtime entry:

- [confirmLegalOrganizationOrderWithDeps(...) ](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/src/host-onboarding.ts)

Where the data comes from:

- `vpToken`
  comes from the ICA or trust/bootstrap proof flow
- `orgControllerDid`
  comes from the public controller/person DID
- `controllerSameAs`
  comes from the public alias, commonly a `mailto:`
- `publicSignKey`
  comes from the controller signing key you want GW to publish or bind
- `publicKeys`
  comes from the auxiliary public keys, typically DidComm encryption keys
- `controllerBinding`
  should be built with `buildControllerBindingInput(...)`, not hand-shaped as
  `controller.publicKeyJwk` / `controller.jwks`
- `organizationActivation`
  is the recommended local builder/result variable name in examples
- additional organization claims
  come from organization registration inputs such as alternate name, legal name, tax id, and provider URL
- `offerId`
  comes from the previous accepted response of the start/activation phase

Common mistakes to avoid:

- teaching `controller.publicKeyJwk` as if it were the caller's starting point
- inlining a full `_activate` body in app code
- mixing controller-person keys with technical DCR/device keys

## 2. Employee Creation And Employee Activation

Goal:

- create an employee inside an organization
- issue the activation material
- let the employee activate a device/app profile

Open these files first:

- [organization-controller.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/organization-controller.ts)

Node runtime entries:

- [createOrganizationEmployeeWithDeps(...) ](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/src/resource-operations.ts)
- [activateEmployeeDeviceWithActivationCodeWithDeps(...) ](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/src/device-activation.ts)
- [activateEmployeeDeviceWithActivationRequestWithDeps(...) ](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/src/device-activation.ts)

Where the data comes from:

- employee claims
  come from HR/admin data and role coding
- activation code
  comes from the previous employee invitation/issuance step
- `idToken`
  comes from the authenticated employee identity flow
- `dcrPayload`
  comes from the device/app registration request

## 3. Individual Organization Bootstrap

Goal:

- create an individual/family subject organization
- confirm the order/offer

Important semantic and runtime split:

- this is not legal-organization activation
- it does not use `_activate`
- today the runtime shape is:
  1. start individual/family registration through tenant `_batch`
  2. poll until accepted response includes `offerId`
  3. confirm the returned order through tenant `_batch`

Open these files first:

- [individual-controller.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/individual-controller.ts)
- [shared.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/shared.ts)

Node runtime entries:

- [startIndividualOrganizationWithDeps(...) ](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/src/individual-start.ts)
- [confirmIndividualOrganizationOrderWithDeps(...) ](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/src/individual-onboarding.ts)

Where the data comes from:

- `alternateName`
  comes from the individual/family registration input
- `controllerEmail`
  comes from the human controller of the individual index
- `offerId`
  comes from the result of the start/bootstrap step

Common mistakes to avoid:

- describing this flow as `individual _activate`
- documenting host-scoped activation semantics for individual bootstrap
- inventing the subject DID by hand instead of treating it as an output of the hosted provider lineage

## 4. Permission Creation, Edit, Deactivation, And Views

Goal:

- grant access to a professional, related person, caregiver, or other actor
- later evaluate if requested access is covered
- prepare a permission-request communication if not covered

Open these files first:

- [consent-access.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/consent-access.ts)
- [professional.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/professional.ts)
- [individual-controller.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/individual-controller.ts)
- [CONSENT_ACCESS_101.md](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/CONSENT_ACCESS_101.md)

Shared helpers:

- [groupConsentsForControllerView(...) ](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/src/consent-access.ts)
- [evaluateRequestedAccess(...) ](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/src/consent-access.ts)
- [getMissingPermissions(...) ](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/src/consent-access.ts)
- [buildPermissionRequestCommunication(...) ](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/src/consent-access.ts)

Node runtime helper:

- [grantProfessionalAccessWithDeps(...) ](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/src/resource-operations.ts)

Where the data comes from:

- `subjectDid`
  comes from the individual subject DID
- actor identity
  comes from the professional or related-person identity
- `actorRole`
  must use shared role constants or codings
- `purpose`
  must use shared purpose constants
- `sections`
  must use shared section descriptors from healthcare constants

Common mistakes to avoid:

- using legacy aliases like `EXAMPLE_CONSENT_ACCESS_SUBJECT` as the teaching name
- hardcoding raw purpose/role/channel literals when shared constants already exist

## 5. Related Person / Professional Invitation And Acceptance

Goal:

- let an individual controller invite another actor
- let that actor accept the relationship
- optionally establish a relationship PIN

Open these files first:

- [relationship-access.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/relationship-access.ts)
- [consent-access.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/consent-access.ts)

Shared helpers:

- [createRelationshipChannelInvitationInput(...) ](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/src/relationship-access.ts)
- [createRelationshipChannelInvitationSummary(...) ](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/src/relationship-access.ts)
- [createRelationshipChannelOtpStartInput(...) ](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/src/relationship-access.ts)
- [createRelationshipChannelOtpConfirmInput(...) ](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/src/relationship-access.ts)
- [createRelationshipChannelOtpChallengeSummary(...) ](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/src/relationship-access.ts)
- [createRelationshipPinPolicy(...) ](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/src/relationship-access.ts)
- [createRelationshipPinSetInput(...) ](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/src/relationship-access.ts)
- [createRelationshipPinVerifyInput(...) ](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/src/relationship-access.ts)
- [createRelationshipLocalKeyEnvelope(...) ](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/src/relationship-access.ts)

Where the data comes from:

- `tenantId`, `jurisdiction`, `sector`
  come from the selected tenant/runtime context
- `subjectId`
  comes from the individual subject identity
- `actorKind`
  comes from the invited actor family
- `actorIdentifier`
  comes from the invited actor identity
- `deliveryChannel` and `deliveryTarget`
  come from the chosen contact channel
- `purpose`
  must use shared purpose constants

## 6. Import Documents Into The Subject Index

Goal:

- let a controller, professional, or other allowed actor write into the subject index
- ingest a canonical `Communication` carrying clinical content

Open these files first:

- [individual-controller.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/individual-controller.ts)
- [shared.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/shared.ts)

Shared helpers:

- [createCommunicationResource(...) ](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/src/communication-resource-helpers.ts)
- [buildCommunicationBatchMessage(...) ](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/src/communication-resource-helpers.ts)
- [addFhirResourceToCommunication(...) ](https://github.com/Global-DataCare/gdc-sdk-core-ts/blob/main/src/communication-resource-helpers.ts)

Node runtime entry:

- [ingestCommunicationAndUpdateIndexWithDeps(...) ](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/src/resource-operations.ts)

Where the data comes from:

- `subject`
  comes from the target subject DID
- communication payload
  comes from the document or resource to import
- write permission
  must already be granted and evaluated before runtime execution

## 7. Clinical Search And SMART Access

Goal:

- let a professional or other authorized actor retrieve subject data

Open these files first:

- [professional.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/professional.ts)
- [consent-access.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/src/examples/consent-access.ts)

Node runtime entries:

- [requestSmartTokenWithDeps(...) ](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/src/smart-token.ts)
- [searchClinicalBundleWithDeps(...) ](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/src/resource-operations.ts)
- [searchLatestIpsWithDeps(...) ](https://github.com/Global-DataCare/gdc-sdk-node-ts/blob/main/src/resource-operations.ts)

Where the data comes from:

- `actorDid`
  comes from the active actor identity
- `subjectDid`
  comes from the target subject
- `scopes`
  must be built from shared section/resource examples, not handwritten strings

## Important Rule

Examples in docs should not invent ad-hoc strings when the shared examples or
shared typed constants already exist.

That means:

- use shared role constants
- use shared purpose constants
- use shared section descriptors
- use shared example files for actor ids, subject ids, route context, and flow payloads
