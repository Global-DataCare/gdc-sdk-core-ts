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

1. [../../gdc-sdk-node-ts/SDK_INTEGRATION_101.md](../../gdc-sdk-node-ts/SDK_INTEGRATION_101.md)
   Backend runtime initialization and real GW usage.
2. [../../gdc-sdk-front-ts/SDK_INTEGRATION_101.md](../../gdc-sdk-front-ts/SDK_INTEGRATION_101.md)
   Frontend/native runtime initialization and real app-session usage.

The most important real initialization steps are:

- backend technical identity bootstrap:
  [initializeCommunicationIdentityFromSeed(...) in gdc-sdk-node-ts/SDK_INTEGRATION_101.md](../../gdc-sdk-node-ts/SDK_INTEGRATION_101.md)
- backend runtime client creation:
  [`new NodeHttpClient(...)` in gdc-sdk-node-ts/SDK_INTEGRATION_101.md](../../gdc-sdk-node-ts/SDK_INTEGRATION_101.md)
- frontend technical identity bootstrap:
  [initializeCommunicationIdentityFromSeed(...) in gdc-sdk-front-ts/SDK_INTEGRATION_101.md](../../gdc-sdk-front-ts/SDK_INTEGRATION_101.md)
- frontend SDK creation:
  [`new ClientSDK(...)` in gdc-sdk-front-ts/SDK_INTEGRATION_101.md](../../gdc-sdk-front-ts/SDK_INTEGRATION_101.md)
- frontend session bootstrap:
  [`initializeSession(...)` in gdc-sdk-front-ts/SDK_INTEGRATION_101.md](../../gdc-sdk-front-ts/SDK_INTEGRATION_101.md)

This file is the business-flow map. Those two files are the runtime
initialization manuals.

## Reading Rule

For every step below, read in this order:

1. this flow description
2. the shared example file in `gdc-common-utils-ts`
3. the runtime integration guide for node or front
4. the helper or runtime method in `gdc-sdk-core-ts` or `gdc-sdk-node-ts`

## Shared Example Sources

- [shared.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/shared.ts:1)
  Shared route context, tenant, jurisdiction, sector, controller binding, and
  helper payload builders.
- [organization-controller.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/organization-controller.ts:1)
  Organization activation, order/offer, employee creation, employee activation.
- [individual-controller.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/individual-controller.ts:1)
  Individual bootstrap, order/offer, consent grant, ingestion, search.
- [professional.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/professional.ts:1)
  SMART access, professional roles, section access, scope examples.
- [related-person.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/related-person.ts:1)
  RelatedPerson payload baseline.
- [consent-access.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/consent-access.ts:1)
  Subject, actor, role, jurisdiction, and consent-rule examples.
- [relationship-access.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/relationship-access.ts:1)
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

- start with [../../gdc-sdk-node-ts/SDK_INTEGRATION_101.md](../../gdc-sdk-node-ts/SDK_INTEGRATION_101.md)
- first runtime class to instantiate:
  [NodeHttpClient](../../gdc-sdk-node-ts/src/node-runtime-client.ts:383)
- role-oriented facades after that:
  [OrganizationControllerSdk](../../gdc-sdk-node-ts/src/orchestration/organization-controller-sdk.ts:1),
  [IndividualControllerSdk](../../gdc-sdk-node-ts/src/orchestration/individual-controller-sdk.ts:1),
  [ProfessionalSdk](../../gdc-sdk-node-ts/src/orchestration/professional-sdk.ts:1)

If you are integrating from a web/native app:

- start with [../../gdc-sdk-front-ts/SDK_INTEGRATION_101.md](../../gdc-sdk-front-ts/SDK_INTEGRATION_101.md)
- first runtime class to instantiate:
  [ClientSDK](../../gdc-sdk-front-ts/src/ClientSDK.ts:52)
- session/profile runtime after that:
  [ProfileManager](../../gdc-sdk-front-ts/src/ProfileManager.ts:53),
  [ProfileRegistry](../../gdc-sdk-front-ts/src/ProfileRegistry.ts:8)

## 1. Organization Activation

Goal:

- create a legal organization in GW
- bind controller identity
- confirm the order/offer after activation

Open these files first:

- [organization-controller.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/organization-controller.ts:1)
- [shared.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/shared.ts:1)

Main SDK entry:

