# Consent Communication 101

This guide is only about the `sdk-core` step that comes after consent editing.

Teaching rule for this `101`:

- start from the highest-level object the developer should hold
- explain one concern at a time
- leave lower-level claim/container details for the second half
- do not start from raw wire payloads

Use this together with:

- the canonical communication layering 101 in `common-utils`:
  [101-COMMUNICATION_LAYERING.md](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/101-COMMUNICATION_LAYERING.md)
- the canonical consent editing 101 in `common-utils`:
  [101-CONSENT_ACCESS.md](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/101-CONSENT_ACCESS.md)
- its executable test:
  [101-consent-bundle-editor.test.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/__tests__/101-consent-bundle-editor.test.ts)
- the `sdk-core` flat-claim facade 101:
  [101-RESOURCE_CLAIMS.md](./101-RESOURCE_CLAIMS.md)
- the `sdk-core` outbox test:
  [101-consent-bundle-outbox.test.mjs](../tests/101-consent-bundle-outbox.test.mjs)

## What This 101 Covers

Keep the split simple:

- `common-utils`
  builds the canonical claims model for the consent communication, including
  the consent payload carried semantically inside `resource.meta.claims`
- `sdk-core`
  takes that already-built `Communication` and turns it into a draft and then
  into an outbox job

If a developer only needs to edit one consent, they should stop at
`common-utils`.

If they then need to queue and send that `Communication`, this is the next
layer.

## Step 1. Consent Editing In `common-utils`

Before the `sdk-core` draft/outbox step, the consent `Communication` is edited
at the higher level in `gdc-common-utils-ts`.

Minimal example:

```ts
import { bundleEditor } from 'gdc-common-utils-ts';
import {
  EXAMPLE_PROFESSIONAL_DID,
  EXAMPLE_SUBJECT_DID,
} from 'gdc-common-utils-ts/examples/shared';
import {
  HealthcareBasicSections,
  HealthcareConsentPurposes,
} from 'gdc-common-utils-ts';

const communicationClaims = bundleEditor
  .newConsentAccessBundleEditor({
    subjectDid: EXAMPLE_SUBJECT_DID,
    actorDid: EXAMPLE_PROFESSIONAL_DID,
  })
  .setPurposeList([HealthcareConsentPurposes.Treatment])
  .setSectionList([HealthcareBasicSections.HistoryOfMedicationUse.attributeValue])
  .toCommunicationClaims();
```

What a new developer should understand at this step:

- `common-utils` owns the high-level consent editing surface
- the developer edits consent meaning, not transport/runtime details
- the result of this step is `communicationClaims`
- that result is what `sdk-core` stages into draft/outbox next

If you want the executable source for this editing step, open:

- [101-consent-bundle-editor.test.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/__tests__/101-consent-bundle-editor.test.ts)

## Step 2. Draft And Outbox In `sdk-core`

Executable references:

- [101-consent-bundle-editor.test.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/__tests__/101-consent-bundle-editor.test.ts)
- [101-consent-bundle-outbox.test.mjs](../tests/101-consent-bundle-outbox.test.mjs)

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

// Step 1.
// communicationClaims already comes from common-utils bundleEditor.
const draft = addClaimsResourceToDraft(
  createCommunicationDraft({
    subject: EXAMPLE_SUBJECT_DID,
    sender: EXAMPLE_PROFESSIONAL_DID,
    claims: communicationClaims,
  }),
  'Communication',
  communicationClaims,
);

// Step 2.
// sdk-core freezes that draft into the outbox job that runtime layers will send.
const outboxJob = createOutboxJobFromDraft(draft);
```

`outboxJob` is the main result developers should care about in this 101.

`sdk-core` does not redefine the consent model here. It only preserves the
already-authored `Communication` and queues it for transport.

## Mental Model

- `Communication`
  is the auditable envelope
- `resource.meta.claims`
  is the canonical semantic contract
- `Communication.contentdata`
  is the canonical claim for embedded payload data when the communication
  carries the consent artifact
- versioned FHIR attachment fields
  are optional projection or compatibility shapes; backend normalization can
  extract claims from them
- `draft`
  is the local staged object
- `outboxJob`
  is the queued unit that runtime layers will actually send

## Advanced Legacy APIs

`sdk-core` still contains older mutation-style helpers for consent operations
and communication resources. They are not the preferred 101 path for developers
who only need:

- `bundleEditor`
- consent claim setters/getters
- `createCommunicationDraft(...)`
- `createOutboxJobFromDraft(...)`

Use the simpler flow first.
- `tests/communication-consent-mutation-contract.test.mjs`
