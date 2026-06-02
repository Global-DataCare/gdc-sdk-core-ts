# Consent And Communication Mutations 101

This guide defines the `sdk-core` layer around consent-carrying
`Communication` resources.

Use this together with:

- the canonical consent editing 101 in `common-utils`:
  [gdc-common-utils-ts/docs/CONSENT_ACCESS_101.md](../../gdc-common-utils-ts/docs/CONSENT_ACCESS_101.md)
- its executable test:
  [gdc-common-utils-ts/__tests__/101-consent-bundle-editor.test.ts](../../gdc-common-utils-ts/__tests__/101-consent-bundle-editor.test.ts)
- the `sdk-core` draft/outbox test:
  [tests/101-consent-bundle-outbox.test.mjs](../tests/101-consent-bundle-outbox.test.mjs)

## Goal

Keep responsibilities separate:

- `common-utils`
  edits real `Consent` claims inside a bundle with `bundleEditor + get/set/add/remove`
- `sdk-core`
  takes the resulting `Communication` and moves it through draft/outbox/runtime

This is available for:

- consent operations inside `CommunicationInput.payload.operations`
- clinical resources inside document bundles (raw `Bundle` or embedded in `Communication`)

## What Lives Where (Important)

Use this quick map to avoid mixing layers:

- Claim-level consent editing:
  lives in `gdc-common-utils-ts`
- Bundle-in-Communication editing:
  lives in `gdc-common-utils-ts` through `CommunicationBundleSession`
- Draft/outbox transport orchestration:
  lives in `gdc-sdk-core-ts`

`request.url` is transport routing metadata. It is not the lifecycle state and
is not used as the enable/disable flag.

## Start Here: Consent Bundle + Outbox

Executable references:

- [gdc-common-utils-ts/__tests__/101-consent-bundle-editor.test.ts](../../gdc-common-utils-ts/__tests__/101-consent-bundle-editor.test.ts)
- [tests/101-consent-bundle-outbox.test.mjs](../tests/101-consent-bundle-outbox.test.mjs)

If you only want to build or edit one consent, start in `common-utils` with:

- `CommunicationBundleSession`
- `getPurposes` / `setPurposes` / `addPurposes`
- `getRoles` / `setRoles` / `addRoles`
- `getSections` / `setSections` / `addSections`

Then `sdk-core` takes that `Communication` into draft/outbox:

```ts
import {
  addClaimsResourceToDraft,
  createCommunicationDraft,
  createOutboxJobFromDraft,
} from 'gdc-sdk-core-ts';
import {
  EXAMPLE_PROFESSIONAL_DID,
  EXAMPLE_SUBJECT_DID,
} from 'gdc-common-utils-ts/examples/shared';

// communicationClaims comes from common-utils bundleEditor.
const draft = addClaimsResourceToDraft(
  createCommunicationDraft({
    subject: EXAMPLE_SUBJECT_DID,
    sender: EXAMPLE_PROFESSIONAL_DID,
    claims: communicationClaims,
  }),
  'Communication',
  communicationClaims,
);

const outboxJob = createOutboxJobFromDraft(draft);
```

`sdk-core` does not redefine the consent model here. It only persists and
queues the already-built `Communication`.

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

## Advanced/Legacy Mutation Contracts

The operation-style mutation contracts remain in `sdk-core`, but they are not
the preferred 101 path for developers who just need to edit one consent inside
one bundle.

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

- `../../gdc-common-utils-ts/src/utils/consent-claim-helpers.ts`
- `../../gdc-common-utils-ts/src/utils/communication-bundle-session.ts`
- `tests/101-consent-bundle-outbox.test.mjs`
- `tests/communication-consent-mutation-contract.test.mjs`
