import test from 'node:test';
import assert from 'node:assert/strict';
import { ResourceTypesFhirR4 } from 'gdc-common-utils-ts/constants/fhir-resource-types';

import {
  assertBundleSearchQuery,
  assertCommMsgExtendedInput,
  assertCommunicationInput,
} from '../dist/index.js';

test('communication contract accepts canonical thread-bearing input', () => {
  const communicationInput = {
    thid: 'thread-001',
    pthid: 'thread-parent-001',
    channelId: 'channel-001',
    partOf: 'bundle-001',
    subject: 'did:web:api.acme.org:individual:123',
    sender: 'did:web:sender.acme.org:agent:456',
    recipient: ['did:web:recipient.acme.org:agent:789'],
    sent: '2026-05-21T10:15:00Z',
    category: ['ips', 'summary'],
    text: 'IPS update',
    attachments: [{ contentType: 'application/fhir+json', title: 'ips.json' }],
    contentReference: 'urn:uuid:ips-document',
    claims: { source: 'test' },
    payload: { resourceType: ResourceTypesFhirR4.Communication },
  };

  assert.doesNotThrow(() => assertCommunicationInput(communicationInput));
  assert.equal(communicationInput.thid, 'thread-001');
  assert.equal(communicationInput.pthid, 'thread-parent-001');
  assert.equal(communicationInput.channelId, 'channel-001');
  assert.equal(communicationInput.partOf, 'bundle-001');
  assert.equal(communicationInput.subject, 'did:web:api.acme.org:individual:123');
});

test('extended communication contract accepts canonical thread-bearing input', () => {
  const commMsgExtendedInput = {
    thid: 'thread-002',
    pthid: 'thread-parent-002',
    channelId: 'channel-002',
    partOf: 'bundle-002',
    from: 'did:web:sender.acme.org:agent:456',
    to: ['did:web:recipient.acme.org:agent:789'],
    subject: 'did:web:api.acme.org:individual:123',
    body: { text: 'IPS update' },
    claims: { source: 'test' },
  };

  assert.doesNotThrow(() => assertCommMsgExtendedInput(commMsgExtendedInput));
  assert.equal(commMsgExtendedInput.thid, 'thread-002');
  assert.equal(commMsgExtendedInput.pthid, 'thread-parent-002');
  assert.equal(commMsgExtendedInput.channelId, 'channel-002');
  assert.equal(commMsgExtendedInput.partOf, 'bundle-002');
  assert.deepEqual(commMsgExtendedInput.to, ['did:web:recipient.acme.org:agent:789']);
});

test('bundle search query accepts canonical section, date, and searchParams shapes', () => {
  const bundleSearchQuery = {
    thid: 'thread-003',
    pthid: 'thread-parent-003',
    channelId: 'channel-003',
    partOf: 'bundle-003',
    subject: 'did:web:api.acme.org:individual:123',
    section: {
      anyOf: ['LOINC|60591-5'],
      allOf: ['LOINC|18776-5'],
    },
    date: {
      start: '2026-01-01',
      end: '2026-12-31',
    },
    includedTypes: [ResourceTypesFhirR4.Communication, ResourceTypesFhirR4.DocumentReference],
    code: ['LOINC|48765-2'],
    category: 'summary',
    author: ['did:web:author.acme.org:clinician:001'],
    searchParams: {
      page: 1,
      includeDrafts: false,
      source: undefined,
    },
  };

  assert.doesNotThrow(() => assertBundleSearchQuery(bundleSearchQuery));
  assert.equal(bundleSearchQuery.section.anyOf[0], 'LOINC|60591-5');
  assert.equal(bundleSearchQuery.date.start, '2026-01-01');
  assert.equal(bundleSearchQuery.searchParams.page, 1);
});

test('contracts reject malformed shapes and missing required fields', () => {
  assert.throws(() => assertCommunicationInput({ text: 'missing subject' }), /subject/);
  assert.throws(
    () =>
      assertCommunicationInput({
        subject: 'did:web:api.acme.org:individual:123',
        recipient: [123],
      }),
    /recipient/,
  );
  assert.throws(
    () =>
      assertCommMsgExtendedInput({
        subject: 'did:web:api.acme.org:individual:123',
        to: 'not-an-array',
      }),
    /to/,
  );
  assert.throws(
    () =>
      assertBundleSearchQuery({
        subject: 'did:web:api.acme.org:individual:123',
        section: { anyOf: 'LOINC|60591-5' },
      }),
    /section\.anyOf/,
  );
  assert.throws(
    () =>
      assertBundleSearchQuery({
        subject: 'did:web:api.acme.org:individual:123',
        date: { start: 20260101 },
      }),
    /date\.start/,
  );
  assert.throws(
    () =>
      assertBundleSearchQuery({
        subject: 'did:web:api.acme.org:individual:123',
        searchParams: { page: null },
      }),
    /searchParams\.page/,
  );
});
