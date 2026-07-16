# Communication Ingestion Layers

These layers are independent. Do not use “format”, “Bundle”, “envelope” or
“transport” as interchangeable names.

## 1. Canonical message

The outbox stores a claims-first `CommMsgExtended`:

```text
CommMsgExtended
└─ body.data[]
   └─ resource
      ├─ resourceType: Communication
      └─ meta.claims: canonical Communication.* claims
```

`attachFhirResourceAsAttachmentToCommMsgExtendedDraft(...)` serializes the
resource and writes the explicit `Communication.content-attachment-*` claims.
Each attachment is an atomic `data[]` Communication entry.

The outbox does not contain a FHIR batch and does not contain a DIDComm
envelope.

## 2. Clinical format

The selected clinical format projects the same canonical message:

```text
api  -> JSON:API-like primary document body.data[]
r4   -> FHIR Bundle(type=batch).entry[].resource = Communication R4
other -> product-supplied projection renderer
```

API and R4 are built into GDC Core. Product packages inject other renderers
rather than adding product-specific conversions to shared utilities.

## 3. Transport profile

Transport is applied only after clinical rendering:

```text
rendered data/Bundle body
├─ application/fhir+json
│  └─ body directly; no DIDComm envelope
├─ application/didcomm-plain+json
│  └─ DIDComm plaintext { id, thid, type, body }
└─ application/x-www-form-urlencoded
   └─ request=<JWE(DIDComm plaintext)>
```

Encrypted polling uses `response=<JWE>`. JAR/JARM, PKCE and
`client_assertion` are OAuth/FAPI authorization artifacts; they do not rename
the clinical DIDComm message.

## Public write flow

```ts
let communicationDraft = createCommMsgExtendedDraft({ subject, sender });
communicationDraft = attachFhirResourceAsAttachmentToCommMsgExtendedDraft(
  communicationDraft,
  ipsDocumentBundle,
);
const communicationJob =
  createCommunicationOutboxJobFromCommMsgExtendedDraft(communicationDraft);

await actorSdk.ingestCommunicationAndUpdateIndex(ctx, {
  communicationJob,
  clinicalFormat: 'r4',
});
```

The runtime derives the endpoint route from `clinicalFormat`, renders the
clinical body, applies the configured transport, submits and polls. Application
code must not build `data[]`, `entry[]`, DIDComm or JWE envelopes manually.
