import test from 'node:test';
import assert from 'node:assert/strict';

import { CommunicationCategoryCodes } from '../../gdc-common-utils-ts/dist/constants/communication.js';
import { HealthcareActorRoles, HealthcareBasicSections, HealthcareConsentPurposes } from '../../gdc-common-utils-ts/dist/constants/healthcare.js';
import {
  EXAMPLE_COMMUNICATION_UUID,
  EXAMPLE_CONSENT_UUID,
  EXAMPLE_CONSENT_DATE,
  EXAMPLE_CONSENT_PERIOD_START,
  EXAMPLE_CONSENT_PERIOD_END,
  EXAMPLE_EMAIL_PROFESSIONAL,
  EXAMPLE_PROVIDER_ORGANIZATION_DID,
  EXAMPLE_HEALTHCARE_JURISDICTION,
  EXAMPLE_MEDICATION_IBUPROFEN_EFFECTIVE,
  EXAMPLE_MEDICATION_STATEMENT_STATUS,
  EXAMPLE_MEDICATION_STATEMENT_UUID,
  EXAMPLE_MEDICATION_IBUPROFEN_TEXT,
  EXAMPLE_MEDICATION_DOSE_UNIT_MG,
  EXAMPLE_MEDICATION_IBUPROFEN_NOTE,
  EXAMPLE_MEDICATION_TIMING_PERIOD_UNIT_HOURS,
  EXAMPLE_SUBJECT_DID,
} from '../../gdc-common-utils-ts/dist/examples/shared.js';
import { ClaimConsent, ConsentDecisions } from '../../gdc-common-utils-ts/dist/models/consent-rule.js';
import { CommunicationClaim } from '../../gdc-common-utils-ts/dist/models/interoperable-claims/communication-claims.js';
import {
  MedicationStatementClaim,
  MedicationStatementClaimsFhirApiExtended,
} from '../../gdc-common-utils-ts/dist/models/interoperable-claims/medication-statement-claims.js';

import {
  CommunicationClaims,
  ConsentClaims,
  MedicationStatementClaims,
  removeActorIdentifierList,
  removeActorRoleList,
  removePurposeList,
  removeSectionList,
} from '../dist/index.js';

