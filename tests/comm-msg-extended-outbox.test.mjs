// Flow contract: reuse shared test fixtures and canonical types; do not introduce duplicated literals.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  attachClinicalDocumentToCommMsgExtendedDraft,
  attachFhirResourceAsAttachmentToCommMsgExtendedDraft,
  attachSectionBundleToCommMsgExtendedDraft,
  createCommunicationOutboxJobFromCommMsgExtendedDraft,
  createCommMsgExtendedDraft,
  createClinicalSectionUpdateOutboxJob,
  renderCommunicationOutboxRequest,
  TransportProfiles,
} from '../dist/index.js';

const clinicalDocument = {
  resourceType: 'Bundle',
  type: 'document',
  entry: [{
    resource: {
      resourceType: 'Composition',
      status: 'final',
      section: [{
        code: { coding: [{ system: 'http://loinc.org', code: '48765-2' }] },
        entry: [{ reference: 'AllergyIntolerance/allergy-1' }],
      }],
    },
  }, {
    resource: { resourceType: 'AllergyIntolerance', id: 'allergy-1' },
  }],
};

function createIpsJob() {
  // Direct clinical update contract: sender is the authenticated profile's
  // operational actor DID; recipient is the real tenant DID hosted by GW.
  let communicationDraft = createCommMsgExtendedDraft({
    thid: 'ips-thread-1',
    subject: 'did:web:subject.example',
    sender: 'did:web:doctor.example',
    recipient: 'did:web:hospital.example',
    noteText: 'IPS import',
  });
  communicationDraft = attachFhirResourceAsAttachmentToCommMsgExtendedDraft(
    communicationDraft,
    { resourceType: 'Bundle', type: 'document', entry: [] },
    { attachmentTitle: 'ips.json' },
  );
  return createCommunicationOutboxJobFromCommMsgExtendedDraft(communicationDraft);
}

test('keeps claims-first CommMsgExtended and renders api data[] without an envelope', async () => {
  const job = createIpsJob();
  assert.equal(job.envelope, undefined);
  assert.ok(Array.isArray(job.payload.body.data));

  const rendered = await renderCommunicationOutboxRequest(
    job,
    TransportProfiles.FhirJson,
    undefined,
    { clinicalFormat: 'api' },
  );

  assert.equal(rendered.body.data[0].resource.resourceType, 'Communication');
  assert.equal(rendered.body.data[0].resource.meta.claims['Communication.content-attachment-title'], 'ips.json');
  assert.equal(rendered.body.entry, undefined);
});

test('projects the same claims-first message to an R4 FHIR batch', async () => {
  const job = createIpsJob();
  const rendered = await renderCommunicationOutboxRequest(
    job,
    TransportProfiles.FhirJson,
    undefined,
    { clinicalFormat: 'r4' },
  );

  assert.equal(rendered.body.resourceType, 'Bundle');
  assert.equal(rendered.body.type, 'batch');
  assert.equal(rendered.body.thid, undefined);
  assert.equal(rendered.body.id, job.thid);
  assert.equal(rendered.body.entry[0].request.url, 'individual/org.hl7.fhir.r4/Communication');
  assert.equal(rendered.body.entry[0].resource.payload[0].contentAttachment.title, 'ips.json');
  assert.equal(rendered.body.entry[0].resource.meta.claims['@context'], 'org.hl7.fhir.api');
});

test('represents multiple attachments as atomic data entries and Communication batch entries', async () => {
  let draft = createCommMsgExtendedDraft({ subject: 'did:web:subject.example' });
  draft = attachFhirResourceAsAttachmentToCommMsgExtendedDraft(
    draft,
    { resourceType: 'Observation', id: 'one' },
  );
  draft = attachFhirResourceAsAttachmentToCommMsgExtendedDraft(
    draft,
    { resourceType: 'Observation', id: 'two' },
  );
  const job = createCommunicationOutboxJobFromCommMsgExtendedDraft(draft);
  const api = await renderCommunicationOutboxRequest(
    job,
    TransportProfiles.FhirJson,
    undefined,
    { clinicalFormat: 'api' },
  );
  const r4 = await renderCommunicationOutboxRequest(
    job,
    TransportProfiles.FhirJson,
    undefined,
    { clinicalFormat: 'r4' },
  );

  assert.equal(api.body.data.length, 2);
  assert.equal(r4.body.entry.length, 2);
});

test('uses a product-supplied renderer for a format not owned by GDC Core', async () => {
  const job = createIpsJob();
  const rendered = await renderCommunicationOutboxRequest(
    job,
    TransportProfiles.DidcommPlainJson,
    undefined,
    {
      clinicalFormat: 'product-format',
      formatRenderers: {
        'product-format'(message) {
          return { data: [], id: message.thid, renderedByProduct: true };
        },
      },
    },
  );

  assert.equal(rendered.body.body.renderedByProduct, true);
  assert.equal(rendered.body.thid, job.thid);
});

