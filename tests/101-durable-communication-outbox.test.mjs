/**
 * 101 flow contract:
 * 1. Begin with the canonical claims-first Communication job.
 * 2. Store it once with an application idempotency key and shared priority.
 * 3. Treat remote acceptance as pending authoritative confirmation.
 * 4. Confirm only after the product/runtime completes its scoped readback.
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

test('101: persist and confirm one canonical Communication outbox job', async () => {
  // Step 1. Author and freeze the transport-neutral claims-first job.
  const job = createCommunicationOutboxJobFromCommMsgExtendedDraft(
    createCommMsgExtendedDraft({
      subject: 'did:web:example.test:individual:1',
      claims: { 'Communication.content-code': 'care-update' },
    }),
    { jobId: 'care-update-job' },
  );

  // Step 2. A runtime injects its repository; Core owns no global instance.
  const repository = new DurableCommunicationOutboxRepositoryMemory();
  const queued = await repository.enqueue({
    job,
    idempotencyKey: 'care-update:individual-1:version-7',
    priority: WalletMessagePriorities.High,
  });

  // Step 3. The worker claims FIFO work. Rendering and transport happen elsewhere.
  const submitting = await repository.claimNext({ workerId: 'runtime-worker' });
  assert.equal(submitting?.id, queued.record.id);

  // Step 4. A remote acknowledgement is accepted, not yet confirmed persistence.
  const accepted = await repository.transition(submitting.id, {
    expectedRevision: submitting.revision,
    status: DurableCommunicationOutboxStatuses.Accepted,
    receipt: { thid: job.thid },
  });
  assert.equal(accepted.confirmedAt, undefined);

  // Step 5. Only authoritative subject/type-scoped readback permits confirmation.
  const confirmed = await repository.transition(accepted.id, {
    expectedRevision: accepted.revision,
    status: DurableCommunicationOutboxStatuses.Confirmed,
  });
  assert.equal(confirmed.status, DurableCommunicationOutboxStatuses.Confirmed);
  assert.ok(confirmed.confirmedAt);
});
