# Transport Profiles

The normative layer model is
[`COMMUNICATION_INGESTION_LAYERS.md`](./COMMUNICATION_INGESTION_LAYERS.md).

The outbox stores one claims-first `CommMsgExtended`; it does not store a wire
envelope. Clinical format and transport profile are independent decisions.

- `application/fhir+json`: sends the rendered `data[]` API body or FHIR
  `Bundle` directly. No DIDComm envelope is created.
- `application/didcomm-plain+json`: demo/local compatibility only. The thread is DIDComm `thid`.
- `application/x-www-form-urlencoded`: protected HTTP transport using `request=<JWE>` and `response=<JWE>`. The JWE is DIDComm encrypted and its thread is DIDComm `thid`.

Built-in clinical formats are claims-first `api` (`body.data[]`) and FHIR R4
(`Bundle.entry[]`). Product packages may register additional projections.

FAPI JAR/JARM binds authorization for every protected health operation, not only login. SOSChain may carry the same JWE over HTTP, Bluetooth, or another link; the carrier does not alter the payload or thread.

An outbox records canonical payload, selected profile, thread id, destination, priority and delivery state. The portal is online-first; SOSChain owns offline persistence and replay.
