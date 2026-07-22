/**
 * Teaching goal:
 * - common-utils finishes one Bundle containing one or several semantic changes
 * - sdk-core attaches that whole Bundle to one claims-first Communication draft
 * - the same frozen outbox job can be rendered as API, FHIR R4, DIDComm/plain,
 *   or a product-owned projection without changing the authored Bundle
 *
 * This test reuses sibling common-utils fixtures. Submit/poll and concrete
 * authorization belong to Node/Front runtimes, not this runtime-neutral 101.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BundleEditableResourceTypes,
  BundleEditor,
  BundleOperations,
  BundleTypes,
} from '../../gdc-common-utils-ts/dist/index.js';
import {
  EXAMPLE_EMAIL_RELATED_PERSON,
  EXAMPLE_RELATED_PERSON_ACTIVE_NAME,
  EXAMPLE_RELATED_PERSON_IDENTIFIER,
  EXAMPLE_RELATED_PERSON_INACTIVE_IDENTIFIER,
  EXAMPLE_RELATED_PERSON_INACTIVE_NAME,
  EXAMPLE_RELATED_PERSON_ROLE,
  EXAMPLE_SUBJECT_DID,
  EXAMPLE_TENANT_SERVICE_DID,
} from '../../gdc-common-utils-ts/dist/examples/shared.js';

import {
  TransportProfiles,
  attachBundleToCommMsgExtendedDraft,
  createCommMsgExtendedDraft,
  createCommunicationOutboxJobFromCommMsgExtendedDraft,
  renderCommunicationOutboxRequest,
} from '../dist/index.js';

function buildContactsBundle(count) {
  const editor = new BundleEditor()
    .setBundleOperation(BundleOperations.create)
    .setBundleType(BundleTypes.batch)
    .setAllowedResourceType(BundleEditableResourceTypes.relatedPerson);

  editor
    .newEntryAs(BundleEditableResourceTypes.relatedPerson)
    .setIdentifier(EXAMPLE_RELATED_PERSON_IDENTIFIER)
    .setActive(true)
    .setSubject(EXAMPLE_SUBJECT_DID)
    .setRelationship(EXAMPLE_RELATED_PERSON_ROLE)
    .setName(EXAMPLE_RELATED_PERSON_ACTIVE_NAME)
    .setTelecom(`mailto:${EXAMPLE_EMAIL_RELATED_PERSON}`)
    .doneEntry();

  if (count > 1) {
    editor
      .newEntryAs(BundleEditableResourceTypes.relatedPerson)
      .setIdentifier(EXAMPLE_RELATED_PERSON_INACTIVE_IDENTIFIER)
      .setActive(true)
      .setSubject(EXAMPLE_SUBJECT_DID)
      .setRelationship(EXAMPLE_RELATED_PERSON_ROLE)
      .setName(EXAMPLE_RELATED_PERSON_INACTIVE_NAME)
      .doneEntry();
  }

  return editor.buildJsonApi();
}

test('101: one completed Bundle becomes one Communication outbox job regardless of batching choice', async () => {
  // Step 1. The UI may finish one item now or keep editing and finish several.
  const immediateBundle = buildContactsBundle(1);
  const groupedBundle = buildContactsBundle(2);
  assert.equal(immediateBundle.data.length, 1);
  assert.equal(groupedBundle.data.length, 2);

  // Step 2. sdk-core starts one claims-first delivery Communication.
  let draft = createCommMsgExtendedDraft({
    subject: EXAMPLE_SUBJECT_DID,
    sender: EXAMPLE_SUBJECT_DID,
    recipient: EXAMPLE_TENANT_SERVICE_DID,
  });

  // Step 3. Attach the whole chosen Bundle, not each internal resource.
  draft = attachBundleToCommMsgExtendedDraft(draft, groupedBundle, {
    attachmentTitle: 'contacts.json',
  });

  // Step 4. Freeze the semantic intent before format or transport is selected.
  const job = createCommunicationOutboxJobFromCommMsgExtendedDraft(draft);
  assert.equal(job.payload.body.data.length, 1);

  // Step 5. Select representation and carrier only at the runtime boundary.
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
  const plain = await renderCommunicationOutboxRequest(
    job,
    TransportProfiles.DidcommPlainJson,
    undefined,
    { clinicalFormat: 'api' },
  );

  assert.equal(api.body.data.length, 1);
  assert.equal(r4.body.entry.length, 1);
  assert.equal(plain.body.thid, job.thid);
  assert.equal(plain.body.body.data.length, 1);
});

test('101: Bundle attachment boundary rejects an individual resource', () => {
  const draft = createCommMsgExtendedDraft({ subject: EXAMPLE_SUBJECT_DID });
  assert.throws(
    () => attachBundleToCommMsgExtendedDraft(draft, { resourceType: 'RelatedPerson' }),
    /requires resourceType=Bundle/,
  );
});
