# Consent And Communication Mutations 101

This guide defines the uniform mutation surface for consent operations and
clinical resources carried by Communication payloads.

Use this together with the executable reference test:

- [tests/101-consent-communication-mutations.test.mjs](../tests/101-consent-communication-mutations.test.mjs)

## Goal

New SDK consumers should always find the same semantic method family:

- getConsentOperations / getCommunicationResources
- setConsentOperations / setCommunicationResources
- addConsentOperations / addCommunicationResources
- enableConsentOperations / enableCommunicationResources
- disableConsentOperations / disableCommunicationResources
- removeConsentOperations / removeCommunicationResources

This is available for:

- consent operations inside `CommunicationInput.payload.operations`
- clinical resources inside document bundles (raw `Bundle` or embedded in `Communication`)

## What Lives Where (Important)

Use this quick map to avoid mixing layers:

- Claim-level mutation (Consent claims CSV fields):
  `getPurposes`, `setPurposes`, `addPurposes` and related `get/set/add` helpers.
  These operate on `resource.meta.claims`.
- Consent operation lifecycle (operation objects in payload):
  `enableConsentOperations`, `disableConsentOperations`.
  These change `operationKind` (`add`/`enable`/`disable`...) inside
  `CommunicationInput.payload.operations`.
- Bundle resource lifecycle (actual FHIR resources):
  `enableCommunicationResources`, `disableCommunicationResources`.
  These update audit/lifecycle tags in `resource.meta.tag[]`.

`request.url` is transport routing metadata. It is not the lifecycle state and
is not used as the enable/disable flag.

## Start Here: Simple Consent Claim Helpers

Executable step-by-step reference:

- [tests/101-consent-communication-mutations.test.mjs](../tests/101-consent-communication-mutations.test.mjs)

If you only want to build or edit one consent from frontend code, start with
the claim helpers first.

Use:

- `getPurposes` / `setPurposes` / `addPurposes`
- `getRoles` / `setRoles` / `addRoles`
- `getSections` / `setSections` / `addSections`
- `getContainedDocumentIdentifierList`
- `setContainedDocumentIdentifierList`
- `addContainedDocumentIdentifierList`

Step by step:

```ts
import {
  buildConsentOperationClaims,
  buildConsentOperationsCommunicationInput,
  getPurposes,
  setPurposes,
  setRoles,
  setSections,
  type ConsentCommunicationOperationInput,
} from 'gdc-sdk-core-ts';
import {
  HealthcareActorRoles,
  HealthcareBasicSections,
  HealthcareConsentPurposes,
} from 'gdc-common-utils-ts/constants/healthcare';
import {
  EXAMPLE_COMMUNICATION_IDENTIFIER,
  EXAMPLE_CONSENT_OPERATION_IDENTIFIER,
  EXAMPLE_CONSENT_OPERATION_THREAD_ID,
  EXAMPLE_INDEX_PROVIDER_SECTOR_DID_WEB,
  EXAMPLE_PROFESSIONAL_DID,
  EXAMPLE_SUBJECT_DID,
} from 'gdc-common-utils-ts/examples/shared';

// Step 1. Frontend/runtime already knows who the subject is and
// which actor is being granted access.
const subjectDid = EXAMPLE_SUBJECT_DID;
const professionalDid = EXAMPLE_PROFESSIONAL_DID;
const requestedSections = [
  HealthcareBasicSections.HistoryOfMedicationUse.attributeValue,
  HealthcareBasicSections.Results.attributeValue,
];

// Step 2. Build/edit one consent with claim helpers.
let consentClaims = {
  '@context': 'org.hl7.fhir.api',
  'Consent.identifier': EXAMPLE_CONSENT_OPERATION_IDENTIFIER,
  'Consent.subject': subjectDid,
};

consentClaims = setPurposes(consentClaims, [HealthcareConsentPurposes.Treatment]);
consentClaims = setRoles(consentClaims, [HealthcareActorRoles.Physician]);
consentClaims = setSections(consentClaims, requestedSections);

const purposes = getPurposes(consentClaims);

// Step 3. When this must travel through Communication, build the abstract operation.
const operation: ConsentCommunicationOperationInput = {
  operationKind: 'add',
  operationId: EXAMPLE_CONSENT_OPERATION_IDENTIFIER,
  subject: subjectDid,
  purpose: HealthcareConsentPurposes.Treatment,
  target: {
    kind: 'professional',
    identifier: professionalDid,
    roles: [HealthcareActorRoles.Physician],
  },
  sections: {
    core: requestedSections,
  },
};

// Step 4. Convert the operation to canonical consent claims.
const operationClaims = buildConsentOperationClaims(operation);

// Step 5. Wrap one or more operations into the canonical CommunicationInput.
const commInput = buildConsentOperationsCommunicationInput({
  thid: EXAMPLE_CONSENT_OPERATION_THREAD_ID,
  subject: subjectDid,
  sender: professionalDid,
  recipient: EXAMPLE_INDEX_PROVIDER_SECTOR_DID_WEB,
  communicationIdentifier: EXAMPLE_COMMUNICATION_IDENTIFIER,
  operations: [operation],
});
```

