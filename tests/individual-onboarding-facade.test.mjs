import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createIndividualOnboardingFacade,
} from '../dist/index.js';
import {
  EXAMPLE_CONSENT_ATTACHMENT_DATA_BASE64,
  EXAMPLE_DOCUMENT_REFERENCE_CONTENT_TYPE_PDF,
  EXAMPLE_DOCUMENT_REFERENCE_IDENTIFIER,
  EXAMPLE_KYC_CONTROLLER_BIRTHDATE,
  EXAMPLE_KYC_CONTROLLER_FAMILY_NAME,
  EXAMPLE_KYC_CONTROLLER_GENDER_MALE,
  EXAMPLE_KYC_CONTROLLER_GIVEN_NAME,
  EXAMPLE_KYC_CONTROLLER_IDENTIFIER,
  EXAMPLE_KYC_CONTROLLER_TELEPHONE,
  EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME,
  EXAMPLE_REGISTERED_SUBJECT_BIRTH_YEAR,
  EXAMPLE_SELF_REGISTERED_INDIVIDUAL_EMAIL_NORMALIZED,
  EXAMPLE_SUBJECT_DID,
} from 'gdc-common-utils-ts/examples/shared';
import {
  DocumentReferenceClaim,
} from 'gdc-common-utils-ts/models/interoperable-claims/document-reference-claims';
import {
  ResourceTypesFhirR4,
} from 'gdc-common-utils-ts/constants/fhir-resource-types';

const facade = createIndividualOnboardingFacade();

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

test('individual onboarding facade derives controller-prefilled form fields from KYC', () => {
  const fields = facade.getFormFieldsFromProfileKyc(EXAMPLE_KYC_PAYLOAD, {
    self: false,
    controllerAlternateName: 'controller-ana',
  });

  assert.equal(fields.controllerIsSubject, false);
  assert.equal(fields.controllerAlternateName, 'controller-ana');
  assert.equal(fields.subjectAlternateName, EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME);
  assert.equal(fields.controllerEmail, EXAMPLE_SELF_REGISTERED_INDIVIDUAL_EMAIL_NORMALIZED);
  assert.equal(fields.controllerPhone, EXAMPLE_KYC_CONTROLLER_TELEPHONE);
  assert.equal(fields.controllerIdValue, EXAMPLE_KYC_CONTROLLER_IDENTIFIER);
  assert.equal(fields.controllerDateOfBirth, EXAMPLE_KYC_CONTROLLER_BIRTHDATE);
  assert.equal(fields.controllerGender, EXAMPLE_KYC_CONTROLLER_GENDER_MALE);
});

test('individual onboarding facade uses Controller/Subject setters instead of generic form naming', () => {
  const fields = facade.setSubjectAlternateName(
    facade.setControllerAlternateName(facade.createDraft(), 'controller-ana'),
    EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME,
  );

  assert.equal(fields.controllerAlternateName, 'controller-ana');
  assert.equal(fields.subjectAlternateName, EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME);
});

test('individual onboarding facade validates missing controller alias and contact channels', () => {
  const validation = facade.validate({
    controllerIsSubject: false,
    subjectAlternateName: EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME,
  });

  assert.equal(validation.ok, false);
  assert.equal(validation.errors.some((issue) => issue.code === 'missing-controller-alternate-name'), true);
  assert.equal(validation.errors.some((issue) => issue.code === 'missing-contact-channel'), true);
});

test('individual onboarding facade builds merged draft claims from KYC plus form overrides', () => {
  const result = facade.buildDraft({
    kyc: EXAMPLE_KYC_PAYLOAD,
    formFields: {
      controllerIsSubject: false,
      controllerAlternateName: 'controller-ana',
      subjectAlternateName: EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME,
      subjectDateOfBirth: EXAMPLE_REGISTERED_SUBJECT_BIRTH_YEAR,
    },
  });

  assert.equal(result.validation.ok, true);
  assert.equal(result.formFields.controllerAlternateName, 'controller-ana');
  assert.equal(result.formFields.subjectAlternateName, EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME);
  assert.equal(result.claims['org.schema.Organization.alternateName'], EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME);
  assert.equal(result.claims['org.schema.Organization.owner.email'], EXAMPLE_SELF_REGISTERED_INDIVIDUAL_EMAIL_NORMALIZED);
  assert.equal(result.claims['org.schema.Organization.owner.telephone'], EXAMPLE_KYC_CONTROLLER_TELEPHONE);
});

test('individual onboarding facade emits claims-first DocumentReference draft output for onboarding PDFs', () => {
  const result = facade.buildDraft({
    kyc: EXAMPLE_KYC_PAYLOAD,
    formFields: {
      controllerIsSubject: true,
      controllerAlternateName: EXAMPLE_REGISTERED_SUBJECT_ALTERNATE_NAME,
    },
    pdf: {
      subject: EXAMPLE_SUBJECT_DID,
      contentData: EXAMPLE_CONSENT_ATTACHMENT_DATA_BASE64,
      identifier: EXAMPLE_DOCUMENT_REFERENCE_IDENTIFIER,
      contentType: EXAMPLE_DOCUMENT_REFERENCE_CONTENT_TYPE_PDF,
    },
  });

  assert.equal(result.documentReference?.type, ResourceTypesFhirR4.DocumentReference);
  assert.equal(
    result.documentReference?.resource.meta.claims[DocumentReferenceClaim.ContentData],
    EXAMPLE_CONSENT_ATTACHMENT_DATA_BASE64,
  );
  assert.equal(result.bundle?.resourceType, 'Bundle');
  assert.equal(result.data?.[0]?.resource.meta.claims[DocumentReferenceClaim.Identifier], EXAMPLE_DOCUMENT_REFERENCE_IDENTIFIER);
});

test('individual onboarding facade exposes an explicit request-bundle helper for frontend onboarding PDF calls', () => {
  const bundle = facade.buildPdfDraftRequestBundle({
    subject: EXAMPLE_SUBJECT_DID,
    contentData: EXAMPLE_CONSENT_ATTACHMENT_DATA_BASE64,
    identifier: EXAMPLE_DOCUMENT_REFERENCE_IDENTIFIER,
    contentType: EXAMPLE_DOCUMENT_REFERENCE_CONTENT_TYPE_PDF,
  });

  assert.equal(bundle.resourceType, 'Bundle');
  assert.equal(bundle.data[0]?.resource.meta.claims[DocumentReferenceClaim.ContentData], EXAMPLE_CONSENT_ATTACHMENT_DATA_BASE64);
});
