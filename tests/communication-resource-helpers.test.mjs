import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FhirCodeSystems,
} from 'gdc-common-utils-ts/constants/fhir-code-systems';
import {
  ResourceTypesFhirR4,
} from 'gdc-common-utils-ts/constants/fhir-resource-types';
import {
  EXAMPLE_DOCUMENT_REFERENCE_IDENTIFIER,
  EXAMPLE_DOCUMENT_REFERENCE_URL,
} from '../../gdc-common-utils-ts/dist/examples/shared.js';
import {
  VitalSignsCodes,
} from 'gdc-common-utils-ts/constants/vital-signs';

import {
  addClaimsResourceToCommunication,
  addFhirResourceToCommunication,
  buildCommunicationBatchMessage,
  createBloodPressureObservation,
  createBodyTemperatureObservation,
  createCommunicationResource,
  createHeartRateObservation,
  getDocumentReferenceClaimsByIdentifiersFromCommunicationDocument,
  getDocumentReferenceClaimsFromCommunicationDocument,
  getFirstBundleDocumentFromCommunication,
  getMedicationClaimsFromCommunicationDocument,
  getObservationsByCodeFromCommunicationDocument,
  resolveCommunicationPayloads,
  sortFhirResourcesByDateDescending,
} from '../dist/index.js';

test('creates a communication and adds a document bundle through embedded DocumentReference', () => {
  const communication = createCommunicationResource({
    subject: 'did:web:api.acme.org:individual:123',
    sender: 'did:web:api.acme.org:employee:doctor1',
    category: ['http://terminology.hl7.org/CodeSystem/communication-category|notification'],
    noteText: 'IPS document',
  });

  const bundle = {
    resourceType: ResourceTypesFhirR4.Bundle,
    type: 'document',
    entry: [
      {
        resource: {
          resourceType: ResourceTypesFhirR4.Composition,
          id: 'ips-001',
          date: '2026-05-22T10:00:00Z',
        },
      },
    ],
  };

  const next = addFhirResourceToCommunication(communication, bundle, {
    asDocumentReference: true,
    attachmentTitle: 'ips-document-reference.json',
    documentDescription: 'IPS Light Document',
  });

  const payloads = resolveCommunicationPayloads(next);
  assert.equal(payloads.length, 1);
  assert.equal(payloads[0].documentReference?.resourceType, ResourceTypesFhirR4.DocumentReference);
  assert.equal(payloads[0].bundle?.resourceType, ResourceTypesFhirR4.Bundle);
  assert.equal(getFirstBundleDocumentFromCommunication(next)?.resourceType, ResourceTypesFhirR4.Bundle);

  const batch = buildCommunicationBatchMessage(next, {
    iss: 'did:web:ehr-system.example.com',
    aud: 'did:web:gateway.acme.org',
  });
  assert.equal(batch.type, 'application/fhir+json; fhirVersion=4.0');
  assert.equal(batch.body.entry[0].resource.resourceType, ResourceTypesFhirR4.Communication);
});

test('extracts medication claims and filters observations by code from a communication bundle', () => {
  const communication = createCommunicationResource({
    subject: 'did:web:api.acme.org:individual:123',
  });

  const bundle = {
    resourceType: ResourceTypesFhirR4.Bundle,
    type: 'document',
    entry: [
      {
        resource: {
          resourceType: ResourceTypesFhirR4.MedicationStatement,
          id: 'med-001',
          effectiveDateTime: '2026-05-21T10:00:00Z',
          meta: {
            claims: {
              'MedicationStatement.subject': 'did:web:api.acme.org:individual:123',
              'MedicationStatement.effective': '2026-05-21T10:00:00Z',
              'MedicationStatement.medication-text': 'Paracetamol 500mg',
            },
          },
        },
      },
      {
        resource: {
          resourceType: ResourceTypesFhirR4.Observation,
          id: 'obs-001',
          effectiveDateTime: '2026-05-22T08:00:00Z',
          category: [{
            coding: [{ system: FhirCodeSystems.ObservationCategory, code: 'vital-signs' }],
          }],
          code: {
            coding: [{ system: VitalSignsCodes.HeartRate.system, code: VitalSignsCodes.HeartRate.code }],
          },
        },
      },
      {
        resource: {
          resourceType: ResourceTypesFhirR4.Observation,
          id: 'obs-002',
          effectiveDateTime: '2026-05-20T08:00:00Z',
          category: [{
            coding: [{ system: FhirCodeSystems.ObservationCategory, code: 'vital-signs' }],
          }],
          code: {
            coding: [{ system: VitalSignsCodes.BodyTemperature.system, code: VitalSignsCodes.BodyTemperature.code }],
          },
        },
      },
    ],
  };

  const next = addFhirResourceToCommunication(communication, bundle, {
    asDocumentReference: true,
  });

  const medicationClaims = getMedicationClaimsFromCommunicationDocument(next);
  assert.equal(medicationClaims.length, 1);
  assert.equal(medicationClaims[0]['MedicationStatement.medication-text'], 'Paracetamol 500mg');

  const matchingObservations = getObservationsByCodeFromCommunicationDocument(next, {
    code: VitalSignsCodes.HeartRate.claim,
  });
  assert.equal(matchingObservations.length, 1);
  assert.equal(matchingObservations[0].id, 'obs-001');
});

