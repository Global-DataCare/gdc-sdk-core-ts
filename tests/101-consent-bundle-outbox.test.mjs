import test from 'node:test';
import assert from 'node:assert/strict';

import { CommunicationCategoryCodes } from '../../gdc-common-utils-ts/dist/constants/communication.js';
import { ResourceTypesFhirR4 } from '../../gdc-common-utils-ts/dist/constants/fhir-resource-types.js';
import { HealthcareActorRoles, HealthcareBasicSections, HealthcareConsentPurposes } from '../../gdc-common-utils-ts/dist/constants/healthcare.js';
import {
  EXAMPLE_COMMUNICATION_UUID,
  EXAMPLE_CONSENT_DATE,
  EXAMPLE_CONSENT_UUID,
  EXAMPLE_CONSENT_PERIOD_END,
  EXAMPLE_CONSENT_PERIOD_START,
  EXAMPLE_EMAIL_PROFESSIONAL,
  EXAMPLE_PROFESSIONAL_DID,
  EXAMPLE_SUBJECT_DID,
} from '../../gdc-common-utils-ts/dist/examples/shared.js';
import { ConsentDecisions } from '../../gdc-common-utils-ts/dist/models/consent-rule.js';
import { CommunicationClaim } from '../../gdc-common-utils-ts/dist/models/interoperable-claims/communication-claims.js';
import { CommunicationBundleSession } from '../../gdc-common-utils-ts/dist/utils/communication-bundle-session.js';

import {
  CommunicationClaims,
  ConsentClaims,
  CommunicationOutboxStatuses,
  addClaimsResourceToDraft,
  createCommunicationDraft,
  createOutboxJobFromDraft,
  isCommunicationDraftReady,
} from '../dist/index.js';

test('101: consent bundle Communication goes into draft and outbox step by step', () => {
  // Step 1.
  // Build the Communication wrapper and the Consent claims through the sdk-core
  // fluent facade classes.
  const communicationClaimsBase = CommunicationClaims.create()
    .setIdentifier(EXAMPLE_COMMUNICATION_UUID)
    .setSubject(EXAMPLE_SUBJECT_DID)
    .setCategoryList([CommunicationCategoryCodes.Notification.attributeValue])
    .toClaims();

  const bundleEditor = new CommunicationBundleSession({
    communicationClaims: communicationClaimsBase,
  });

  const consentClaims = ConsentClaims.create()
    .setIdentifier(EXAMPLE_CONSENT_UUID)
    .setSubject(EXAMPLE_SUBJECT_DID)
    .setDecision(ConsentDecisions.Permit)
    .setDate(EXAMPLE_CONSENT_DATE)
    .setPeriodStart(EXAMPLE_CONSENT_PERIOD_START)
    .setPeriodEnd(EXAMPLE_CONSENT_PERIOD_END)
    .setPurposeList([HealthcareConsentPurposes.Treatment])
    .setActorIdentifierList([EXAMPLE_EMAIL_PROFESSIONAL])
    .setActorRoleList([HealthcareActorRoles.GeneralistMedicalPractitioner])
    .setSectionList([HealthcareBasicSections.HistoryOfMedicationUse.attributeValue])
    .addSectionList([HealthcareBasicSections.Results.attributeValue])
    .toClaims();

  bundleEditor.upsertActiveConsentEntry({
    claims: consentClaims,
    fullUrl: `urn:uuid:${EXAMPLE_CONSENT_UUID}`,
  });
  bundleEditor.saveAndReleaseActiveEntry();

  // Step 2.
  // sdk-core receives that already-authored Communication and places it in a draft.
  const communicationClaims = bundleEditor.getCommunicationClaims();
  const draft = addClaimsResourceToDraft(
    createCommunicationDraft({
      subject: EXAMPLE_SUBJECT_DID,
      sender: EXAMPLE_PROFESSIONAL_DID,
      claims: communicationClaims,
    }),
    ResourceTypesFhirR4.Communication,
    communicationClaims,
  );

  // Step 3.
  // Freeze the draft into the outbox job that runtime layers will actually use.
  const job = createOutboxJobFromDraft(draft);

  // Step 4.
  // Assertions: sdk-core does not reinterpret the consent model. It just carries
  // the already-built Communication into the outbox job.
  assert.equal(isCommunicationDraftReady(draft), true);
  assert.equal(job.status, CommunicationOutboxStatuses.Ready);
  assert.equal(job.payload.resourceType, ResourceTypesFhirR4.Communication);
  assert.equal(job.payload.meta?.claims?.[CommunicationClaim.ContentAttachmentData] !== undefined, true);
});
