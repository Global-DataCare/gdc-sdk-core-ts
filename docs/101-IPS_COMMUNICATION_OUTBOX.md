# IPS Communication Outbox 101

> 101 note
> - Teach here: the highest-level runtime-neutral `sdk-core` surface for this topic.
> - Do not present concrete wallet/profile transport or submit/poll runtime as the main path here.
> - Read [101-README.md](./101-README.md) for the ordered path, then continue upward into `gdc-sdk-node-ts` or `gdc-sdk-front-ts`.


This guide covers only the `sdk-core` layer for IPS requests.

Teaching rule for this `101`:

- start from the highest-level request object first
- keep the FHIR search-param story separate from the transport/container render
- explain lower-level search/container details only after the main flow is clear
- do not start from raw wire payloads

Use this together with the canonical IPS 101 in `common-utils`:

- [101-COMMUNICATION_LAYERING.md](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/101-COMMUNICATION_LAYERING.md)
- [101-IPS_BUNDLE.md](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/101-IPS_BUNDLE.md)
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

That `content-reference` currently points to:

- `individual/org.hl7.fhir.r4/Bundle/_search?...`

## Important Distinction

There are two different containers here, and they do not use the same search
encoding:

- `Communication.content-reference`
  carries a relative reference path
- `Bundle.entry[].request + resource`
  carries a canonical FHIR batch search request

That means:

- inside `Communication`, the current runtime contract still uses a relative
  `_search?...` reference string
- inside a FHIR `Bundle`, new code should prefer `POST + Parameters`
  instead of query-string search

This is not a contradiction in business semantics. It is the same semantic
request rendered in two different transport shapes.

Source of truth rule:

- first build semantic parameters
- then derive the transport/container-specific representation

For IPS summary requests, the semantic source of truth is:

- `createSummaryOperationRequestParameters(...)`

From there, current code may derive either:

- `createSummaryOperationRequestReferencePath(...)`
  for `Communication.content-reference`
- `createSummaryOperationRequestParametersResource(...)`
  for a canonical FHIR `Parameters` body

Practical rule for developers:

- do not handwrite `_search?...` strings
- do not copy bundle search semantics into `Communication` by hand
- build semantic parameters first, then serialize them for the target
  container

Why `Communication` still uses a relative `_search?...` reference:

- the request already travels inside a scoped actor flow
- the runtime already knows the target provider/index route
- the request is already scoped to one subject and one smart-token context
- the current gateway flow treats the `Communication` as an auditable request
  envelope that points to the document search, not as the batch search itself

So for new developers, the safe mental model is:

- `Communication` = auditable request envelope with a search reference
- `Bundle` = actual FHIR search operation payload, with the search semantics
  still described by FHIR search params such as `Composition.section`

## Step By Step

Executable reference:

- [101-communication-ips-search-outbox.test.mjs](../tests/101-communication-ips-search-outbox.test.mjs)

```ts
import {
  createCommMsgExtendedDraft,
  createCommunicationOutboxJobFromCommMsgExtendedDraft,
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
const communicationDraft = createCommMsgExtendedDraft({
  subject: EXAMPLE_SUBJECT_DID,
  sender: EXAMPLE_PROFESSIONAL_DID,
  recipient: EXAMPLE_INDEX_PROVIDER_SECTOR_DID_WEB,
  claims: communicationClaims,
});

// Step 3.
// sdk-core freezes that draft into the outbox job used by runtime layers.
const communicationJob =
  createCommunicationOutboxJobFromCommMsgExtendedDraft(communicationDraft);
```

`communicationJob` preserves `CommMsgExtended.body.data[].resource.meta.claims`.
It contains no prebuilt FHIR or DIDComm envelope.

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
