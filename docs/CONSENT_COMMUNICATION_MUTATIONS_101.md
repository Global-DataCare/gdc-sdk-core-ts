# Consent And Communication Mutations 101

This guide defines the uniform mutation surface for consent operations and
clinical resources carried by Communication payloads.

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

## Quickstart: create one consent operation (copy/paste)

Use this when a developer asks: "how do I build one consent in a Communication
using setPurposes, actorRoles, and sections?"

```ts
import {
  buildConsentOperationClaims,
  buildConsentOperationsCommunicationInput,
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

const subjectDid = 'did:web:patient.example.com:individual:123';
const professionalDid = 'did:web:clinic.example.com:professional:abc';

const operation: ConsentCommunicationOperationInput = {
  operationKind: 'add',
  operationId: 'consent-op-001',
  subject: subjectDid,
  purpose: HealthcareConsentPurposes.Treatment,
  target: {
    kind: 'professional',
    identifier: professionalDid,
    roles: [HealthcareActorRoles.Physician],
  },
  sections: {
    core: [
      HealthcareBasicSections.HistoryOfMedicationUse.claim,
      HealthcareBasicSections.Results.claim,
    ],
  },
};

// Optional: patch/normalize claims explicitly with set* helpers.
let claims = buildConsentOperationClaims(operation);
claims = setPurposes(claims, [HealthcareConsentPurposes.Treatment]);
claims = setRoles(claims, [HealthcareActorRoles.Physician]);
claims = setSections(claims, [
  HealthcareBasicSections.HistoryOfMedicationUse.claim,
  HealthcareBasicSections.Results.claim,
]);

// Build canonical CommunicationInput for transport.
const commInput = buildConsentOperationsCommunicationInput({
  thid: 'thread-001',
  subject: subjectDid,
  sender: 'did:web:controller.example.com:org:main',
  recipient: 'did:web:gateway.example.com:core',
  operations: [operation],
  summaryText: 'Grant treatment access for physician to medication/results sections',
});

// commInput.payload.operations[0] carries operationKind/target/sections
// claims carries canonical CSV claims fields (purpose, actorRole, action, ...)
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
- `tests/communication-consent-mutation-contract.test.mjs`