test('101: sdk-core resource claim classes stay thin and discoverable', () => {
  const communicationClaims = CommunicationClaims.create()
    .setIdentifier(EXAMPLE_COMMUNICATION_UUID)
    .setSubject(EXAMPLE_SUBJECT_DID)
    .setCategoryList([CommunicationCategoryCodes.Notification.attributeValue])
    .toClaims();

  const consentClaims = ConsentClaims.create()
    // Human meaning:
    // - permit one practitioner identified by email
    // - there is no separate ActorReference helper here:
    //   the target actor goes in actorIdentifierList
    // - role: Generalist medical practitioner (ISCO-08|2211)
    // - purpose: treatment
    // - sections: medication history + results
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

  const medicationClaims = MedicationStatementClaims.create()
    // Human meaning:
    // - Ibuprofen 400 mg
    // - 1 dose every 8 hours
    // - as needed (PRN)
    // - see the note text for the plain-language instruction
    .setIdentifier(EXAMPLE_MEDICATION_STATEMENT_UUID)
    .setSubject(EXAMPLE_SUBJECT_DID)
    .setStatus(EXAMPLE_MEDICATION_STATEMENT_STATUS)
    .setEffective(EXAMPLE_MEDICATION_IBUPROFEN_EFFECTIVE)
    .setText(EXAMPLE_MEDICATION_IBUPROFEN_TEXT)
    .setDoseQuantityValue(400)
    .setDoseQuantityUnit(EXAMPLE_MEDICATION_DOSE_UNIT_MG)
    .setTimingFrequency(1)
    .setTimingPeriod(8)
    .setTimingPeriodUnit(EXAMPLE_MEDICATION_TIMING_PERIOD_UNIT_HOURS)
    .setDosageAsNeeded(true)
    .toClaims();

  assert.equal(communicationClaims[CommunicationClaim.Identifier], EXAMPLE_COMMUNICATION_UUID);
  assert.equal(consentClaims[ClaimConsent.identifier], EXAMPLE_CONSENT_UUID);
  assert.equal(consentClaims[ClaimConsent.actorIdentifier], EXAMPLE_EMAIL_PROFESSIONAL);
  assert.equal(consentClaims[ClaimConsent.actorRole], HealthcareActorRoles.GeneralistMedicalPractitioner);
  assert.equal(consentClaims[ClaimConsent.purpose], HealthcareConsentPurposes.Treatment);
  assert.equal(
    consentClaims[ClaimConsent.action],
    [
      HealthcareBasicSections.HistoryOfMedicationUse.attributeValue,
      HealthcareBasicSections.Results.attributeValue,
    ].join(','),
  );
  assert.equal(medicationClaims[MedicationStatementClaim.MedicationText], EXAMPLE_MEDICATION_IBUPROFEN_TEXT);
  assert.equal(medicationClaims[MedicationStatementClaimsFhirApiExtended.DoseQuantityValue], 400);
  assert.equal(EXAMPLE_MEDICATION_IBUPROFEN_NOTE, 'Take every 8 hours as needed. Keep a 4 hour gap from paracetamol.');

  const organizationConsentClaims = ConsentClaims.create()
    .setActorIdentifierList([EXAMPLE_PROVIDER_ORGANIZATION_DID])
    .setActorRoleList([
      HealthcareActorRoles.GeneralistMedicalPractitioner,
      HealthcareActorRoles.SpecialistMedicalPractitioner,
      HealthcareActorRoles.NursingProfessional,
    ])
    .toClaims();
  assert.equal(
    organizationConsentClaims[ClaimConsent.actorIdentifier],
    EXAMPLE_PROVIDER_ORGANIZATION_DID,
  );
  assert.equal(
    organizationConsentClaims[ClaimConsent.actorRole],
    [
      HealthcareActorRoles.GeneralistMedicalPractitioner,
      HealthcareActorRoles.SpecialistMedicalPractitioner,
      HealthcareActorRoles.NursingProfessional,
    ].join(','),
  );

  const jurisdictionEmergencyConsentClaims = ConsentClaims.create()
    .setActorIdentifierList([EXAMPLE_HEALTHCARE_JURISDICTION])
    .setActorRoleList([
      HealthcareActorRoles.GeneralistMedicalPractitioner,
      HealthcareActorRoles.SpecialistMedicalPractitioner,
      HealthcareActorRoles.NursingProfessional,
      HealthcareActorRoles.Paramedic,
    ])
    .setPurposeList([HealthcareConsentPurposes.EmergencyTreatment])
    .toClaims();
  assert.equal(
    jurisdictionEmergencyConsentClaims[ClaimConsent.actorIdentifier],
    EXAMPLE_HEALTHCARE_JURISDICTION,
  );
  assert.equal(
    jurisdictionEmergencyConsentClaims[ClaimConsent.purpose],
    HealthcareConsentPurposes.EmergencyTreatment,
  );

  const reducedConsentClaims = ConsentClaims.create()
    .setActorIdentifierList([
      EXAMPLE_EMAIL_PROFESSIONAL,
      EXAMPLE_PROVIDER_ORGANIZATION_DID,
    ])
    .setActorRoleList([
      HealthcareActorRoles.GeneralistMedicalPractitioner,
      HealthcareActorRoles.NursingProfessional,
    ])
    .setPurposeList([
      HealthcareConsentPurposes.Treatment,
      HealthcareConsentPurposes.EmergencyTreatment,
    ])
    .setSectionList([
      HealthcareBasicSections.HistoryOfMedicationUse.attributeValue,
      HealthcareBasicSections.Results.attributeValue,
    ])
    .removeActorIdentifierList([EXAMPLE_PROVIDER_ORGANIZATION_DID])
    .removeActorRoleList([HealthcareActorRoles.NursingProfessional])
    .removePurposeList([HealthcareConsentPurposes.EmergencyTreatment])
    .removeSectionList([HealthcareBasicSections.Results.attributeValue])
    .toClaims();

  assert.equal(
    reducedConsentClaims[ClaimConsent.actorIdentifier],
    EXAMPLE_EMAIL_PROFESSIONAL,
  );
  assert.equal(
    reducedConsentClaims[ClaimConsent.actorRole],
    HealthcareActorRoles.GeneralistMedicalPractitioner,
  );
  assert.equal(
    reducedConsentClaims[ClaimConsent.purpose],
    HealthcareConsentPurposes.Treatment,
  );
  assert.equal(
    reducedConsentClaims[ClaimConsent.action],
    HealthcareBasicSections.HistoryOfMedicationUse.attributeValue,
  );

  const helperReducedConsentClaims = removeSectionList(
    removePurposeList(
      removeActorRoleList(
        removeActorIdentifierList(
          {
            '@context': 'org.hl7.fhir.api',
            [ClaimConsent.actorIdentifier]: [
              EXAMPLE_EMAIL_PROFESSIONAL,
              EXAMPLE_PROVIDER_ORGANIZATION_DID,
            ].join(','),
            [ClaimConsent.actorRole]: [
              HealthcareActorRoles.GeneralistMedicalPractitioner,
              HealthcareActorRoles.NursingProfessional,
            ].join(','),
            [ClaimConsent.purpose]: [
              HealthcareConsentPurposes.Treatment,
              HealthcareConsentPurposes.EmergencyTreatment,
            ].join(','),
            [ClaimConsent.action]: [
              HealthcareBasicSections.HistoryOfMedicationUse.attributeValue,
              HealthcareBasicSections.Results.attributeValue,
            ].join(','),
          },
          [EXAMPLE_PROVIDER_ORGANIZATION_DID],
        ),
        [HealthcareActorRoles.NursingProfessional],
      ),
      [HealthcareConsentPurposes.EmergencyTreatment],
    ),
    [HealthcareBasicSections.Results.attributeValue],
  );

  assert.equal(helperReducedConsentClaims[ClaimConsent.actorIdentifier], EXAMPLE_EMAIL_PROFESSIONAL);
  assert.equal(helperReducedConsentClaims[ClaimConsent.actorRole], HealthcareActorRoles.GeneralistMedicalPractitioner);
  assert.equal(helperReducedConsentClaims[ClaimConsent.purpose], HealthcareConsentPurposes.Treatment);
  assert.equal(
    helperReducedConsentClaims[ClaimConsent.action],
    HealthcareBasicSections.HistoryOfMedicationUse.attributeValue,
  );
});
