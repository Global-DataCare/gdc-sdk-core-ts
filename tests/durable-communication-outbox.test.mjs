/**
 * Flow contract:
 * 1. Enqueue is idempotent and never replaces a different job silently.
 * 2. Submission claims use emergency/high/normal/low priority and FIFO within a priority.
 * 3. Accepted submission remains distinct from confirmed authoritative readback.
 * 4. Revisions prevent two workers from overwriting the same durable state.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { WalletMessagePriorities } from '../../gdc-common-utils-ts/dist/models/wallet.js';
import {
  DurableCommunicationOutboxRepositoryMemory,
  DurableCommunicationOutboxStatuses,
  createCommMsgExtendedDraft,
  createCommunicationOutboxJobFromCommMsgExtendedDraft,
} from '../dist/index.js';

function job(id, thid = `thread-${id}`) {
  return createCommunicationOutboxJobFromCommMsgExtendedDraft(
    createCommMsgExtendedDraft({
      draftId: `draft-${id}`,
      messageId: `message-${id}`,
      thid,
      subject: 'did:web:example.test:individual:1',
      claims: { 'Communication.content-code': 'test' },
    }),
    { jobId: id },
  );
}

test('durable outbox provides idempotent enqueue without silent collisions', async () => {
  const repository = new DurableCommunicationOutboxRepositoryMemory();
  const first = await repository.enqueue({ job: job('job-1'), idempotencyKey: 'operation-1' });
  const replay = await repository.enqueue({ job: job('job-1'), idempotencyKey: 'operation-1' });

  assert.equal(first.created, true);
  assert.equal(replay.created, false);
  assert.deepEqual(replay.record, first.record);
  assert.equal((await repository.list()).length, 1);
  await assert.rejects(
    repository.enqueue({ job: job('job-2'), idempotencyKey: 'operation-1' }),
    /idempotency key collision/,
  );
  const digested = { ...job('job-digest'), idempotencyDigest: 'digest-a' };
  await repository.enqueue({ job: digested, idempotencyKey: 'operation-digest' });
  await assert.rejects(
    repository.enqueue({ job: { ...digested, idempotencyDigest: 'digest-b' }, idempotencyKey: 'operation-digest' }),
    /idempotency key collision/,
  );
});

test('durable outbox claims by canonical priority and FIFO within a priority', async () => {
  const repository = new DurableCommunicationOutboxRepositoryMemory();
  const availableAt = '2026-07-19T09:00:00.000Z';
  await repository.enqueue({
    job: job('normal-1'), idempotencyKey: 'normal-1', availableAt,
    priority: WalletMessagePriorities.Normal,
  });
  await repository.enqueue({
    job: job('emergency-1'), idempotencyKey: 'emergency-1', availableAt,
    priority: WalletMessagePriorities.Emergency,
  });
  await repository.enqueue({
    job: job('emergency-2'), idempotencyKey: 'emergency-2', availableAt,
    priority: WalletMessagePriorities.Emergency,
  });
  await repository.enqueue({
    job: job('high-future'), idempotencyKey: 'high-future',
    availableAt: '2026-07-20T09:00:00.000Z', priority: WalletMessagePriorities.High,
  });

  const first = await repository.claimNext({ workerId: 'worker-a', now: availableAt });
  const second = await repository.claimNext({ workerId: 'worker-a', now: availableAt });
  const third = await repository.claimNext({ workerId: 'worker-a', now: availableAt });

  assert.equal(first?.id, 'emergency-1');
  assert.equal(second?.id, 'emergency-2');
  assert.equal(third?.id, 'normal-1');
  assert.equal(first?.status, DurableCommunicationOutboxStatuses.Submitting);
  assert.equal(first?.attemptCount, 1);
  assert.equal(first?.leaseOwner, 'worker-a');
});

test('durable outbox keeps accepted, reconciling, and confirmed states honest', async () => {
  const repository = new DurableCommunicationOutboxRepositoryMemory();
  const availableAt = '2026-07-19T09:00:00.000Z';
  await repository.enqueue({ job: job('job-1'), idempotencyKey: 'operation-1', availableAt });
  const submitting = await repository.claimNext({ workerId: 'worker-a', now: availableAt });
  assert.ok(submitting);

  const accepted = await repository.transition(submitting.id, {
    expectedRevision: submitting.revision,
    status: DurableCommunicationOutboxStatuses.Accepted,
    updatedAt: '2026-07-19T09:00:01.000Z',
    receipt: { remoteId: 'remote-1' },
  });
  assert.equal(accepted.confirmedAt, undefined);
  assert.deepEqual(accepted.receipt, { remoteId: 'remote-1' });
  await assert.rejects(
    repository.transition(accepted.id, {
      expectedRevision: accepted.revision,
      status: DurableCommunicationOutboxStatuses.Retryable,
    }),
    /Invalid durable Communication outbox transition/,
  );

  const reconciling = await repository.transition(accepted.id, {
    expectedRevision: accepted.revision,
    status: DurableCommunicationOutboxStatuses.Reconciling,
    updatedAt: '2026-07-19T09:00:02.000Z',
  });
  const confirmed = await repository.transition(reconciling.id, {
    expectedRevision: reconciling.revision,
    status: DurableCommunicationOutboxStatuses.Confirmed,
    updatedAt: '2026-07-19T09:00:03.000Z',
  });

  assert.equal(confirmed.confirmedAt, '2026-07-19T09:00:03.000Z');
  await assert.rejects(
    repository.transition(confirmed.id, {
      expectedRevision: confirmed.revision,
      status: DurableCommunicationOutboxStatuses.Retryable,
    }),
    /Invalid durable Communication outbox transition/,
  );
});

test('durable outbox retries with CAS and keeps repository instances isolated', async () => {
  const repository = new DurableCommunicationOutboxRepositoryMemory();
  const otherRepository = new DurableCommunicationOutboxRepositoryMemory();
  const availableAt = '2026-07-19T09:00:00.000Z';
  await repository.enqueue({ job: job('job-1'), idempotencyKey: 'operation-1', availableAt });
  const submitting = await repository.claimNext({ workerId: 'worker-a', now: availableAt });
  assert.ok(submitting);
  const retryable = await repository.transition(submitting.id, {
    expectedRevision: submitting.revision,
    status: DurableCommunicationOutboxStatuses.Retryable,
    updatedAt: '2026-07-19T09:00:01.000Z',
    availableAt: '2026-07-19T09:05:00.000Z',
    error: { code: 'temporarily-unavailable', message: 'Try again later.' },
  });

  assert.equal(await repository.claimNext({ workerId: 'worker-b', now: '2026-07-19T09:04:59.000Z' }), undefined);
  const retried = await repository.claimNext({ workerId: 'worker-b', now: '2026-07-19T09:05:00.000Z' });
  assert.equal(retried?.attemptCount, 2);
  assert.equal(retried?.lastError, undefined);
  assert.equal((await otherRepository.list()).length, 0);
  await assert.rejects(
    repository.transition(retryable.id, {
      expectedRevision: retryable.revision,
      status: DurableCommunicationOutboxStatuses.Failed,
    }),
    /revision conflict/,
  );
});

test('durable outbox lets another worker recover an expired submission lease', async () => {
  const repository = new DurableCommunicationOutboxRepositoryMemory();
  const availableAt = '2026-07-19T09:00:00.000Z';
  await repository.enqueue({ job: job('job-lease'), idempotencyKey: 'operation-lease', availableAt });
  const first = await repository.claimNext({ workerId: 'pod-a', now: availableAt, leaseMs: 1_000 });
  assert.equal(first?.leaseOwner, 'pod-a');
  assert.equal(await repository.claimNext({ workerId: 'pod-b', now: '2026-07-19T09:00:00.999Z' }), undefined);
  const recovered = await repository.claimNext({ workerId: 'pod-b', now: '2026-07-19T09:00:01.000Z' });
  assert.equal(recovered?.id, 'job-lease');
  assert.equal(recovered?.leaseOwner, 'pod-b');
  assert.equal(recovered?.attemptCount, 2);
});
