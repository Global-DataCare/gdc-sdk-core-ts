import test from 'node:test';
import assert from 'node:assert/strict';

import { HealthcareBasicSections } from 'gdc-common-utils-ts/constants/healthcare';
import { ResourceTypesFhirR4 } from 'gdc-common-utils-ts/constants/fhir-resource-types';
import {
  addResources,
  getResources,
  setResources,
} from '../dist/index.js';

function buildBundleFixture() {
  return {
    resourceType: ResourceTypesFhirR4.Bundle,
    type: 'document',
    entry: [
      {
        resource: {
          resourceType: ResourceTypesFhirR4.Composition,
          id: 'composition-1',
          section: [
            {
              code: { coding: [{ code: '48765-2' }] },
              entry: [{ reference: 'AllergyIntolerance/allergy-1' }],
            },
          ],
        },
      },
      {
        resource: {
          resourceType: ResourceTypesFhirR4.AllergyIntolerance,
          id: 'allergy-1',
          recordedDate: '2026-06-01T10:00:00Z',
        },
      },
      {
        resource: {
          resourceType: ResourceTypesFhirR4.Observation,
          id: 'obs-1',
          effectiveDateTime: '2026-06-01T10:10:00Z',
        },
      },
    ],
  };
}

test('getResources filters by section/type/date', () => {
  const bundle = buildBundleFixture();

  const bySection = getResources(bundle, {
    sections: [HealthcareBasicSections.AllergiesAndIntolerances.claim],
  });
  assert.equal(bySection.length, 1);
  assert.equal(bySection[0].resourceType, ResourceTypesFhirR4.AllergyIntolerance);

  const byType = getResources(bundle, { types: [ResourceTypesFhirR4.Observation] });
  assert.equal(byType.length, 1);
  assert.equal(byType[0].id, 'obs-1');

  const byDate = getResources(bundle, {
    types: [ResourceTypesFhirR4.Observation],
    date: { start: '2026-06-01T10:05:00Z', end: '2026-06-01T10:30:00Z' },
  });
  assert.equal(byDate.length, 1);
});

test('addResources appends entries and links them to composition sections', () => {
  const bundle = buildBundleFixture();

  const updated = addResources(
    bundle,
    [
      {
        resourceType: ResourceTypesFhirR4.Observation,
        id: 'obs-2',
        effectiveDateTime: '2026-06-01T11:00:00Z',
      },
    ],
    { sections: [HealthcareBasicSections.VitalSigns.claim] },
  );

  const observations = getResources(updated, { types: [ResourceTypesFhirR4.Observation] });
  assert.equal(observations.length, 2);
  assert.ok(observations.some((item) => item.id === 'obs-2'));
});

test('setResources replaces filtered resources', () => {
  const bundle = buildBundleFixture();

  const updated = setResources(
    bundle,
    { types: [ResourceTypesFhirR4.Observation] },
    [
      {
        resourceType: ResourceTypesFhirR4.Observation,
        id: 'obs-replaced',
        effectiveDateTime: '2026-06-01T12:00:00Z',
      },
    ],
    { sections: [HealthcareBasicSections.VitalSigns.claim] },
  );

  const observations = getResources(updated, { types: [ResourceTypesFhirR4.Observation] });
  assert.equal(observations.length, 1);
  assert.equal(observations[0].id, 'obs-replaced');
});
