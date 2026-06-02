# IPS Communication Outbox 101

This guide covers only the `sdk-core` layer for IPS requests.

Use this together with the canonical IPS 101 in `common-utils`:

- [IPS_BUNDLE_101.md](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/IPS_BUNDLE_101.md)
- [101-communication-search-reference.test.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/__tests__/101-communication-search-reference.test.ts)

## What Lives Where

- `common-utils`
  builds the IPS request `Communication` claims
- `sdk-core`
  stages that `Communication` in a draft and turns it into an outbox job

The canonical IPS request shape still lives in `common-utils` because that is
where these pieces already live:

- `Communication.content-reference`
- `createSummaryOperationRequestParameters(...)`
- `createSummaryOperationRequestReferencePath(...)`
- `communication.newIpsSummarySearchCommunication(...)`

## Step By Step

Executable reference:

- [communication-ips-search-outbox-101.test.mjs](../tests/communication-ips-search-outbox-101.test.mjs)

```ts
import {
  addClaimsResourceToDraft,
  createCommunicationDraft,
  createOutboxJobFromDraft,
} from 'gdc-sdk-core-ts';
import {
  communication,
} from 'gdc-common-utils-ts/utils/communication-bundle-document-request';
import {
  EXAMPLE_INDEX_PROVIDER_SECTOR_DID_WEB,
  EXAMPLE_PROFESSIONAL_DID,
  EXAMPLE_SUBJECT_DID,
} from 'gdc-common-utils-ts/examples/shared';

// Step 1.
// common-utils builds the IPS request Communication.
const communicationClaims = communication.newIpsSummarySearchCommunication({
  subjectId: EXAMPLE_SUBJECT_DID,
  requesterId: EXAMPLE_PROFESSIONAL_DID,
});

// Step 2.
// sdk-core stages it into a draft.
const draft = addClaimsResourceToDraft(
  createCommunicationDraft({
    subject: EXAMPLE_SUBJECT_DID,
    sender: EXAMPLE_PROFESSIONAL_DID,
    recipient: EXAMPLE_INDEX_PROVIDER_SECTOR_DID_WEB,
  }),
  'Communication',
  communicationClaims,
);

// Step 3.
// sdk-core freezes that draft into the outbox job used by runtime layers.
const outboxJob = createOutboxJobFromDraft(draft);
```

`outboxJob` is the main result developers should care about in this 101.

## Mental Model

- `Communication.content-reference`
  says what IPS document to request from the index
- `draft`
  is the local staged unit
- `outboxJob`
  is the queued unit that runtime layers will send

If developers need to understand:

- how the IPS search path is built
- why `composition.type=http://loinc.org|60591-5` is used
- how section filters become `composition.section=...`

they should read the canonical `common-utils` 101 linked above.
