import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HealthcareActorRoles,
  HealthcareBasicSections,
  HealthcareConsentPurposes,
} from '../../gdc-common-utils-ts/dist/constants/healthcare.js';
import {
  EXAMPLE_COMMUNICATION_IDENTIFIER,
  EXAMPLE_INDEX_PROVIDER_SECTOR_DID_WEB,
  EXAMPLE_PROFESSIONAL_DID,
  EXAMPLE_SUBJECT_DID,
} from '../../gdc-common-utils-ts/dist/examples/shared.js';
import { ClaimConsent } from '../../gdc-common-utils-ts/dist/models/consent-rule.js';
import { CommunicationClaim } from '../../gdc-common-utils-ts/dist/models/interoperable-claims/communication-claims.js';

import {
  ConsentCommunicationOperationKinds,
  ConsentCommunicationTargetKinds,
  buildConsentOperationClaims,
  buildConsentOperationsCommunicationInput,
  getPurposes,
  setPurposes,
  setRoles,
  setSections,
} from '../dist/index.js';

const EXAMPLE_CONSENT_OPERATION_IDENTIFIER = 'consent-operation-example-001';
const EXAMPLE_CONSENT_OPERATION_THREAD_ID = 'thread-consent-example-001';

test('101: consent claims and Communication operations step by step', () => {
  // Step 1.
  // Frontend/runtime already knows:
  // - which individual the consent belongs to
  // - which professional/actor is being granted access
  const subjectDid = EXAMPLE_SUBJECT_DID;
  const professionalDid = EXAMPLE_PROFESSIONAL_DID;
  const requestedSections = [
    HealthcareBasicSections.HistoryOfMedicationUse.attributeValue,
    HealthcareBasicSections.Results.attributeValue,
  ];

  // Step 2.
  // If frontend only wants to build/edit one consent, start with claim helpers.
  let consentClaims = {
    '@context': 'org.hl7.fhir.api',
    [ClaimConsent.identifier]: EXAMPLE_CONSENT_OPERATION_IDENTIFIER,
    [ClaimConsent.subject]: subjectDid,
  };

  consentClaims = setPurposes(consentClaims, [HealthcareConsentPurposes.Treatment]);
  consentClaims = setRoles(consentClaims, [HealthcareActorRoles.Physician]);
  consentClaims = setSections(consentClaims, requestedSections);

  // Step 3.
  // When the portal/backend must send a consent operation through Communication,
  // build the canonical abstract operation from the same subject/actor/sections.
  const operation = {
    operationKind: ConsentCommunicationOperationKinds.Add,
    operationId: EXAMPLE_CONSENT_OPERATION_IDENTIFIER,
    subject: subjectDid,
    purpose: HealthcareConsentPurposes.Treatment,
    target: {
      kind: ConsentCommunicationTargetKinds.Professional,
      identifier: professionalDid,
      roles: [HealthcareActorRoles.Physician],
    },
    sections: {
      core: requestedSections,
    },
  };

  // Step 4.
  // The SDK converts that abstract operation into canonical consent claims.
  const operationClaims = buildConsentOperationClaims(operation);

  // Step 5.
  // The SDK then wraps one or more operations into the canonical CommunicationInput
  // envelope that later runtime layers can place in drafts/outbox and submit.
  const communicationInput = buildConsentOperationsCommunicationInput({
    thid: EXAMPLE_CONSENT_OPERATION_THREAD_ID,
    subject: subjectDid,
    sender: professionalDid,
    recipient: EXAMPLE_INDEX_PROVIDER_SECTOR_DID_WEB,
    communicationIdentifier: EXAMPLE_COMMUNICATION_IDENTIFIER,
    operations: [operation],
  });

  // Step 6.
  // Assertions: claim helpers, operation claims, and Communication envelope
  // all carry the same semantic consent request.
  assert.deepEqual(getPurposes(consentClaims), [HealthcareConsentPurposes.Treatment]);
  assert.equal(
    consentClaims[ClaimConsent.action],
    requestedSections.join(','),
  );
  assert.equal(operationClaims[ClaimConsent.subject], subjectDid);
  assert.equal(operationClaims[ClaimConsent.purpose], HealthcareConsentPurposes.Treatment);
  assert.equal(operationClaims[ClaimConsent.action], requestedSections.join(','));
  assert.equal(communicationInput.thid, EXAMPLE_CONSENT_OPERATION_THREAD_ID);
  assert.equal(communicationInput.subject, subjectDid);
  assert.equal(communicationInput.claims[CommunicationClaim.Subject], subjectDid);
  assert.ok(Array.isArray(communicationInput.payload.operations));
  assert.equal(communicationInput.payload.operations.length, 1);
  assert.equal(
    communicationInput.payload.operations[0].operationId,
    EXAMPLE_CONSENT_OPERATION_IDENTIFIER,
  );
});
