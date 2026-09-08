# 101 — Resolve an index provider and match a patient

The public ledger locates the individual's index provider. It does not return
a Patient, card or clinical index.

## Step 1 — Locate the index provider

```ts
const provider = await resolveSubjectIndexProvider(identifier, { ledger });

// provider.subjectLookupAssetId is the opaque public lookup key.
// provider.indexProviderDid is the only value returned from Fabric.
```

Resolve `provider.indexProviderDid` as a DID document to discover the
provider-published service base URL. Discovery alone grants no data access.

## Step 2 — Match through PDQm

The provider-facing interoperable operation is IHE PDQm ITI-119:

```text
POST [base]/Patient/$match
Content-Type: application/fhir+json
```

The legacy FHIR request body is one native `Parameters` resource.
`Parameters.parameter[]` contains the input `Patient`; it is not a top-level
array and is not a Bundle:

```ts
const matchRequest = buildPdqmPatientMatchRequest({
  fhirBaseUrl: providerFhirBaseUrl,
  patient: {
    resourceType: 'Patient',
    identifier: [{ system: identifier.codingSystem, value: identifier.value }],
  },
  onlyCertainMatches: true,
});
```

The provider may derive its opaque storage lookup internally. No hash is part
of the PDQm wire contract. The response is one FHIR search `Bundle` containing
matching Patient resources. The provider projects its protected identity link
to the governed stable card in `Patient.identifier`; schema.org `sameAs`
remains internal identity-link semantics and is not invented as a FHIR field.

## Step 3 — Select transport without changing the payload

For DIDComm, wrap the operation once:

```ts
const body = buildPdqmPatientMatchGatewayBody(matchRequest);

// body.data.length === 1
// body.data[0].resource is the Parameters resource
// body.data[0].request is POST Patient/$match
```

- Legacy FHIR sends the native `Parameters` and receives the native result
  Bundle.
- `application/didcomm-plain+json` carries the request Bundle as the DIDComm
  plain `body`; the response Bundle is likewise the DIDComm plain `body`.
- Strict mode encrypts that same Bundle through the secure DIDComm adapter and
  sends `application/x-www-form-urlencoded` with `request=<JWE>`; the terminal
  response uses `response=<JWE>`. Decryption and verification recover the same
  Bundle.

The form shape is JAR/JARM-inspired transport framing. The protected object is
a DIDComm JWE; this guide does not claim that it is an OAuth authorization
request or authorization response.

The generic internal collection may remain `Subject`, while the human-health
FHIR adapter exposes `Patient/$match`. Version-neutral canonical API claims
must be defined in Common Utils before a GW manager stores them; an
`org.hl7.fhir.r4.*` storage namespace must not be invented by an SDK.

If several operations are intentionally submitted as one batch, use
`Bundle.data[]` in the GW API representation (or `Bundle.entry[]` at a native
FHIR boundary). Each POST operation contains one `Parameters` resource; there
is never a free-standing array of Parameters resources.

## Authorization boundary

Resolving `indexProviderDid` does not authorize the match. The provider must
evaluate the authenticated professional, current assignment/licence/key
binding, Consent or governed emergency authority, and requested scope before
returning matches.

Standard reference: [IHE PDQm ITI-119](https://profiles.ihe.net/ITI/PDQm/ITI-119.html).
