# Resource Claims 101

This guide shows the simple `sdk-core` facade layer for flat FHIR claims.

Use these classes when developers or AI agents want:

- discoverable methods
- fluent chaining
- no duplication of claim logic

The classes below are thin wrappers over the canonical helpers in
`gdc-common-utils-ts`.

Executable reference:

- [tests/101-resource-claims.test.mjs](../tests/101-resource-claims.test.mjs)
- [gdc-common-utils-ts/docs/CONSENT_ACCESS_101.md](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/CONSENT_ACCESS_101.md)
- [gdc-common-utils-ts/docs/MEDICATION_STATEMENT_CLAIMS_101.md](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/MEDICATION_STATEMENT_CLAIMS_101.md)
- [gdc-common-utils-ts/docs/HEALTHCARE_ROLES_I18N_101.md](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/docs/HEALTHCARE_ROLES_I18N_101.md)
- [gdc-common-utils-ts/__tests__/101-consent-bundle-editor.test.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/__tests__/101-consent-bundle-editor.test.ts)
- [gdc-common-utils-ts/__tests__/101-medication-claim-helpers.test.ts](https://github.com/Global-DataCare/gdc-common-utils-ts/blob/main/__tests__/101-medication-claim-helpers.test.ts)

## Communication

```ts
import { CommunicationClaims } from 'gdc-sdk-core-ts';
import { CommunicationCategoryCodes } from 'gdc-common-utils-ts/constants/communication';

const communicationClaims = CommunicationClaims.create()
  .setIdentifier(EXAMPLE_COMMUNICATION_UUID)
  .setSubject(EXAMPLE_SUBJECT_DID)
  .setCategoryList([CommunicationCategoryCodes.Notification.attributeValue])
  .toClaims();
```

## Consent

```ts
import { ConsentClaims } from 'gdc-sdk-core-ts';
import { ConsentDecisions } from 'gdc-common-utils-ts/models/consent-rule';

const consentClaims = ConsentClaims.create()
  .setIdentifier(EXAMPLE_CONSENT_UUID)
  .setSubject(EXAMPLE_SUBJECT_DID)
  .setDecision(ConsentDecisions.Permit)
  // There is no separate ActorReference helper in this flat-claims API.
  // The target actor goes in actorIdentifierList.
  .setActorIdentifierList([EXAMPLE_EMAIL_PROFESSIONAL])
  .setPurposeList([HealthcareConsentPurposes.Treatment])
  .setActorRoleList([HealthcareActorRoles.GeneralistMedicalPractitioner])
  .setSectionList([HealthcareBasicSections.HistoryOfMedicationUse.attributeValue])
  .addSectionList([HealthcareBasicSections.Results.attributeValue])
  .toClaims();
```

This example means:

- one practitioner identified by email
- that practitioner target is stored in `actorIdentifierList`
- role: `HealthcareActorRoles.GeneralistMedicalPractitioner` (`ISCO-08|2211`)
- purpose: treatment
- sections: medication history and results

The same class can also express:

- one organization target:
  `.setActorIdentifierList([EXAMPLE_PROVIDER_ORGANIZATION_DID])`
- multiple professional roles:
  `.setActorRoleList([HealthcareActorRoles.GeneralistMedicalPractitioner, HealthcareActorRoles.SpecialistMedicalPractitioner, HealthcareActorRoles.NursingProfessional])`
- jurisdiction-scoped access:
  `.setActorIdentifierList([EXAMPLE_HEALTHCARE_JURISDICTION])`
- emergency access:
  `.setPurposeList([HealthcareConsentPurposes.EmergencyTreatment])`
- paramedic access:
  `.setActorRoleList([HealthcareActorRoles.Paramedic])`

The current SDK doctor roles now follow ISCO more closely:

- `HealthcareActorRoles.MedicalDoctors` = `ISCO-08|221`
- `HealthcareActorRoles.GeneralistMedicalPractitioner` = `ISCO-08|2211`
- `HealthcareActorRoles.SpecialistMedicalPractitioner` = `ISCO-08|2212`

`HealthcareActorRoles.Physician` is kept only as a legacy compatibility alias
for `GeneralistMedicalPractitioner`.

## MedicationStatement

```ts
import { MedicationStatementClaims } from 'gdc-sdk-core-ts';

// Human meaning:
// - Ibuprofen 400 mg
// - 1 dose every 8 hours
// - as needed (PRN)
// - plain-language note:
//   "Take every 8 hours as needed. Keep a 4 hour gap from paracetamol."

const medicationClaims = MedicationStatementClaims.create()
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
```

## Architecture Rule

These classes do not replace `common-utils`.

- `gdc-common-utils-ts`
  is still the source of truth for claim semantics
- `gdc-sdk-core-ts`
  provides a thinner, more discoverable facade for apps, portals, and AI agents
- `bundleEditor`
  can consume the resulting `toClaims()` output directly
