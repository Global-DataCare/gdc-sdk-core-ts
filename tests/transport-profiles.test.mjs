import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addFhirResourceToDraft,
  createCommunicationDraft,
  createOutboxJobFromDraft,
  decodeTransportResponse,
  renderCommunicationOutboxRequest,
  renderGatewayMessageRequest,
  renderTransportPollRequest,
  requireTransportProfile,
  TransportProfiles,
} from '../dist/index.js';

function createClinicalJob() {
  const draft = addFhirResourceToDraft(
    createCommunicationDraft({
      subject: 'did:web:unid.online:card:uhc:personal:subject-1',
      sender: 'did:web:professional.example:doctor-1',
    }),
    {
      resourceType: 'Bundle',
      type: 'document',
      entry: [{ resource: { resourceType: 'Composition', status: 'final' } }],
    },
  );
  return createOutboxJobFromDraft(draft, {
    batchOptions: { thid: 'clinical-thread-1' },
  });
}

test('renders one public clinical outbox as FHIR and DIDComm plaintext without rebuilding business payloads', async () => {
  const job = createClinicalJob();
  const fhir = await renderCommunicationOutboxRequest(job, TransportProfiles.FhirJson);
  const didcomm = await renderCommunicationOutboxRequest(job, TransportProfiles.DidcommPlainJson);

  assert.equal(fhir.contentType, 'application/fhir+json');
  assert.equal(fhir.body.resourceType, 'Bundle');
  assert.equal(fhir.body.id, job.thid);
  assert.equal(fhir.body.entry[0].resource.resourceType, 'Communication');
  assert.equal(didcomm.contentType, 'application/didcomm-plain+json');
  assert.equal(didcomm.body.thid, job.thid);
  assert.equal(didcomm.body.body.entry[0].resource.resourceType, 'Communication');
});

test('renders and decodes protected request/response form fields through the supplied wallet adapter', async () => {
  const packed = [];
  const adapter = {
    async pack(message) {
      packed.push(message);
      return `jwe-${message.thid}`;
    },
    async unpack(jwe) {
      return { decrypted: jwe };
    },
  };
  const job = createClinicalJob();
  const submit = await renderCommunicationOutboxRequest(job, TransportProfiles.DidcommEncryptedForm, adapter);
  const poll = await renderTransportPollRequest(job.thid, TransportProfiles.DidcommEncryptedForm, adapter);
  const response = await decodeTransportResponse('response=jwe-response-1', TransportProfiles.DidcommEncryptedForm, adapter);

  assert.equal(submit.body, 'request=jwe-clinical-thread-1');
  assert.equal(poll.body, 'request=jwe-clinical-thread-1');
  assert.equal(packed[0].body.entry[0].resource.resourceType, 'Communication');
  assert.deepEqual(packed[1], { thid: job.thid });
  assert.deepEqual(response, { decrypted: 'jwe-response-1' });
});

test('rejects secure rendering when the caller has no wallet-backed adapter', async () => {
  await assert.rejects(
    renderCommunicationOutboxRequest(createClinicalJob(), TransportProfiles.DidcommEncryptedForm),
    /requires a secure adapter/,
  );
});

test('rejects unknown configured profiles instead of downgrading to plaintext', () => {
  assert.equal(requireTransportProfile('application/fhir+json'), TransportProfiles.FhirJson);
  assert.throws(() => requireTransportProfile('plaintext'), /Unsupported transport profile/);
});

test('renders subject-scoped search messages through the same secure adapter', async () => {
  const packed = [];
  const adapter = {
    async pack(message) { packed.push(message); return 'search-jwe'; },
    async unpack(value) { return value; },
  };
  const request = await renderGatewayMessageRequest({
    thid: 'search-thread-1',
    body: { resourceType: 'Bundle', type: 'batch', entry: [] },
  }, TransportProfiles.DidcommEncryptedForm, adapter);
  assert.equal(request.body, 'request=search-jwe');
  assert.equal(packed[0].body.resourceType, 'Bundle');
});
