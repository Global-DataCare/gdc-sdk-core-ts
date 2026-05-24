import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CommunicationOutboxStatuses,
  OutboxRepositoryMemory,
  addClaimsResourceToDraft,
  createCommunicationDraft,
  createOutboxJobFromDraft,
} from '../dist/index.js';

test('memory outbox repository stores and filters drafts and jobs', async () => {
  const repo = new OutboxRepositoryMemory();
  await repo.initialize();

  const draft = addClaimsResourceToDraft(
    createCommunicationDraft({
      subject: 'did:web:api.acme.org:individual:123',
      noteText: 'Draft note',
    }),
    'Consent',
    { 'Consent.subject': 'did:web:api.acme.org:individual:123' },
  );
  await repo.putDraft(draft);

  const job = createOutboxJobFromDraft(draft, {
    status: CommunicationOutboxStatuses.Ready,
  });
  await repo.putJob(job);

  assert.equal((await repo.listDrafts()).length, 1);
  assert.equal((await repo.getDraft(draft.id))?.id, draft.id);
  assert.equal((await repo.listJobs()).length, 1);
  assert.equal((await repo.getJob(job.id))?.payload.resourceType, 'Communication');
  assert.equal((await repo.listJobs({ status: CommunicationOutboxStatuses.Ready })).length, 1);
  assert.equal((await repo.listJobs({ draftId: draft.id }))[0].id, job.id);
});
