/**
 * Teaching goal:
 * - common-utils authors one permission Bundle with typed Consent entries
 * - sdk-core attaches the completed Bundle to one claims-first Communication
 * - the outbox freezes intent without choosing FHIR/DIDComm transport yet
 *
 * Fixtures come from common-utils. Runtime submit/poll is taught in Node/Front,
 * and low-level `upsert*` compatibility helpers are outside this 101.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BundleEditableResourceTypes,
  BundleEditor,
  BundleOperations,
  BundleTypes,
  ConsentDecisions,
} from '../../gdc-common-utils-ts/dist/index.js';
import { HealthcareBasicSections, HealthcareConsentPurposes } from '../../gdc-common-utils-ts/dist/constants/healthcare.js';
import {
  EXAMPLE_CONSENT_DATE,
  EXAMPLE_CONSENT_PERIOD_END,
  EXAMPLE_CONSENT_PERIOD_START,
  EXAMPLE_CONSENT_UUID,
  EXAMPLE_EMAIL_PROFESSIONAL,
  EXAMPLE_PROFESSIONAL_DID,
  EXAMPLE_SUBJECT_DID,
  EXAMPLE_TENANT_SERVICE_DID,
} from '../../gdc-common-utils-ts/dist/examples/shared.js';

import {
  CommunicationOutboxStatuses,
  attachBundleToCommMsgExtendedDraft,
  createCommMsgExtendedDraft,
  createCommunicationOutboxJobFromCommMsgExtendedDraft,
} from '../dist/index.js';

test('101: a completed permission Bundle becomes one claims-first Communication outbox job', () => {
  // Step 1. The permission screen edits semantic Consent entries in one Bundle.
  const permissionBundleEditor = new BundleEditor()
    .setBundleOperation(BundleOperations.create)
    .setBundleType(BundleTypes.batch)
    .setAllowedResourceType(BundleEditableResourceTypes.consent);

  permissionBundleEditor
    .newEntryAs(BundleEditableResourceTypes.consent)
    .setIdentifier(EXAMPLE_CONSENT_UUID)
    .setSubject(EXAMPLE_SUBJECT_DID)
    .setDecision(ConsentDecisions.Permit)
    .setDate(EXAMPLE_CONSENT_DATE)
    .setPeriodStart(EXAMPLE_CONSENT_PERIOD_START)
    .setPeriodEnd(EXAMPLE_CONSENT_PERIOD_END)
    .setPurposeList([HealthcareConsentPurposes.Treatment])
    .setActorIdentifierList([EXAMPLE_EMAIL_PROFESSIONAL])
    .setSectionList([
      HealthcareBasicSections.HistoryOfMedicationUse.attributeValue,
      HealthcareBasicSections.Results.attributeValue,
    ])
    .doneEntry();

  const permissionBundle = permissionBundleEditor.buildJsonApi();

  // Step 2. sdk-core creates the delivery Communication after authoring ends.
  let draft = createCommMsgExtendedDraft({
    subject: EXAMPLE_SUBJECT_DID,
    sender: EXAMPLE_PROFESSIONAL_DID,
    recipient: EXAMPLE_TENANT_SERVICE_DID,
  });
  draft = attachBundleToCommMsgExtendedDraft(draft, permissionBundle, {
    attachmentTitle: 'permissions.json',
  });

  // Step 3. Freeze one transport-neutral outbox job.
  const job = createCommunicationOutboxJobFromCommMsgExtendedDraft(draft);

  // Step 4. The canonical payload stays claims-first and has no envelope.
  assert.equal(permissionBundle.data.length, 1);
  assert.equal(job.status, CommunicationOutboxStatuses.Ready);
  assert.equal(job.payload.body.data.length, 1);
  assert.equal(job.envelope, undefined);
});
