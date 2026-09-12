// Flow contract: reuse shared test fixtures and canonical types; do not introduce duplicated literals.
import assert from 'node:assert/strict';
import test from 'node:test';

import { ResourceTypesFhirR4 } from 'gdc-common-utils-ts/constants/fhir-resource-types';
import { DiagnosticReportClaim } from 'gdc-common-utils-ts/models/interoperable-claims/diagnostic-report-claims';
import {
  EXAMPLE_DIAGNOSTIC_REPORT_CATEGORY,
  EXAMPLE_DIAGNOSTIC_REPORT_CODE,
  EXAMPLE_DIAGNOSTIC_REPORT_CONTAINED_DOCUMENT_IDENTIFIER,
  EXAMPLE_DIAGNOSTIC_REPORT_DATE,
  EXAMPLE_DIAGNOSTIC_REPORT_ENCOUNTER_REFERENCE,
  EXAMPLE_DIAGNOSTIC_REPORT_IDENTIFIER,
  EXAMPLE_DIAGNOSTIC_REPORT_PERFORMER_REFERENCE,
  EXAMPLE_DIAGNOSTIC_REPORT_PRESENTED_FORM_CONTENT_TYPE,
  EXAMPLE_DIAGNOSTIC_REPORT_PRESENTED_FORM_DATA_BASE64,
  EXAMPLE_DIAGNOSTIC_REPORT_PRESENTED_FORM_URL,
  EXAMPLE_DIAGNOSTIC_REPORT_RESULT_REFERENCE,
  EXAMPLE_DIAGNOSTIC_REPORT_SPECIMEN_REFERENCE,
  EXAMPLE_DIAGNOSTIC_REPORT_STATUS_FINAL,
  EXAMPLE_SUBJECT_DID,
} from 'gdc-common-utils-ts/examples/shared';

import {
  addFhirResourceToCommunication,
  createCommunicationResource,
  getDiagnosticReportClaimsFromCommunicationDocument,
} from '../dist/index.js';

function attachDocumentBundle(resource) {
  return addFhirResourceToCommunication(
    createCommunicationResource({ subject: EXAMPLE_SUBJECT_DID }),
    {
      resourceType: ResourceTypesFhirR4.Bundle,
      type: 'document',
      entry: [{ resource }],
    },
    { asDocumentReference: true },
  );
}

test('extracts canonical DiagnosticReport claims from a Communication document', () => {
  const claims = {
    [DiagnosticReportClaim.Identifier]: EXAMPLE_DIAGNOSTIC_REPORT_IDENTIFIER,
    [DiagnosticReportClaim.Status]: EXAMPLE_DIAGNOSTIC_REPORT_STATUS_FINAL,
    [DiagnosticReportClaim.Subject]: EXAMPLE_SUBJECT_DID,
  };
  const communication = attachDocumentBundle({
    resourceType: ResourceTypesFhirR4.DiagnosticReport,
    meta: { claims },
  });

  assert.deepEqual(
    getDiagnosticReportClaimsFromCommunicationDocument(communication),
    [claims],
  );
});

test('extracts DiagnosticReport contained-document and presented-form claims from a Communication document', () => {
  const [categorySystem, categoryCode] = EXAMPLE_DIAGNOSTIC_REPORT_CATEGORY.split('|');
  const [codeSystem, code] = EXAMPLE_DIAGNOSTIC_REPORT_CODE.split('|');
  const communication = attachDocumentBundle({
    resourceType: ResourceTypesFhirR4.DiagnosticReport,
    identifier: [{ value: EXAMPLE_DIAGNOSTIC_REPORT_IDENTIFIER }],
    status: EXAMPLE_DIAGNOSTIC_REPORT_STATUS_FINAL,
    issued: EXAMPLE_DIAGNOSTIC_REPORT_DATE,
    category: [{ coding: [{ system: categorySystem, code: categoryCode }] }],
    code: { coding: [{ system: codeSystem, code }] },
    subject: { reference: EXAMPLE_SUBJECT_DID },
    encounter: { reference: EXAMPLE_DIAGNOSTIC_REPORT_ENCOUNTER_REFERENCE },
    performer: [{ reference: EXAMPLE_DIAGNOSTIC_REPORT_PERFORMER_REFERENCE }],
    result: [{ reference: EXAMPLE_DIAGNOSTIC_REPORT_RESULT_REFERENCE }],
    specimen: [{ reference: EXAMPLE_DIAGNOSTIC_REPORT_SPECIMEN_REFERENCE }],
    presentedForm: [{
      contentType: EXAMPLE_DIAGNOSTIC_REPORT_PRESENTED_FORM_CONTENT_TYPE,
      data: EXAMPLE_DIAGNOSTIC_REPORT_PRESENTED_FORM_DATA_BASE64,
      url: EXAMPLE_DIAGNOSTIC_REPORT_PRESENTED_FORM_URL,
    }],
    meta: {
      claims: {
        [DiagnosticReportClaim.ContainedDocuments]: EXAMPLE_DIAGNOSTIC_REPORT_CONTAINED_DOCUMENT_IDENTIFIER,
      },
    },
  });

  assert.deepEqual(getDiagnosticReportClaimsFromCommunicationDocument(communication), [{
    [DiagnosticReportClaim.Identifier]: EXAMPLE_DIAGNOSTIC_REPORT_IDENTIFIER,
    [DiagnosticReportClaim.Status]: EXAMPLE_DIAGNOSTIC_REPORT_STATUS_FINAL,
    [DiagnosticReportClaim.Date]: EXAMPLE_DIAGNOSTIC_REPORT_DATE,
    [DiagnosticReportClaim.Category]: EXAMPLE_DIAGNOSTIC_REPORT_CATEGORY,
    [DiagnosticReportClaim.Code]: EXAMPLE_DIAGNOSTIC_REPORT_CODE,
    [DiagnosticReportClaim.Subject]: EXAMPLE_SUBJECT_DID,
    [DiagnosticReportClaim.Patient]: EXAMPLE_SUBJECT_DID,
    [DiagnosticReportClaim.Encounter]: EXAMPLE_DIAGNOSTIC_REPORT_ENCOUNTER_REFERENCE,
    [DiagnosticReportClaim.Performer]: EXAMPLE_DIAGNOSTIC_REPORT_PERFORMER_REFERENCE,
    [DiagnosticReportClaim.Result]: EXAMPLE_DIAGNOSTIC_REPORT_RESULT_REFERENCE,
    [DiagnosticReportClaim.Specimen]: EXAMPLE_DIAGNOSTIC_REPORT_SPECIMEN_REFERENCE,
    [DiagnosticReportClaim.PresentedFormContentType]: EXAMPLE_DIAGNOSTIC_REPORT_PRESENTED_FORM_CONTENT_TYPE,
    [DiagnosticReportClaim.PresentedFormData]: EXAMPLE_DIAGNOSTIC_REPORT_PRESENTED_FORM_DATA_BASE64,
    [DiagnosticReportClaim.PresentedFormUrl]: EXAMPLE_DIAGNOSTIC_REPORT_PRESENTED_FORM_URL,
    [DiagnosticReportClaim.ContainedDocuments]: EXAMPLE_DIAGNOSTIC_REPORT_CONTAINED_DOCUMENT_IDENTIFIER,
  }]);
});