test('extracts linked DocumentReference claims from a communication bundle', () => {
  const communication = createCommunicationResource({
    subject: 'did:web:api.acme.org:individual:123',
  });

  const bundle = {
    resourceType: ResourceTypesFhirR4.Bundle,
    type: 'document',
    entry: [
      {
        resource: {
          resourceType: ResourceTypesFhirR4.MedicationStatement,
          id: 'med-001',
          meta: {
            claims: {
              'MedicationStatement.identifier': 'med-001',
              'MedicationStatement.subject': 'did:web:api.acme.org:individual:123',
              'MedicationStatement.contained-documents': EXAMPLE_DOCUMENT_REFERENCE_IDENTIFIER,
            },
          },
        },
      },
      {
        resource: {
          resourceType: ResourceTypesFhirR4.DocumentReference,
          id: 'docref-1',
          meta: {
            claims: {
              'DocumentReference.identifier': EXAMPLE_DOCUMENT_REFERENCE_IDENTIFIER,
              'DocumentReference.subject': 'did:web:api.acme.org:individual:123',
              'DocumentReference.contenttype': 'application/pdf',
              'DocumentReference.location': EXAMPLE_DOCUMENT_REFERENCE_URL,
            },
          },
        },
      },
    ],
  };

  const next = addFhirResourceToCommunication(communication, bundle, {
    asDocumentReference: true,
  });

  const allDocumentReferenceClaims = getDocumentReferenceClaimsFromCommunicationDocument(next);
  assert.equal(allDocumentReferenceClaims.length, 1);
  assert.equal(allDocumentReferenceClaims[0]['DocumentReference.identifier'], EXAMPLE_DOCUMENT_REFERENCE_IDENTIFIER);

  const linkedDocumentReferenceClaims = getDocumentReferenceClaimsByIdentifiersFromCommunicationDocument(
    next,
    [EXAMPLE_DOCUMENT_REFERENCE_IDENTIFIER],
  );
  assert.equal(linkedDocumentReferenceClaims.length, 1);
  assert.equal(linkedDocumentReferenceClaims[0]['DocumentReference.location'], EXAMPLE_DOCUMENT_REFERENCE_URL);
});

test('creates vital-sign observations with canonical shared codes and units', () => {
  const heartRate = createHeartRateObservation({
    value: 72,
    effectiveDateTime: '2026-05-22T08:00:00Z',
    subject: 'did:web:api.acme.org:individual:123',
  });
  assert.equal(heartRate.resourceType, ResourceTypesFhirR4.Observation);
  assert.equal(heartRate.code.coding[0].system, VitalSignsCodes.HeartRate.system);
  assert.equal(heartRate.code.coding[0].code, VitalSignsCodes.HeartRate.code);
  assert.equal(heartRate.valueQuantity.system, FhirCodeSystems.Ucum);

  const temperature = createBodyTemperatureObservation({ value: 36.7 });
  assert.equal(temperature.code.coding[0].code, VitalSignsCodes.BodyTemperature.code);
  assert.equal(temperature.valueQuantity.code, 'Cel');

  const bloodPressure = createBloodPressureObservation({ systolic: 120, diastolic: 80 });
  assert.equal(bloodPressure.code.coding[0].code, VitalSignsCodes.BloodPressure.code);
  assert.equal(bloodPressure.component[0].code.coding[0].code, VitalSignsCodes.SystolicBloodPressure.code);
  assert.equal(bloodPressure.component[1].code.coding[0].code, VitalSignsCodes.DiastolicBloodPressure.code);
});

test('sorts resources by canonical date descending and supports claims-only resource attachments', () => {
  const communication = createCommunicationResource({
    subject: 'did:web:api.acme.org:individual:123',
  });

  const next = addClaimsResourceToCommunication(
    communication,
    ResourceTypesFhirR4.Consent,
    {
      'Consent.subject': 'did:web:api.acme.org:individual:123',
      'Consent.purpose': 'TREAT',
    },
    {
      noteText: 'Consent by claims',
    },
  );

  const payloads = resolveCommunicationPayloads(next);
  assert.equal(payloads.length, 1);
  assert.equal(payloads[0].resource?.resourceType, ResourceTypesFhirR4.Consent);
  assert.equal(payloads[0].noteText, 'Consent by claims');

  const sorted = sortFhirResourcesByDateDescending([
    { resourceType: ResourceTypesFhirR4.Observation, id: 'older', effectiveDateTime: '2026-05-20T08:00:00Z' },
    { resourceType: ResourceTypesFhirR4.Observation, id: 'newer', effectiveDateTime: '2026-05-22T08:00:00Z' },
  ]);
  assert.deepEqual(sorted.map((item) => item.id), ['newer', 'older']);
});
