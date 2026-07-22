# Consent Communication 101

> Compatibility note: this consent-specific tutorial still exercises the
> legacy FHIR-first draft adapter. New clinical document/IPS writes use the
> claims-first `CommMsgExtended` flow in
> [COMMUNICATION_INGESTION_LAYERS.md](./COMMUNICATION_INGESTION_LAYERS.md).

> 101 note
> - Teach here: the highest-level runtime-neutral `sdk-core` surface for this topic.
> - Do not present concrete wallet/profile transport or submit/poll runtime as the main path here.
> - Read [101-README.md](./101-README.md) for the ordered path, then continue upward into `gdc-sdk-node-ts` or `gdc-sdk-front-ts`.


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
  edits one permission `Bundle` containing one or several `Consent` resources
- `sdk-core`
  attaches that completed Bundle to a claims-first `Communication` draft and
  freezes one transport-neutral outbox job

If a developer only needs to edit one consent, they should stop at
`common-utils`.

If they then need to queue and send that `Communication`, this is the next
layer.

## Step 1. Consent Editing In `common-utils`

Before the `sdk-core` draft/outbox step, the permission `Bundle` is edited at
the higher level in `gdc-common-utils-ts`.

Minimal example:

```ts
import {
  BundleEditableResourceTypes,
  BundleEditor,
  BundleOperations,
  BundleTypes,
} from 'gdc-common-utils-ts';
import { EXAMPLE_CONSENT_IDENTIFIER, EXAMPLE_SUBJECT_DID }
  from 'gdc-common-utils-ts/examples/shared';
import {
  HealthcareBasicSections,
  HealthcareConsentPurposes,
} from 'gdc-common-utils-ts/constants/healthcare';
import { ConsentDecisions } from 'gdc-common-utils-ts/models/consent-rule';

const permissionBundleEditor = new BundleEditor()
  .setBundleOperation(BundleOperations.create)
  .setBundleType(BundleTypes.batch)
  .setAllowedResourceType(BundleEditableResourceTypes.consent);

permissionBundleEditor
  .newEntryAs(BundleEditableResourceTypes.consent)
  .setIdentifier(EXAMPLE_CONSENT_IDENTIFIER)
  .setSubject(EXAMPLE_SUBJECT_DID)
  .setDecision(ConsentDecisions.Permit)
  .setPurposeList([HealthcareConsentPurposes.Treatment])
  .setSectionList([
    HealthcareBasicSections.HistoryOfMedicationUse.attributeValue,
  ])
  .doneEntry();

const permissionBundle = permissionBundleEditor.buildJsonApi();
```

What a new developer should understand at this step:

- `common-utils` owns the high-level consent editing surface
- the developer edits consent meaning, not transport/runtime details
- the result of this step is one `permissionBundle`
- that complete Bundle is what `sdk-core` attaches to a Communication draft
  and freezes into an outbox next

If you want the executable source for this editing step, open:

- [101-consent-bundle-editor.test.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/__tests__/101-consent-bundle-editor.test.ts)

`ConsentAccessEditor` remains useful when a returned permission Bundle must be
projected into classified UI ViewModels. Its claim-level methods are an
advanced editing escape hatch, not the initial authoring path.

## Step 2. Draft And Outbox In `sdk-core`

Executable references:

- [101-consent-bundle-editor.test.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/__tests__/101-consent-bundle-editor.test.ts)
- [101-consent-bundle-outbox.test.mjs](../tests/101-consent-bundle-outbox.test.mjs)

```ts
import {
  attachBundleToCommMsgExtendedDraft,
  createCommMsgExtendedDraft,
  createCommunicationOutboxJobFromCommMsgExtendedDraft,
} from 'gdc-sdk-core-ts';
import {
  EXAMPLE_PROFESSIONAL_DID,
  EXAMPLE_SUBJECT_DID,
  EXAMPLE_TENANT_SERVICE_DID,
} from 'gdc-common-utils-ts/examples/shared';

// Step 1.
// permissionBundle already comes from common-utils BundleEditor.
let draft = createCommMsgExtendedDraft({
  subject: EXAMPLE_SUBJECT_DID,
  sender: EXAMPLE_PROFESSIONAL_DID,
  recipient: EXAMPLE_TENANT_SERVICE_DID,
});
draft = attachBundleToCommMsgExtendedDraft(draft, permissionBundle);

// Step 2.
// sdk-core freezes that draft into the outbox job that runtime layers will send.
const outboxJob = createCommunicationOutboxJobFromCommMsgExtendedDraft(draft);
```

`outboxJob` is the main result developers should care about in this 101.

`sdk-core` does not reinterpret the Consent entries here. It preserves the
completed Bundle as one Communication attachment and queues that intent.

## Mental Model

- `Bundle`
  is the editable unit and may contain one or several Consent resources
- `Communication`
  is the auditable delivery message created after Bundle editing ends
- `CommMsgExtended.body.data[].resource.meta.claims`
  is the canonical transport-neutral Communication contract
- `draft`
  is the local staged object
- `outboxJob`
  is the queued unit that runtime layers will actually send

## Advanced Legacy APIs

`sdk-core` and common-utils still contain mutation/upsert compatibility helpers.
They are not the preferred 101 path for developers who only need:

- typed `BundleEditor` entries
- `attachBundleToCommMsgExtendedDraft(...)`
- `createCommunicationOutboxJobFromCommMsgExtendedDraft(...)`

Use the simpler flow first.
- `tests/communication-consent-mutation-contract.test.mjs`
