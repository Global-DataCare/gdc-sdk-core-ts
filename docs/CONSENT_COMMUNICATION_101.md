# Consent Communication 101

This guide is only about the `sdk-core` step that comes after consent editing.

Use this together with:

- the canonical consent editing 101 in `common-utils`:
  [CONSENT_ACCESS_101.md](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/CONSENT_ACCESS_101.md)
- its executable test:
  [101-consent-bundle-editor.test.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/__tests__/101-consent-bundle-editor.test.ts)
- the `sdk-core` flat-claim facade 101:
  [RESOURCE_CLAIMS_101.md](./RESOURCE_CLAIMS_101.md)
- the `sdk-core` outbox test:
  [101-consent-bundle-outbox.test.mjs](../tests/101-consent-bundle-outbox.test.mjs)

## What This 101 Covers

Keep the split simple:

- `common-utils`
  builds or edits the real `Consent` resources inside the bundle carried by a
  `Communication`
- `sdk-core`
  takes that already-built `Communication` and turns it into a draft and then
  into an outbox job

If a developer only needs to edit one consent, they should stop at
`common-utils`.

If they then need to queue and send that `Communication`, this is the next
layer.

## Step By Step

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
- attached `Bundle`
  carries the real `Consent` resources
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
