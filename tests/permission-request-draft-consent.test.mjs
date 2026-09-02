/**
 * Flow contract:
 * 1. a professional identifies the permissions missing for one subject;
 * 2. sdk-core authors the request as a normal FHIR-like Consent in `draft` state;
 * 3. the draft Consent travels inside the auditable Communication payload;
 * 4. no invented resource or `AccessRequest.*` claim participates in the flow.
 *
 * Authorization invariant: a draft request never grants access; only a later
 * controller-authored active Consent can authorize a SMART request.
 * Persistence invariant: the stable Communication and Consent identifiers are
 * preserved in the attached Bundle for inbox review and audit.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HealthcareActorRoles,
  HealthcareBasicSections,
  HealthcareConsentPurposes,
} from 'gdc-common-utils-ts/constants/healthcare';
import {
  EXAMPLE_COMMUNICATION_UUID,
  EXAMPLE_CONSENT_IDENTIFIER,
  EXAMPLE_EMAIL_PROFESSIONAL,
  EXAMPLE_SUBJECT_DID,
} from 'gdc-common-utils-ts/examples/shared';
import {
  ClaimConsent,
  ConsentStatuses,
} from 'gdc-common-utils-ts/models/consent-rule';

import { buildPermissionRequestCommunication } from '../dist/index.js';

test('permission request is one Communication carrying a draft Consent Bundle', () => {
  const communication = buildPermissionRequestCommunication({
    subject: EXAMPLE_SUBJECT_DID,
    requester: { actorKind: 'professional', email: EXAMPLE_EMAIL_PROFESSIONAL },
    requesterRole: HealthcareActorRoles.NursingProfessional,
    purpose: HealthcareConsentPurposes.Treatment,
    missing: {
      sections: [HealthcareBasicSections.PatientSummaryDocument.attributeValue],
      resourceTypes: [],
      pairs: [],
    },
    communicationIdentifier: EXAMPLE_COMMUNICATION_UUID,
    consentIdentifier: EXAMPLE_CONSENT_IDENTIFIER,
    sender: EXAMPLE_EMAIL_PROFESSIONAL,
    recipient: EXAMPLE_SUBJECT_DID,
  });

  const serialized = JSON.stringify(communication);
  assert.equal(serialized.includes('AccessRequest.'), false);
  assert.equal(communication.claims['@context'], 'org.hl7.fhir.api');
  assert.equal(communication.claims['Communication.identifier'], EXAMPLE_COMMUNICATION_UUID);
  assert.equal(communication.payload.resourceType, 'Bundle');
  assert.equal(communication.payload.type, 'batch');
  assert.equal(communication.payload.data.length, 1);

  const consent = communication.payload.data[0].resource;
  assert.equal(consent.resourceType, 'Consent');
  assert.equal(consent.id, EXAMPLE_CONSENT_IDENTIFIER);
  assert.equal(consent.status, ConsentStatuses.Draft);
  assert.equal(consent.meta.claims[ClaimConsent.status], ConsentStatuses.Draft);
  assert.equal(consent.meta.claims[ClaimConsent.subject], EXAMPLE_SUBJECT_DID);
  assert.equal(consent.meta.claims[ClaimConsent.actorIdentifier], EXAMPLE_EMAIL_PROFESSIONAL);
  assert.equal(consent.meta.claims[ClaimConsent.actorRole], HealthcareActorRoles.NursingProfessional);
  assert.equal(consent.meta.claims[ClaimConsent.purpose], HealthcareConsentPurposes.Treatment);
});
