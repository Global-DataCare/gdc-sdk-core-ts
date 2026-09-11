// Flow contract: reuse shared test fixtures and canonical types; do not introduce duplicated literals.
/**
 * SDK Core keeps KYC prefill, signed-PDF evidence and final
 * individual registration separate from Order confirmation and enrollment.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildIndividualOnboardingPdfDraftGatewayRequestBundle,
  buildIndividualOrganizationRegistrationGatewayRequestFromDraft,
  createIndividualOnboardingEditor,
  createIndividualOnboardingGatewaySubmission,
  IndividualOnboardingGatewayOperation,
} from '../dist/index.js';
import {
  ClaimsOrganizationSchemaorg,
  ClaimsServiceSchemaorg,
} from 'gdc-common-utils-ts/constants/schemaorg';
import {
  EXAMPLE_DEMO_PORTAL_ID_TOKEN,
  EXAMPLE_FORM_CONTROLLER_PHONE,
  EXAMPLE_KYC_CONTROLLER_BIRTHDATE,
  EXAMPLE_KYC_CONTROLLER_FAMILY_NAME,
  EXAMPLE_KYC_CONTROLLER_GENDER_MALE,
  EXAMPLE_KYC_CONTROLLER_GIVEN_NAME,
  EXAMPLE_KYC_CONTROLLER_IDENTIFIER,
  EXAMPLE_KYC_CONTROLLER_TELEPHONE,
  EXAMPLE_KYC_CONTROLLER_VERIFIED_AT,
  EXAMPLE_PDF_CONSENT_DATE,
  EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME,
  EXAMPLE_REGISTERED_SUBJECT_BIRTH_YEAR,
  EXAMPLE_SELF_REGISTERED_INDIVIDUAL_EMAIL_NORMALIZED,
  EXAMPLE_SERVICE_PROVIDER_DOMAIN,
  EXAMPLE_SUBJECT_DID,
  EXAMPLE_TENANT_IDENTIFIER,
  EXAMPLE_TENANT_SERVICE_DID,
} from 'gdc-common-utils-ts/examples/shared';

const EXAMPLE_KYC_PAYLOAD = Object.freeze({
  profile: {
    first_name: EXAMPLE_KYC_CONTROLLER_GIVEN_NAME,
    last_name: EXAMPLE_KYC_CONTROLLER_FAMILY_NAME,
    id_number: EXAMPLE_KYC_CONTROLLER_IDENTIFIER,
    phone_number: EXAMPLE_KYC_CONTROLLER_TELEPHONE,
    birthdate: EXAMPLE_KYC_CONTROLLER_BIRTHDATE,
    gender: EXAMPLE_KYC_CONTROLLER_GENDER_MALE,
    kyc_verified_at: EXAMPLE_KYC_CONTROLLER_VERIFIED_AT,
  },
  individualAlternateName: EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME,
  individualBirthDate: EXAMPLE_REGISTERED_SUBJECT_BIRTH_YEAR,
  controllerEmail: EXAMPLE_SELF_REGISTERED_INDIVIDUAL_EMAIL_NORMALIZED,
});

test('101: builds PDF draft and final evidence-first registration without mixing Order or enrollment', () => {
  // Teaching goal:
  // - the application edits one onboarding draft with high-level setters;
  // - SDK Core owns the GW Bundle and attachment translation;
  // - no RelatedPerson, Order, activationCode, author or attester is created here.

  // Step 1. Optional KYC pre-fills the controller data, then explicit setters
  // apply the controller's reviewed corrections.
  const editor = createIndividualOnboardingEditor()
    .setKyc(EXAMPLE_KYC_PAYLOAD, { self: true })
    .setSelf(true)
    .setControllerAlternateName(EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME)
    .setControllerEmail(EXAMPLE_SELF_REGISTERED_INDIVIDUAL_EMAIL_NORMALIZED)
    .setControllerPhone(EXAMPLE_FORM_CONTROLLER_PHONE)
    .setConsentDate(EXAMPLE_PDF_CONSENT_DATE)
    .setServiceProviderDomain(EXAMPLE_SERVICE_PROVIDER_DOMAIN);

  // Step 2. This request only asks GW to render the form that will be signed.
  const unsignedDraft = editor.buildDraft();
  const pdfDraftBundle = buildIndividualOnboardingPdfDraftGatewayRequestBundle({
    subjectDid: EXAMPLE_SUBJECT_DID,
    template: { sector: 'animal-care', language: 'es', version: 'v1' },
    formFields: unsignedDraft.formFields,
    claims: unsignedDraft.claims,
    kyc: unsignedDraft.kyc,
  });

  // Step 3. After certificate signing, the application gives the PDF bytes to
  // the same high-level editor. It does not build a DIDComm attachment.
  const signedPdfBase64 = Buffer.from('signed-pdf-fixture', 'utf8').toString('base64');
  const signedDraft = editor.setPdf({
    subject: EXAMPLE_SUBJECT_DID,
    identifier: 'urn:uuid:00000000-0000-4000-8000-000000000001',
    contentType: 'application/pdf',
    contentData: signedPdfBase64,
  }).buildDraft();

  // Step 4. SDK Core translates the draft into the final Organization request.
  // Claims are routing/compatibility hints; KYC is separate fallback input and
  // the signed PDF attachment has the highest identity/form precedence in GW.
  const registrationBundle = buildIndividualOrganizationRegistrationGatewayRequestFromDraft({
    draft: signedDraft,
    routingClaims: { [ClaimsServiceSchemaorg.category]: 'animal-care' },
  });
  const submission = createIndividualOnboardingGatewaySubmission({
    target: { providerDidWeb: EXAMPLE_TENANT_SERVICE_DID },
    route: {
      tenantId: EXAMPLE_TENANT_IDENTIFIER,
      jurisdiction: 'ES',
      sector: 'animal-care',
      operation: IndividualOnboardingGatewayOperation.OrganizationRegister,
    },
    idToken: EXAMPLE_DEMO_PORTAL_ID_TOKEN,
    body: registrationBundle,
  });

  assert.equal(pdfDraftBundle.data[0]?.resource?.meta?.kyc, EXAMPLE_KYC_PAYLOAD);
  assert.deepEqual(registrationBundle.data[0]?.resource?.meta?.kyc, EXAMPLE_KYC_PAYLOAD);
  assert.equal(registrationBundle.attachments?.[0]?.media_type, 'application/pdf');
  assert.equal(registrationBundle.attachments?.[0]?.data?.base64, signedPdfBase64);
  assert.equal(
    registrationBundle.data[0]?.resource?.meta?.claims?.[ClaimsOrganizationSchemaorg.ownerEmail],
    EXAMPLE_SELF_REGISTERED_INDIVIDUAL_EMAIL_NORMALIZED,
  );
  assert.equal(
    registrationBundle.data[0]?.resource?.meta?.claims?.[ClaimsServiceSchemaorg.category],
    'animal-care',
  );
  assert.match(submission.endpointPath, /Organization\/_transaction$/);
});