- [createBootstrapFacade(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/src/bootstrap-facade.ts:97)

Node runtime entry:

- [confirmLegalOrganizationOrderWithDeps(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-node-ts/src/host-onboarding.ts:47)

Where the data comes from:

- `vpToken`
  comes from the ICA or trust/bootstrap proof flow
- `controller`
  comes from the controller identity binding material; see `EXAMPLE_CONTROLLER_BINDING`
- additional organization claims
  come from organization registration inputs such as alternate name, legal name, tax id, and provider URL
- `offerId`
  comes from the previous accepted response of the start/activation phase

## 2. Employee Creation And Employee Activation

Goal:

- create an employee inside an organization
- issue the activation material
- let the employee activate a device/app profile

Open these files first:

- [organization-controller.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/organization-controller.ts:1)

Node runtime entries:

- [createOrganizationEmployeeWithDeps(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-node-ts/src/resource-operations.ts:134)
- [activateEmployeeDeviceWithActivationCodeWithDeps(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-node-ts/src/device-activation.ts:58)
- [activateEmployeeDeviceWithActivationRequestWithDeps(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-node-ts/src/device-activation.ts:103)

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

Open these files first:

- [individual-controller.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/individual-controller.ts:1)
- [shared.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/shared.ts:1)

Node runtime entries:

- [startIndividualOrganizationWithDeps(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-node-ts/src/individual-start.ts:105)
- [confirmIndividualOrganizationOrderWithDeps(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-node-ts/src/individual-onboarding.ts:44)

Where the data comes from:

- `alternateName`
  comes from the individual/family registration input
- `controllerEmail`
  comes from the human controller of the individual index
- `offerId`
  comes from the result of the start/bootstrap step

## 4. Permission Creation, Edit, Deactivation, And Views

Goal:

- grant access to a professional, related person, caregiver, or other actor
- later evaluate if requested access is covered
- prepare a permission-request communication if not covered

Open these files first:

- [consent-access.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/consent-access.ts:1)
- [professional.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/professional.ts:1)
- [individual-controller.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/individual-controller.ts:1)
- [CONSENT_ACCESS_101.md](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/docs/CONSENT_ACCESS_101.md:1)

Shared helpers:

- [groupConsentsForControllerView(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/src/consent-access.ts:55)
- [evaluateRequestedAccess(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/src/consent-access.ts:70)
- [getMissingPermissions(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/src/consent-access.ts:83)
- [buildPermissionRequestCommunication(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/src/consent-access.ts:102)

Node runtime helper:

- [grantProfessionalAccessWithDeps(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-node-ts/src/resource-operations.ts:310)

Where the data comes from:

- `subject`
  comes from the individual subject DID
- actor identity
  comes from the professional or related-person identity
- `actorRole`
  must use shared role constants or codings
- `purpose`
  must use shared purpose constants
- `sections`
  must use shared section descriptors from healthcare constants

## 5. Related Person / Professional Invitation And Acceptance

Goal:

- let an individual controller invite another actor
- let that actor accept the relationship
- optionally establish a relationship PIN

Open these files first:

- [relationship-access.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/relationship-access.ts:1)
- [consent-access.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/consent-access.ts:1)

Shared helpers:

- [createRelationshipChannelInvitationInput(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/src/relationship-access.ts:32)
- [createRelationshipChannelInvitationSummary(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/src/relationship-access.ts:56)
- [createRelationshipChannelOtpStartInput(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/src/relationship-access.ts:80)
- [createRelationshipChannelOtpConfirmInput(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/src/relationship-access.ts:93)
- [createRelationshipChannelOtpChallengeSummary(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/src/relationship-access.ts:106)
- [createRelationshipPinPolicy(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/src/relationship-access.ts:125)
- [createRelationshipPinSetInput(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/src/relationship-access.ts:153)
- [createRelationshipPinVerifyInput(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/src/relationship-access.ts:169)
- [createRelationshipLocalKeyEnvelope(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/src/relationship-access.ts:183)

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

- [individual-controller.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/individual-controller.ts:1)
- [shared.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/shared.ts:1)

Shared helpers:

- [createCommunicationResource(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/src/communication-resource-helpers.ts:276)
- [buildCommunicationBatchMessage(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/src/communication-resource-helpers.ts:316)
- [addFhirResourceToCommunication(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-core-ts/src/communication-resource-helpers.ts:365)

Node runtime entry:

- [ingestCommunicationAndUpdateIndexWithDeps(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-node-ts/src/resource-operations.ts:225)

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

- [professional.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/professional.ts:1)
- [consent-access.ts](/Users/fernando/GITS/gdc-workspace/gdc-common-utils-ts/src/examples/consent-access.ts:1)

Node runtime entries:

- [requestSmartTokenWithDeps(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-node-ts/src/smart-token.ts:146)
- [searchClinicalBundleWithDeps(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-node-ts/src/resource-operations.ts:262)
- [searchLatestIpsWithDeps(...) ](/Users/fernando/GITS/gdc-workspace/gdc-sdk-node-ts/src/resource-operations.ts:293)

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
