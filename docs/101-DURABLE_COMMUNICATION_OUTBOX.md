# Durable Communication Outbox 101

This contract keeps one canonical Communication job safe while different
runtimes choose SQLite, IndexedDB, a database, encrypted storage, or another
durable adapter. Core does not create a singleton and does not send network
requests.

Executable example:

- [101-durable-communication-outbox.test.mjs](../tests/101-durable-communication-outbox.test.mjs)

## The flow

1. Author a claims-first `CommMsgExtended` draft.
2. Freeze it with `createCommunicationOutboxJobFromCommMsgExtendedDraft(...)`.
3. Enqueue it with an application idempotency key and one of the existing
   `emergency`, `high`, `normal`, or `low` priorities.
4. Let a runtime worker atomically claim due work. Priority is evaluated first;
   records of equal priority remain FIFO.
5. Record a remote acknowledgement as `accepted`.
6. Use `reconciling` while the outcome is ambiguous or authoritative readback
   is pending.
7. Use `confirmed` only after the product/runtime performs the required scoped
   readback.

```ts
const repository = new DurableCommunicationOutboxRepositoryMemory();
const queued = await repository.enqueue({
  job: communicationJob,
  idempotencyKey: 'care-update:subject-1:version-7',
  priority: WalletMessagePriorities.High,
});

const submitting = await repository.claimNext({ workerId: 'runtime-worker' });
const accepted = await repository.transition(submitting.id, {
  expectedRevision: submitting.revision,
  status: DurableCommunicationOutboxStatuses.Accepted,
});

// Run the product-specific authoritative readback outside Core.
await repository.transition(accepted.id, {
  expectedRevision: accepted.revision,
  status: DurableCommunicationOutboxStatuses.Confirmed,
});
```

## Honest states

- `pending`: durable and eligible when `availableAt` is reached
- `submitting`: claimed by one worker; delivery outcome is not yet known
- `accepted`: remote submission acknowledged, persistence not yet proven
- `reconciling`: query/readback is resolving an ambiguous or pending outcome
- `confirmed`: authoritative completion/readback succeeded
- `retryable`: a temporary pre-acceptance failure may be submitted again after
  `availableAt`
- `rejected`: remote terminal rejection
- `failed`: local terminal failure
- `cancelled`: explicitly stopped before terminal confirmation

An expired `submitting` lease must not be blindly submitted again. A durable
adapter or runtime should move it to `reconciling`, because the previous remote
request may have succeeded before the worker stopped.

Likewise, an unavailable readback after `accepted` remains `reconciling`; it
must not become a submission retry that could duplicate an accepted write.

## Adapter rules

A production adapter must preserve these semantics atomically:

- one record per idempotency key
- collision detection when that key is reused for another job/thread
- monotonic FIFO `sequence`
- priority before FIFO
- compare-and-swap `revision`
- immutable canonical `job`
- durable timestamps, receipts, and structured errors

Rendering FHIR, DIDComm plaintext, or JWE and performing HTTP/Bluetooth
delivery belong to runtime/carrier layers. They do not change the stored
canonical job.