This layer is only about claims.

- it does not create a `Communication`
- it does not create payload operations
- it does not enable/disable anything

That comes later, in the `Communication` mutation layer below.

Short visual map:

```mermaid
flowchart TD
  A[Communication Input] --> B[payload.operations]
  A --> C[bundle entries resource]

  B --> B1[enable/disable consent operations]
  B1 --> B2[operationKind changes]

  C --> C1[resource.meta.claims]
  C1 --> C2[get/set/add claims]

  C --> D[resource.meta.tag[]]
  D --> D1[enable/disable resource lifecycle]
  D1 --> D2[org.gdc.resource.lifecycle: enabled/disabled]

  E[request.url] -. transport routing only .-> A
```

## Why this matters

- stable FE/BE contracts
- lower onboarding cost for new developers
- no custom one-off method names per feature
- consistent filtering (`sections`, `types`, `date`, and consent-specific selectors)

## Exports

From `gdc-sdk-core-ts`:

- `ConsentOperationMutationContract`
- `CommunicationResourceMutationContract`

Supporting helpers:

- consent: `getConsentOperations`, `setConsentOperations`, `addConsentOperations`,
  `enableConsentOperations`, `disableConsentOperations`, `removeConsentOperations`
- resources: `getResources`, `setResources`, `addResources`, `removeResources`,
  `enableCommunicationResources`, `disableCommunicationResources`

Compatibility aliases:

- `getX`, `setX`, `addX`, `enableX`, `disableX`, `removeX`
- kept only for backward compatibility with existing callers

## Consent operation filters

`ConsentCommunicationOperationFilter` supports optional selectors:

- `operationIds`
- `operationKinds`
- `targetKinds`
- `sections`
- `purposes`
- `types` (uniform contract support; use `Consent`)
- `date` (`start`/`end`)

## Resource filters

Resource mutation methods use `BundleResourceFilter`:

- `sections`
- `types`
- `date` (`start`/`end`)

## Lifecycle tagging for resources

`enableCommunicationResources` and `disableCommunicationResources` do not delete data.

They update resource `meta.tag` with:

- system: `org.gdc.resource.lifecycle`
- code: `enabled` or `disabled`

This is intentionally separate from `resource.meta.claims`:

- `meta.claims`: business/interoperable claim data
- `meta.tag[]`: lifecycle/audit classification for the resource

## Example: consent operations

```ts
import {
  ConsentOperationMutationContract,
  ConsentCommunicationOperationKinds,
} from 'gdc-sdk-core-ts';

const selected = ConsentOperationMutationContract.getX(commInput, {
  sections: ['LOINC|48765-2'],
});

const next = ConsentOperationMutationContract.disableConsentOperations(commInput, {
  operationKinds: [ConsentCommunicationOperationKinds.Add],
});

const cleaned = ConsentOperationMutationContract.removeConsentOperations(next, {
  targetKinds: ['organization'],
});
```

## Example: communication resources

```ts
import {
  CommunicationResourceMutationContract,
} from 'gdc-sdk-core-ts';

const current = CommunicationResourceMutationContract.getCommunicationResources(bundleOrCommunication, {
  sections: ['LOINC|8716-3'],
});

const disabled = CommunicationResourceMutationContract.disableCommunicationResources(bundleOrCommunication, {
  types: ['Observation'],
});

const replaced = CommunicationResourceMutationContract.setCommunicationResources(
  disabled,
  { types: ['Observation'] },
  [newObservation],
  { sections: ['LOINC|8716-3'] },
);
```

## Cross-package alignment

Role and section catalogs should come from `gdc-common-utils-ts` constants,
not from inline literals.

Recommended references:

- `HealthcareRolesBySector` and role i18n maps
- `HealthcareSectionsByFamily` and section i18n maps
- consent claim helpers (`set/get/add`) for canonical claim keys

From `gdc-sdk-core-ts`, these helpers are re-exported via:

- `src/consent-claim-helpers.ts`

## Source of truth

- `src/communication-consent-mutation-contract.ts`
- `src/communication-bundle-resources.ts`
- `src/consent-communication-operations.ts`
- `tests/101-consent-communication-mutations.test.mjs`
- `tests/communication-consent-mutation-contract.test.mjs`
