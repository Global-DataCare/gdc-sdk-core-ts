# Transport Profiles

Channel facades select a profile per outbox entry; they do not assume DIDComm.

- `application/fhir+json`: human and animal health Communications. `Bundle.id` is the only business thread id. Each Communication has one attachment at most and flat claims in `resource.meta.claims`.
- `application/didcomm-plain+json`: demo/local compatibility only. The thread is DIDComm `thid`.
- `application/x-www-form-urlencoded`: protected HTTP transport using `request=<JWE>` and `response=<JWE>`. The JWE is DIDComm encrypted and its thread is DIDComm `thid`.

FAPI JAR/JARM binds authorization for every protected health operation, not only login. SOSChain may carry the same JWE over HTTP, Bluetooth, or another link; the carrier does not alter the payload or thread.

An outbox records canonical payload, selected profile, thread id, destination, priority and delivery state. The portal is online-first; SOSChain owns offline persistence and replay.
