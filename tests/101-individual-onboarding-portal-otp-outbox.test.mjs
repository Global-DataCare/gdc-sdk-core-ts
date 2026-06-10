import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildIndividualOnboardingPdfDraftGatewayRequestBundle,
  buildIndividualOrganizationRegistrationGatewayRequestBundle,
  createIndividualOnboardingEditor,
  createIndividualOnboardingGatewaySubmission,
  createRelationshipChannelOtpChallengeSummary,
  createRelationshipChannelOtpConfirmInput,
  createRelationshipChannelOtpStartInput,
  IndividualOnboardingGatewayOperation,
  resolveIndividualOnboardingGatewayPath,
} from '../dist/index.js';
import {
  EXAMPLE_DEMO_PORTAL_ID_TOKEN,
  EXAMPLE_FORM_CONTROLLER_PHONE,
  EXAMPLE_FORM_SUBJECT_IDENTIFIER_VALUE,
  EXAMPLE_FORM_SUBJECT_PHONE,
  EXAMPLE_KYC_CONTROLLER_BIRTHDATE,
  EXAMPLE_KYC_CONTROLLER_FAMILY_NAME,
  EXAMPLE_KYC_CONTROLLER_GENDER_MALE,
  EXAMPLE_KYC_CONTROLLER_GIVEN_NAME,
  EXAMPLE_KYC_CONTROLLER_IDENTIFIER,
  EXAMPLE_KYC_CONTROLLER_TELEPHONE,
  EXAMPLE_OTP_CHALLENGE_ID,
  EXAMPLE_OTP_CODE,
  EXAMPLE_OTP_INVITATION_ID,
  EXAMPLE_PDF_CONSENT_DATE,
  EXAMPLE_SERVICE_PROVIDER_DOMAIN,
  EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME,
  EXAMPLE_REGISTERED_SUBJECT_BIRTH_YEAR,
  EXAMPLE_SELF_REGISTERED_INDIVIDUAL_EMAIL_NORMALIZED,
  EXAMPLE_SUBJECT_DID,
  EXAMPLE_TENANT_IDENTIFIER,
  EXAMPLE_TENANT_SERVICE_DID,
} from 'gdc-common-utils-ts/examples/shared';
import {
  ClaimsOrganizationSchemaorg,
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

test('101: portal onboarding demo flow uses OTP outside GW CORE and then submits PDF draft + registration bundles with id_token', () => {
  // Step 1.
  // The portal already authenticated the controller and owns the Firebase-like
  // id_token used for both GW CORE requests.
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

  // Step 5.
  // Demo mode: OTP is handled by the portal/backend, not by GW CORE.
  // The backend starts the challenge and already knows the demo OTP that would
  // normally be delivered by email or SMS.
  const otpStart = createRelationshipChannelOtpStartInput({
    invitationId: EXAMPLE_OTP_INVITATION_ID,
    deliveryChannel: 'sms',
    locale: 'es-ES',
  });
  const otpChallenge = createRelationshipChannelOtpChallengeSummary({
    invitationId: EXAMPLE_OTP_INVITATION_ID,
    challengeId: EXAMPLE_OTP_CHALLENGE_ID,
    deliveryChannel: 'sms',
    status: 'pending',
    attemptsRemaining: 3,
  });
  const otpConfirm = createRelationshipChannelOtpConfirmInput({
    invitationId: EXAMPLE_OTP_INVITATION_ID,
    challengeId: EXAMPLE_OTP_CHALLENGE_ID,
    code: EXAMPLE_OTP_CODE,
  });

  // Step 6.
  // After OTP confirmation, the portal backend submits the final
  // IndividualOrganization registration bundle to GW CORE using the same
  // controller session id_token. Demo mode does not require a real PDF
  // signature here; the claim set is already complete and OTP was validated
  // outside GW CORE.
  const registrationBundle = buildIndividualOrganizationRegistrationGatewayRequestBundle({
    claims: draftClaims,
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
  assert.equal(otpStart.locale, 'es-ES');
  assert.equal(otpChallenge.challengeId, EXAMPLE_OTP_CHALLENGE_ID);
  assert.equal(otpConfirm.code, EXAMPLE_OTP_CODE);
  assert.equal(registrationSubmission.endpointUrl, `https://provider.example.org/${EXAMPLE_TENANT_IDENTIFIER}/cds-es/v1/health-care/individual/org.schema/Organization/_transaction`);
  assert.equal(
    registrationSubmission.body.data[0]?.meta?.claims?.[ClaimsOrganizationSchemaorg.ownerEmail],
    EXAMPLE_SELF_REGISTERED_INDIVIDUAL_EMAIL_NORMALIZED,
  );
});
