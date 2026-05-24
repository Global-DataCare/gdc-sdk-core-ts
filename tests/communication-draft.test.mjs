import test from 'node:test';
import assert from 'node:assert/strict';

import { ResourceTypesFhirR4 } from 'gdc-common-utils-ts/constants/fhir-resource-types';
import {
  CommunicationOutboxStatuses,
  addClaimsResourceToDraft,
  addFhirResourceToDraft,
  createCommunicationDraft,
  createHeartRateObservation,
  createOutboxJobFromDraft,
  getCommunicationFromDraft,
  isCommunicationDraftReady,
  updateOutboxJobStatus,
} from '../dist/index.js';

test('communication draft starts in-memory and becomes ready after adding payloads', () => {
  const draft = createCommunicationDraft({
    subject: 'did:web:api.acme.org:individual:123',
    noteText: 'Vital signs draft',
  });

  assert.equal(isCommunicationDraftReady(draft), false);
  assert.equal(getCommunicationFromDraft(draft).resourceType, ResourceTypesFhirR4.Communication);

  const next = addFhirResourceToDraft(
    draft,
    createHeartRateObservation({ value: 72, effectiveDateTime: '2026-05-22T08:00:00Z' }),
    { asDocumentReference: true, attachmentTitle: 'heart-rate.json' },
  );

  assert.equal(isCommunicationDraftReady(next), true);
  assert.equal(next.communication.payload.length, 1);
});

test('draft can be frozen into an outbox job and moved through transport statuses', () => {
  const draft = addClaimsResourceToDraft(
    createCommunicationDraft({
      subject: 'did:web:api.acme.org:individual:123',
    }),
    ResourceTypesFhirR4.Consent,
    {
      'Consent.subject': 'did:web:api.acme.org:individual:123',
      'Consent.status': 'active',
    },
    { noteText: 'Consent draft' },
  );

  const job = createOutboxJobFromDraft(draft);
  assert.equal(job.status, CommunicationOutboxStatuses.Ready);
  assert.equal(job.payload.resourceType, ResourceTypesFhirR4.Communication);
  assert.equal(typeof job.thid, 'string');

  const sent = updateOutboxJobStatus(job, CommunicationOutboxStatuses.Sent, {
    response: { accepted: true },
  });
  assert.equal(sent.status, CommunicationOutboxStatuses.Sent);
  assert.equal(sent.response.accepted, true);
});
