# Consent And Communication Mutations 101

This guide defines the uniform mutation surface for consent operations and
clinical resources carried by Communication payloads.

## Goal

New SDK consumers should always find the same method family:

- getX
- setX
- addX
- enableX
- disableX
- removeX

This is available for:

- consent operations inside `CommunicationInput.payload.operations`
- clinical resources inside document bundles (raw `Bundle` or embedded in `Communication`)

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

`enableX` and `disableX` for resources do not delete data.

They update resource `meta.tag` with:

- system: `org.gdc.resource.lifecycle`
- code: `enabled` or `disabled`

## Example: consent operations

```ts
import {
  ConsentOperationMutationContract,
  ConsentCommunicationOperationKinds,
} from 'gdc-sdk-core-ts';

const selected = ConsentOperationMutationContract.getX(commInput, {
  sections: ['LOINC|48765-2'],
});

const next = ConsentOperationMutationContract.disableX(commInput, {
  operationKinds: [ConsentCommunicationOperationKinds.Add],
});

const cleaned = ConsentOperationMutationContract.removeX(next, {
  targetKinds: ['organization'],
});
```

## Example: communication resources

```ts
import {
  CommunicationResourceMutationContract,
} from 'gdc-sdk-core-ts';

const current = CommunicationResourceMutationContract.getX(bundleOrCommunication, {
  sections: ['LOINC|8716-3'],
});

const disabled = CommunicationResourceMutationContract.disableX(bundleOrCommunication, {
  types: ['Observation'],
});

const replaced = CommunicationResourceMutationContract.setX(
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

## Source of truth

- `src/communication-consent-mutation-contract.ts`
- `src/communication-bundle-resources.ts`
- `src/consent-communication-operations.ts`
- `tests/communication-consent-mutation-contract.test.mjs`
