/**
 * Teaching goal:
 * - author the canonical clinical read as Communication + Subject/$summary
 * - keep the FHIR Parameters array attached to that Communication
 * - turn the returned document into neutral structural and clinical readers
 *
 * This is not an ingestion lifecycle. No example in this file may call an
 * `ingest*` method.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EXAMPLE_SUBJECT_DID,
  HealthcareBasicSections,
  ResourceTypesFhirR4,
} from 'gdc-common-utils-ts';
import {
  buildClinicalSummaryCommunicationJob,
  readClinicalSummaryOperationResult,
} from '../dist/index.js';

test('101: builds and reads one clinical $summary Communication', () => {
  const section = HealthcareBasicSections.AllergiesAndIntolerances.attributeValue;

  // Step 1. Freeze the semantic read request into one transport-neutral job.
  const communicationJob = buildClinicalSummaryCommunicationJob({
    subjectId: EXAMPLE_SUBJECT_DID,
    requesterId: EXAMPLE_SUBJECT_DID,
    filterSections: [section],
  });

  // Step 2. Model the authoritative document returned by GW.
  const bundle = {
    resourceType: ResourceTypesFhirR4.Bundle,
    type: 'document',
    entry: [{
      resource: {
        resourceType: ResourceTypesFhirR4.Composition,
        section: [{
          code: { coding: [{
            system: HealthcareBasicSections.AllergiesAndIntolerances.system,
            code: HealthcareBasicSections.AllergiesAndIntolerances.code,
          }] },
          entry: [{ reference: 'AllergyIntolerance/allergy-summary-1' }],
        }],
      },
    }, {
      resource: {
        resourceType: ResourceTypesFhirR4.AllergyIntolerance,
        id: 'allergy-summary-1',
        recordedDate: '2026-07-20T10:00:00Z',
      },
    }],
  };

  // Step 3. Open both reader views over exactly that returned Bundle.
  const summary = readClinicalSummaryOperationResult({
    submit: { status: 202, body: { accepted: true } },
    poll: {
      status: 200,
      attempts: 1,
      body: {
        data: [{
          type: 'Bundle-summary-response-v1.0',
          resource: bundle,
        }],
      },
    },
  });

  assert.equal(communicationJob.status, 'ready');
  assert.equal(summary.reader.getDocumentSectionResourceCount(section), 1);
  assert.equal(summary.document.getResourceCount({
    sections: [section],
    types: [ResourceTypesFhirR4.AllergyIntolerance],
    date: { start: '2026-07-01', end: '2026-07-31' },
  }), 1);
});

test('clinical summary reader rejects a successful response without a document Bundle', () => {
  assert.throws(
    () => readClinicalSummaryOperationResult({
      submit: { status: 202, body: { accepted: true } },
      poll: { status: 200, attempts: 1, body: { data: [] } },
    }),
    /did not return a FHIR document Bundle/,
  );
});
