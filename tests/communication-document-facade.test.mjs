import test from 'node:test';
import assert from 'node:assert/strict';

import { FhirCodeSystems } from 'gdc-common-utils-ts/constants/fhir-code-systems';
import { ResourceTypesFhirR4 } from 'gdc-common-utils-ts/constants/fhir-resource-types';
import { VitalSignsCodes } from 'gdc-common-utils-ts/constants/vital-signs';
import {
  addFhirResourceToCommunication,
  createCommunicationFacade,
  createCommunicationResource,
} from '../dist/index.js';

test('communication facade resolves a FHIR document from embedded DocumentReference', () => {
  const communication = createCommunicationResource({
    subject: 'did:web:api.acme.org:individual:123',
  });

  const bundle = {
    resourceType: ResourceTypesFhirR4.Bundle,
    type: 'document',
    entry: [
      {
        resource: {
          resourceType: ResourceTypesFhirR4.Composition,
          section: [
            {
              title: 'Medications',
              code: {
                coding: [{ system: FhirCodeSystems.Loinc, code: '10160-0' }],
              },
              entry: [{ reference: 'urn:uuid:med-001' }],
            },
          ],
        },
      },
      {
        resource: {
          resourceType: ResourceTypesFhirR4.MedicationStatement,
          id: 'med-001',
          effectiveDateTime: '2026-05-22T10:00:00Z',
          medicationCodeableConcept: { text: 'Paracetamol 500mg' },
        },
      },
      {
        resource: {
          resourceType: ResourceTypesFhirR4.Observation,
          id: 'obs-001',
          effectiveDateTime: '2026-05-20T10:00:00Z',
          category: [{
            coding: [{ system: FhirCodeSystems.ObservationCategory, code: 'vital-signs' }],
          }],
          code: {
            coding: [{ system: VitalSignsCodes.HeartRate.system, code: VitalSignsCodes.HeartRate.code }],
          },
          valueString: '72 bpm',
        },
      },
    ],
  };

  const next = addFhirResourceToCommunication(communication, bundle, {
    asDocumentReference: true,
    attachmentTitle: 'ips.json',
  });

  const sdkCommunication = createCommunicationFacade();
  const document = sdkCommunication.getDocument(next);
  assert.equal(document?.kind, 'fhir');
  assert.equal(document?.source, 'documentReference');

  const fhirDocument = sdkCommunication.getFhirDocument(next);
  const sections = fhirDocument.getSections();
  assert.equal(sections.length, 1);
  assert.equal(sections[0].title, 'Medications');

  const meds = fhirDocument.getResources(ResourceTypesFhirR4.MedicationStatement);
  assert.equal(meds.length, 1);

  const filteredByDate = fhirDocument.getByDates(ResourceTypesFhirR4.Observation, '2026-05-19', '2026-05-21');
  assert.equal(filteredByDate.length, 1);

  const containing = fhirDocument.getContainingTextOrDisplay(ResourceTypesFhirR4.MedicationStatement, 'paracetamol');
  assert.equal(containing.length, 1);
  assert.equal(fhirDocument.vitalSigns.getAll().length, 1);
  assert.equal(fhirDocument.vitalSigns.getHeartRate()[0].id, 'obs-001');
});
