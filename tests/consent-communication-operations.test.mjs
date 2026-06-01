import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HealthcareActorRoles,
  HealthcareBasicSections,
  HealthcareConsentPurposes,
} from 'gdc-common-utils-ts/constants/healthcare';
import { ClaimConsent } from 'gdc-common-utils-ts/models/consent-rule';
import { CommunicationClaim } from 'gdc-common-utils-ts/models/interoperable-claims/communication-claims';

import {
  ConsentCommunicationOperationKinds,
  ConsentCommunicationTargetKinds,
  addConsentOperationToDraft,
  buildConsentOperationClaims,
  buildConsentOperationsCommunicationInput,
  createCommunicationDraft,
} from '../dist/index.js';

test('buildConsentOperationClaims maps abstract operation input into claim rows', () => {
  const claims = buildConsentOperationClaims({
    operationKind: ConsentCommunicationOperationKinds.Add,
    operationId: 'op-add-001',
    subject: 'did:web:api.acme.org:individual:123',
    purpose: HealthcareConsentPurposes.Treatment,
    target: {
      kind: ConsentCommunicationTargetKinds.Organization,
      identifier: 'did:web:hospital.example.org',
      roles: [HealthcareActorRoles.Physician, HealthcareActorRoles.NursingProfessional],
    },
    sections: {
      core: [HealthcareBasicSections.AllergiesAndIntolerances.claim, HealthcareBasicSections.ProblemList.claim],
      extended: [HealthcareBasicSections.HistoryOfMedicationUse.claim],
    },
    codeDisplay: 'Patient summary consent',
    sourcePortalUrl: 'https://portal.example.org/consents/123',
  });

  assert.equal(claims[ClaimConsent.subject], 'did:web:api.acme.org:individual:123');
  assert.equal(claims[ClaimConsent.purpose], HealthcareConsentPurposes.Treatment);
  assert.equal(
    claims[ClaimConsent.action],
    [
      HealthcareBasicSections.AllergiesAndIntolerances.claim,
      HealthcareBasicSections.ProblemList.claim,
      HealthcareBasicSections.HistoryOfMedicationUse.claim,
    ].join(','),
  );
});

test('addConsentOperationToDraft appends a consent claims payload entry', () => {
  const draft = createCommunicationDraft({
    subject: 'did:web:api.acme.org:individual:123',
    noteText: 'Consent draft',
  });

  const next = addConsentOperationToDraft(draft, {
    operationKind: ConsentCommunicationOperationKinds.Disable,
    operationId: 'op-disable-001',
    subject: 'did:web:api.acme.org:individual:123',
    purpose: HealthcareConsentPurposes.Treatment,
    target: {
      kind: ConsentCommunicationTargetKinds.Professional,
      identifier: 'doctor@example.org',
      roles: [HealthcareActorRoles.Physician],
    },
    sections: {
      core: [HealthcareBasicSections.AllergiesAndIntolerances.claim],
    },
    noteText: 'Disable direct professional access',
  });

  assert.ok(Array.isArray(next.communication.payload));
  assert.equal(next.communication.payload.length, 1);

  const payload = next.communication.payload[0];
  assert.equal(typeof payload?.contentAttachment?.data, 'string');
  assert.equal(payload?.contentAttachment?.title, 'consent.json');
});

test('buildConsentOperationsCommunicationInput creates a workflow envelope', () => {
  const input = buildConsentOperationsCommunicationInput({
    thid: 'thread-consent-ops-001',
    subject: 'did:web:api.acme.org:individual:123',
    sender: 'did:web:portal.example.org:service',
    recipient: 'did:web:index.example.org:operator',
    operations: [
      {
        operationKind: ConsentCommunicationOperationKinds.Add,
        operationId: 'op-add-001',
        subject: 'did:web:api.acme.org:individual:123',
        purpose: HealthcareConsentPurposes.Treatment,
        target: {
          kind: ConsentCommunicationTargetKinds.Organization,
          identifier: 'did:web:hospital.example.org',
          roles: [HealthcareActorRoles.Physician, HealthcareActorRoles.NursingProfessional],
        },
        sections: {
          core: [HealthcareBasicSections.AllergiesAndIntolerances.claim],
          extended: [HealthcareBasicSections.Results.claim],
        },
      },
      {
        operationKind: ConsentCommunicationOperationKinds.Enable,
        operationId: 'op-enable-001',
        subject: 'did:web:api.acme.org:individual:123',
        purpose: HealthcareConsentPurposes.Treatment,
        target: {
          kind: ConsentCommunicationTargetKinds.Professional,
          identifier: 'doctor@example.org',
          roles: [HealthcareActorRoles.Physician],
        },
        sections: {
          core: [HealthcareBasicSections.AllergiesAndIntolerances.claim],
        },
      },
    ],
  });

  assert.equal(input.subject, 'did:web:api.acme.org:individual:123');
  assert.equal(input.text, 'Consent operations (2) for subject did:web:api.acme.org:individual:123');
  assert.equal(input.claims[CommunicationClaim.Subject], 'did:web:api.acme.org:individual:123');
  assert.equal(input.claims[CommunicationClaim.Category], 'consent-management');
  assert.ok(Array.isArray(input.payload.operations));
});