test('builds a DIDComm envelope only for DIDComm transport', async () => {
  const job = createIpsJob();
  const packed = [];
  const rendered = await renderCommunicationOutboxRequest(
    job,
    TransportProfiles.DidcommEncryptedForm,
    {
      async pack(message) { packed.push(message); return 'compact-jwe'; },
      async unpack(value) { return value; },
    },
    { clinicalFormat: 'api' },
  );

  assert.equal(rendered.body, 'request=compact-jwe');
  assert.ok(Array.isArray(packed[0].body.data));
  assert.equal(packed[0].iss, packed[0].from);
});

test('projects the canonical DIDComm sender as the operational issuer in plain transport', async () => {
  const rendered = await renderCommunicationOutboxRequest(
    createIpsJob(),
    TransportProfiles.DidcommPlainJson,
    undefined,
    { clinicalFormat: 'api' },
  );

  // This equality is why direct updateClinicalSummary callers must use
  // profile.actorDid as sender rather than a stable URN or portal alias.
  assert.equal(rendered.body.iss, rendered.body.from);
});

test('rejects an unknown clinical format when no extension renderer owns it', async () => {
  await assert.rejects(
    renderCommunicationOutboxRequest(
      createIpsJob(),
      TransportProfiles.FhirJson,
      undefined,
      { clinicalFormat: 'unknown-format' },
    ),
    /Unsupported Communication clinical format 'unknown-format'/,
  );
});

test('explicit draft subject cannot be overridden by caller-supplied claims', () => {
  const draft = createCommMsgExtendedDraft({
    subject: 'did:web:trusted-subject.example',
    claims: { 'Communication.subject': 'did:web:other-subject.example' },
  });
  assert.equal(
    draft.message.body.data[0].resource.meta.claims['Communication.subject'],
    'did:web:trusted-subject.example',
  );
});

test('clinical document attachment requires Composition first and rejects an unscoped batch', () => {
  const draft = createCommMsgExtendedDraft({ subject: 'did:web:subject.example' });
  const attached = attachClinicalDocumentToCommMsgExtendedDraft(draft, clinicalDocument);
  const claims = attached.message.body.data[0].resource.meta.claims;
  assert.equal(claims['Communication.content-attachment-type'], 'application/fhir+json');

  assert.throws(
    () => attachClinicalDocumentToCommMsgExtendedDraft(draft, {
      resourceType: 'Bundle',
      type: 'batch',
      data: [{ resource: { resourceType: 'AllergyIntolerance', id: 'allergy-1' } }],
    }),
    /Bundle\.type=document.*Composition/i,
  );
});

test('section batch attachment carries the one section explicitly on Communication', () => {
  const draft = createCommMsgExtendedDraft({ subject: 'did:web:subject.example' });
  const attached = attachSectionBundleToCommMsgExtendedDraft(
    draft,
    {
      resourceType: 'Bundle',
      type: 'collection',
      data: [{ resource: { resourceType: 'Observation', id: 'heart-rate-1' } }],
    },
    { section: 'LOINC|8716-3' },
  );
  const claims = attached.message.body.data[0].resource.meta.claims;
  assert.equal(claims['Communication.topic'], 'LOINC|8716-3');
  assert.equal('Composition.section' in claims, false);

  assert.throws(
    () => attachSectionBundleToCommMsgExtendedDraft(
      draft,
      { resourceType: 'Bundle', type: 'document', entry: clinicalDocument.entry },
      { section: 'LOINC|8716-3' },
    ),
    /batch or collection/i,
  );
  assert.throws(
    () => attachSectionBundleToCommMsgExtendedDraft(
      draft,
      {
        resourceType: 'Bundle',
        type: 'batch',
        data: [{ resource: { resourceType: 'Observation', id: 'heart-rate-1' } }],
      },
      { section: '' },
    ),
    /exactly one section/i,
  );
});

test('section update builder places the explicit author on each writable resource without mutating the BFF bundle', () => {
  // Flow contract: the BFF selects an authorized clinical author independently
  // from the authenticated sender; the SDK owns canonical claim placement.
  const source = {
    resourceType: 'Bundle',
    type: 'batch',
    data: [{
      request: { method: 'PUT', url: 'Observation/9f45a66d-14cb-4b97-b72c-e0bd77254cb6' },
      resource: { resourceType: 'Observation', id: '9f45a66d-14cb-4b97-b72c-e0bd77254cb6' },
    }],
  };
  const job = createClinicalSectionUpdateOutboxJob({
    subject: 'did:web:subject.example',
    sender: 'did:web:clinic.example:employee:assistant',
    author: 'did:web:clinic.example:employee:veterinarian',
    section: 'http://loinc.org|30954-2',
    bundle: source,
  });
  const claims = job.payload.body.data[0].resource.meta.claims;
  const attached = JSON.parse(Buffer.from(claims['Communication.content-attachment-data'], 'base64').toString('utf8'));

  assert.equal(attached.meta.claims['Composition.author'], 'did:web:clinic.example:employee:veterinarian');
  assert.equal(attached.data[0].resource.meta.claims['Composition.author'], 'did:web:clinic.example:employee:veterinarian');
  assert.equal(source.data[0].resource.meta, undefined);
});
