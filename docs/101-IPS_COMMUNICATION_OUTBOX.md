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
- `createSummaryOperationRequestParametersResource(...)`
- `communication.setRequestSummaryOperation(...)`

That `content-reference` currently points to:

- `individual/org.hl7.fhir.api/Subject/$summary`

## Important Distinction

The read request and its result are different resources:

- `Communication.content-reference` selects `Subject/$summary`
- `Communication.content-attachment-data` contains the base64-encoded FHIR
  `Parameters` request body
- GW returns a FHIR `Bundle` of type `document`

Source of truth rule:

- first build semantic parameters
- then attach their FHIR `Parameters` representation to the Communication

For IPS summary requests, the semantic source of truth is:

- `createSummaryOperationRequestParameters(...)`

`createSummaryOperationRequestReferencePath(...)` remains only for compatibility
with older flattened `Bundle/_search?...` requests.

Practical rule for developers:

- do not handwrite `$summary` Communications or FHIR Parameters
- do not call an ingestion method to perform this read
- use the actor facade `requestClinicalSummary(...)`

So for new developers, the safe mental model is:

- `Communication` = auditable read request
- `Parameters` = subject, document type and optional section filters
- `Bundle document` = authoritative clinical result
- `BundleReader` = structural section navigation
- `FhirDocumentFacade` = resource counts and section/type/date filtering

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
const communicationClaims = communication.setRequestSummaryOperation({
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
  selects `Subject/$summary`
- `Communication.content-attachment-data`
  carries the serialized FHIR `Parameters`
- `draft`
  is the local staged unit
- `outboxJob`
  is the queued unit that runtime layers will send
- `requestClinicalSummary(...)`
  is the Node/Front actor-facade read operation; it is not ingestion
- `result.reader`
  exposes document sections and reference counts
- `result.document`
  resolves resources and filters them by section, type and date

If developers need to understand:

- how summary parameters are built
- how repeated section parameters restrict the document
- how the returned resources are navigated without another network request

they should read the canonical `common-utils` 101 linked above.
