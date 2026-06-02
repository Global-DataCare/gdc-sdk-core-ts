import test from 'node:test';
import assert from 'node:assert/strict';

import { CommunicationCategoryCodes } from '../../gdc-common-utils-ts/dist/constants/communication.js';
import { ResourceTypesFhirR4 } from '../../gdc-common-utils-ts/dist/constants/fhir-resource-types.js';
import { HealthcareActorRoles, HealthcareBasicSections, HealthcareConsentPurposes } from '../../gdc-common-utils-ts/dist/constants/healthcare.js';
import {
  EXAMPLE_COMMUNICATION_IDENTIFIER,
  EXAMPLE_CONSENT_IDENTIFIER,
  EXAMPLE_PROFESSIONAL_DID,
  EXAMPLE_SUBJECT_DID,
} from '../../gdc-common-utils-ts/dist/examples/shared.js';
import { ClaimConsent } from '../../gdc-common-utils-ts/dist/models/consent-rule.js';
import { CommunicationClaim } from '../../gdc-common-utils-ts/dist/models/interoperable-claims/communication-claims.js';
import {
  addSections,
  setPurposes,
  setRoles,
  setSections,
} from '../../gdc-common-utils-ts/dist/utils/consent-claim-helpers.js';
import { CommunicationBundleSession } from '../../gdc-common-utils-ts/dist/utils/communication-bundle-session.js';

import {
  CommunicationOutboxStatuses,
  addClaimsResourceToDraft,
  createCommunicationDraft,
  createOutboxJobFromDraft,
  getCommunicationFromDraft,
  isCommunicationDraftReady,
  resolveCommunicationPayloads,
} from '../dist/index.js';

test('101: consent bundle Communication goes into draft and outbox step by step', () => {
  // Step 1.
  // Build or edit the real Consent resource inside a Communication-attached bundle.
  const bundleEditor = new CommunicationBundleSession({
    communicationClaims: {
      '@context': 'org.hl7.fhir.r4',
      [CommunicationClaim.Identifier]: EXAMPLE_COMMUNICATION_IDENTIFIER,
      [CommunicationClaim.Subject]: EXAMPLE_SUBJECT_DID,
      [CommunicationClaim.Category]: CommunicationCategoryCodes.Notification.claim,
    },
  });

  bundleEditor.upsertActiveConsentEntry({
    claims: {
      '@context': 'org.hl7.fhir.api',
      [ClaimConsent.identifier]: EXAMPLE_CONSENT_IDENTIFIER,
      [ClaimConsent.subject]: EXAMPLE_SUBJECT_DID,
      [ClaimConsent.decision]: 'permit',
    },
    fullUrl: `urn:uuid:${EXAMPLE_CONSENT_IDENTIFIER}`,
  });

  const activeConsentClaims = {
    ...(bundleEditor.getActiveEntry()?.resource?.meta?.claims || {}),
  };
  let nextConsentClaims = setPurposes(activeConsentClaims, [HealthcareConsentPurposes.Treatment]);
  nextConsentClaims = setRoles(nextConsentClaims, [HealthcareActorRoles.Physician]);
  nextConsentClaims = setSections(nextConsentClaims, [
    HealthcareBasicSections.HistoryOfMedicationUse.attributeValue,
  ]);
  nextConsentClaims = addSections(nextConsentClaims, [
    HealthcareBasicSections.Results.attributeValue,
  ]);
  bundleEditor.patchActiveEntryClaims(nextConsentClaims);
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
  // The draft can then be frozen into an outbox job for submission by runtime layers.
  const draftCommunication = getCommunicationFromDraft(draft);
  const resolvedPayloads = resolveCommunicationPayloads(draftCommunication);
  const embeddedCommunication = resolvedPayloads[0]?.resource;
  const job = createOutboxJobFromDraft(draft);

  // Step 4.
  // Assertions: sdk-core does not reinterpret the consent model. It just carries
  // the already-built Communication through draft/outbox.
  assert.equal(isCommunicationDraftReady(draft), true);
  assert.equal(embeddedCommunication?.resourceType, ResourceTypesFhirR4.Communication);
  assert.equal(
    embeddedCommunication?.meta?.claims?.[CommunicationClaim.ContentAttachmentData] !== undefined,
    true,
  );
  assert.equal(job.status, CommunicationOutboxStatuses.Ready);
  assert.equal(job.payload.resourceType, ResourceTypesFhirR4.Communication);
});
