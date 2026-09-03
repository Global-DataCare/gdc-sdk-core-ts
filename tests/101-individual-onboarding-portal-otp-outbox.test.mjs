/**
 * 101 note:
 * - `gdc-common-utils-ts` owns the canonical individual onboarding authoring editors/readers.
 * - This file starts after that shared authoring step and teaches the highest-level runtime-neutral `sdk-core` onboarding contract.
 * - Do not make concrete wallet/profile transport or submit/poll runtime the main path here.
 * - Read `docs/101-README.md` for the ordered path, then continue upward into `gdc-sdk-node-ts` or `gdc-sdk-front-ts`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildIndividualOnboardingPdfDraftGatewayRequestBundle,
  buildIndividualOrganizationRegistrationGatewayRequestBundle,
  createIndividualOnboardingEditor,
  createIndividualOnboardingGatewaySubmission,
  IndividualOnboardingGatewayOperation,
  resolveIndividualOnboardingGatewayPath,
} from '../dist/index.js';
import {
  buildIndividualOnboardingAcceptanceCredential,
} from 'gdc-common-utils-ts/utils/individual-onboarding-acceptance-credential';
import {
  EXAMPLE_DEMO_PORTAL_ID_TOKEN,
  EXAMPLE_CONTROLLER_DID,
  EXAMPLE_FORM_CONTROLLER_PHONE,
  EXAMPLE_FORM_SUBJECT_IDENTIFIER_VALUE,
  EXAMPLE_FORM_SUBJECT_PHONE,
  EXAMPLE_KYC_CONTROLLER_BIRTHDATE,
  EXAMPLE_KYC_CONTROLLER_FAMILY_NAME,
  EXAMPLE_KYC_CONTROLLER_GENDER_MALE,
  EXAMPLE_KYC_CONTROLLER_GIVEN_NAME,
  EXAMPLE_KYC_CONTROLLER_IDENTIFIER,
  EXAMPLE_KYC_CONTROLLER_TELEPHONE,
  EXAMPLE_LEGAL_ORGANIZATION_TAX_ID,
  EXAMPLE_PDF_CONSENT_DATE,
  EXAMPLE_SERVICE_PROVIDER_DOMAIN,
  EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME,
  EXAMPLE_REGISTERED_SUBJECT_BIRTH_YEAR,
  EXAMPLE_SELF_REGISTERED_INDIVIDUAL_EMAIL_NORMALIZED,
  EXAMPLE_SUBJECT_DID,
  EXAMPLE_TENANT_IDENTIFIER,
  EXAMPLE_TENANT_ROUTE_CONTEXT,
  EXAMPLE_TENANT_SERVICE_DID,
} from 'gdc-common-utils-ts/examples/shared';
import {
  EXAMPLE_ORG_CONTROLLER_SIGNING_KEY_ID,
} from 'gdc-common-utils-ts/examples/ica-activation-proof';
import {
  ClaimsOrganizationSchemaorg,
  ClaimsServiceSchemaorg,
} from 'gdc-common-utils-ts/constants/schemaorg';

const EXAMPLE_KYC_PAYLOAD = Object.freeze({
  profile: {
    first_name: EXAMPLE_KYC_CONTROLLER_GIVEN_NAME,
    last_name: EXAMPLE_KYC_CONTROLLER_FAMILY_NAME,
    id_number: EXAMPLE_KYC_CONTROLLER_IDENTIFIER,
    phone_number: EXAMPLE_KYC_CONTROLLER_TELEPHONE,
    birthdate: EXAMPLE_KYC_CONTROLLER_BIRTHDATE,
    gender: EXAMPLE_KYC_CONTROLLER_GENDER_MALE,
  },
  individualAlternateName: EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME,
  individualBirthDate: EXAMPLE_REGISTERED_SUBJECT_BIRTH_YEAR,
  controllerEmail: EXAMPLE_SELF_REGISTERED_INDIVIDUAL_EMAIL_NORMALIZED,
});

test('101: portal onboarding demo flow submits a signed VC attachment plus minimal claims with id_token', () => {
  // Step 1.
  // The portal already authenticated the controller and owns the id_token used
  // for both GW CORE requests.
  const idToken = EXAMPLE_DEMO_PORTAL_ID_TOKEN;

  // Step 2.
  // KYC pre-fills the controller-facing onboarding fields.
  const onboardingEditor = createIndividualOnboardingEditor()
    .setKyc(EXAMPLE_KYC_PAYLOAD, {
      self: false,
      controllerAlternateName: EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME,
    });

  const kycPrefill = onboardingEditor.getFormFields();

  // Step 3.
  // The controller finishes the missing subject/controller values in the portal
  // wizard before asking GW CORE to render the onboarding PDF draft.
  onboardingEditor
    .setControllerPhone(EXAMPLE_FORM_CONTROLLER_PHONE)
    .setSubjectAlternateName(EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME)
    .setSubjectPhone(EXAMPLE_FORM_SUBJECT_PHONE)
    .setSubjectIdentifier({ value: EXAMPLE_FORM_SUBJECT_IDENTIFIER_VALUE })
    .setSubjectBirthDate(EXAMPLE_REGISTERED_SUBJECT_BIRTH_YEAR)
    .setConsentDate(EXAMPLE_PDF_CONSENT_DATE)
    .setServiceProviderDomain(EXAMPLE_SERVICE_PROVIDER_DOMAIN);
  const completedFields = onboardingEditor.getFormFields();
  const draftClaims = onboardingEditor.buildClaims();

  // Step 4.
  // The frontend/BFF builds the canonical onboarding VC from common-utils and
  // keeps the profile signing material outside the GW request body.
  const onboardingCredential = buildIndividualOnboardingAcceptanceCredential({
    issuerDid: EXAMPLE_CONTROLLER_DID,
    subjectDid: EXAMPLE_CONTROLLER_DID,
    organizationTaxId: EXAMPLE_LEGAL_ORGANIZATION_TAX_ID,
    profileKeyMaterial: EXAMPLE_ORG_CONTROLLER_SIGNING_KEY_ID,
    validFrom: '2026-07-07T00:00:00Z',
    representativeIdentifier: EXAMPLE_FORM_SUBJECT_IDENTIFIER_VALUE,
    representativeRoleCode: 'RESPRSN',
  });

  // Step 5.
  // The front/BFF asks GW CORE to generate the fillable PDF draft.
  const pdfDraftBundle = buildIndividualOnboardingPdfDraftGatewayRequestBundle({
    subjectDid: EXAMPLE_SUBJECT_DID,
    template: {
      sector: 'health-care',
      language: 'es',
      version: 'v1',
      templateUrl: 'https://portal.example.org/templates/individual-onboarding-es-v1.pdf',
    },
    formFields: completedFields,
    kyc: EXAMPLE_KYC_PAYLOAD,
    claims: draftClaims,
  });

  const pdfDraftSubmission = createIndividualOnboardingGatewaySubmission({
    target: { providerDidWeb: EXAMPLE_TENANT_SERVICE_DID },
    route: {
      tenantId: EXAMPLE_TENANT_IDENTIFIER,
      jurisdiction: 'ES',
      sector: 'health-care',
      operation: IndividualOnboardingGatewayOperation.PdfDraftCreate,
    },
    idToken,
    body: pdfDraftBundle,
  });

  // Step 6.
  // The final Organization/_transaction request carries the signed VC as the
  // authoritative attachment and only minimal routing hints in the claims.
  const registrationBundle = buildIndividualOrganizationRegistrationGatewayRequestBundle({
    claims: {
      '@context': 'org.schema',
      [ClaimsOrganizationSchemaorg.alternateName]: EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME,
      [ClaimsServiceSchemaorg.category]: 'health-care',
    },
    verifiableCredential: onboardingCredential,
  });
  const registrationSubmission = createIndividualOnboardingGatewaySubmission({
    target: { providerDidWeb: EXAMPLE_TENANT_SERVICE_DID },
    route: {
      tenantId: EXAMPLE_TENANT_IDENTIFIER,
      jurisdiction: 'ES',
      sector: 'health-care',
      operation: IndividualOnboardingGatewayOperation.OrganizationRegister,
    },
    idToken,
    body: registrationBundle,
  });

  // Assertions.
  assert.equal(kycPrefill.controllerIsSubject, false);
  assert.equal(completedFields.controllerPhone, EXAMPLE_FORM_CONTROLLER_PHONE);
  assert.equal(draftClaims[ClaimsOrganizationSchemaorg.ownerEmail], EXAMPLE_SELF_REGISTERED_INDIVIDUAL_EMAIL_NORMALIZED);
  assert.equal(
    resolveIndividualOnboardingGatewayPath({
      tenantId: EXAMPLE_TENANT_IDENTIFIER,
      jurisdiction: 'ES',
      sector: 'health-care',
      operation: IndividualOnboardingGatewayOperation.PdfDraftCreate,
    }),
    `/${EXAMPLE_TENANT_IDENTIFIER}/cds-es/v1/health-care/individual/pdf/DocumentReference/_create`,
  );
  assert.equal(pdfDraftSubmission.authorization.tokenType, 'id_token');
  assert.equal(pdfDraftSubmission.endpointUrl, `https://provider.example.org/${EXAMPLE_TENANT_IDENTIFIER}/cds-es/v1/health-care/individual/pdf/DocumentReference/_create`);
  assert.equal(
    pdfDraftSubmission.body.data[0]?.resource?.meta?.formFields?.controllerAlternateName,
    EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME,
  );
  assert.equal(registrationSubmission.endpointUrl, `https://provider.example.org/${EXAMPLE_TENANT_IDENTIFIER}/cds-es/v1/health-care/individual/org.schema/Organization/_transaction`);
  assert.equal(
    registrationSubmission.body.data[0]?.meta?.claims?.[ClaimsOrganizationSchemaorg.ownerEmail],
    undefined,
  );
  assert.equal(registrationSubmission.body.data[0]?.meta?.claims, undefined);
  assert.equal(
    registrationSubmission.body.data[0]?.resource?.meta?.claims?.[ClaimsOrganizationSchemaorg.alternateName],
    EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME,
  );
  assert.equal(
    registrationSubmission.body.data[0]?.resource?.meta?.claims?.[ClaimsServiceSchemaorg.category],
    EXAMPLE_TENANT_ROUTE_CONTEXT.sector,
  );
  assert.equal(registrationSubmission.body.attachments?.[0]?.credentialSubject?.hasOccupation?.identifier?.value, 'RESPRSN');
  assert.equal(registrationSubmission.body.attachments?.[0]?.credentialSubject?.hasCredential?.material, EXAMPLE_ORG_CONTROLLER_SIGNING_KEY_ID);
});
