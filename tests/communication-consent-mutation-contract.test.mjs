import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HealthcareActorRoles,
  HealthcareBasicSections,
  HealthcareConsentPurposes,
} from 'gdc-common-utils-ts/constants/healthcare';
import { ResourceTypesFhirR4 } from 'gdc-common-utils-ts/constants/fhir-resource-types';

import {
  CommunicationResourceLifecycleTagCode,
  CommunicationResourceLifecycleTagSystem,
  CommunicationResourceMutationContract,
  ConsentCommunicationOperationKinds,
  ConsentCommunicationTargetKinds,
  ConsentOperationMutationContract,
} from '../dist/index.js';

function buildOperation(index, overrides = {}) {
  return {
    operationKind: ConsentCommunicationOperationKinds.Add,
    operationId: `op-${index}`,
    subject: 'did:web:api.acme.org:individual:123',
    purpose: HealthcareConsentPurposes.Treatment,
    target: {
      kind: ConsentCommunicationTargetKinds.Professional,
      identifier: `professional-${index}@example.org`,
      roles: [HealthcareActorRoles.Physician],
    },
    sections: {
      core: [HealthcareBasicSections.AllergiesAndIntolerances.claim],
    },
    consentDate: `2026-06-0${index}`,
    ...overrides,
  };
}

function buildCommunicationInputFixture() {
  return {
    subject: 'did:web:api.acme.org:individual:123',
    payload: {
      operations: [
        buildOperation(1),
        buildOperation(2, {
          operationKind: ConsentCommunicationOperationKinds.Disable,
          target: {
            kind: ConsentCommunicationTargetKinds.Organization,
            identifier: 'did:web:hospital.example.org',
            roles: [HealthcareActorRoles.Controller],
          },
          sections: {
            core: [HealthcareBasicSections.Results.claim],
          },
        }),
      ],
    },
  };
}

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

test('ConsentOperationMutationContract supports get/add/set/enable/disable/remove with filters', () => {
  const base = buildCommunicationInputFixture();

  const bySection = ConsentOperationMutationContract.getConsentOperations(base, {
    sections: [HealthcareBasicSections.Results.claim],
  });
  assert.equal(bySection.length, 1);
  assert.equal(bySection[0].operationId, 'op-2');

  const withAdded = ConsentOperationMutationContract.addConsentOperations(base, [
    buildOperation(3, {
      sections: { core: [HealthcareBasicSections.ProblemList.claim] },
    }),
  ]);
  assert.equal(ConsentOperationMutationContract.getConsentOperations(withAdded).length, 3);

  const withSet = ConsentOperationMutationContract.setConsentOperations(
    withAdded,
    { operationIds: ['op-1'] },
    [buildOperation(10, { operationId: 'op-10' })],
  );
  assert.equal(ConsentOperationMutationContract.getConsentOperations(withSet, { operationIds: 'op-1' }).length, 0);
  assert.equal(ConsentOperationMutationContract.getConsentOperations(withSet, { operationIds: 'op-10' }).length, 1);

  const withEnabled = ConsentOperationMutationContract.enableConsentOperations(withSet, { operationIds: ['op-2'] });
  assert.equal(
    ConsentOperationMutationContract.getConsentOperations(withEnabled, { operationIds: ['op-2'] })[0].operationKind,
    ConsentCommunicationOperationKinds.Enable,
  );

  const withDisabled = ConsentOperationMutationContract.disableConsentOperations(withEnabled, { operationIds: ['op-10'] });
  assert.equal(
    ConsentOperationMutationContract.getConsentOperations(withDisabled, { operationIds: ['op-10'] })[0].operationKind,
    ConsentCommunicationOperationKinds.Disable,
  );

  const removed = ConsentOperationMutationContract.removeConsentOperations(withDisabled, {
    types: [ResourceTypesFhirR4.Consent],
    targetKinds: [ConsentCommunicationTargetKinds.Organization],
  });
  assert.equal(ConsentOperationMutationContract.getConsentOperations(removed).length, 2);
  assert.equal(
    ConsentOperationMutationContract.getConsentOperations(removed, { targetKinds: [ConsentCommunicationTargetKinds.Organization] }).length,
    0,
  );

  // Legacy alias remains available for backward compatibility.
  assert.equal(ConsentOperationMutationContract.getX(removed).length, 2);
});

test('CommunicationResourceMutationContract supports get/add/set/enable/disable/remove with filters', () => {
  const bundle = buildBundleFixture();

  const allergies = CommunicationResourceMutationContract.getCommunicationResources(bundle, {
    sections: [HealthcareBasicSections.AllergiesAndIntolerances.claim],
  });
  assert.equal(allergies.length, 1);
  assert.equal(allergies[0].id, 'allergy-1');

  const withAdd = CommunicationResourceMutationContract.addCommunicationResources(
    bundle,
    [
      {
        resourceType: ResourceTypesFhirR4.Observation,
        id: 'obs-2',
        effectiveDateTime: '2026-06-01T12:00:00Z',
      },
    ],
    { sections: [HealthcareBasicSections.VitalSigns.claim] },
  );
  assert.equal(
    CommunicationResourceMutationContract.getCommunicationResources(withAdd, { types: [ResourceTypesFhirR4.Observation] }).length,
    2,
  );

  const withSet = CommunicationResourceMutationContract.setCommunicationResources(
    withAdd,
    { types: [ResourceTypesFhirR4.Observation] },
    [
      {
        resourceType: ResourceTypesFhirR4.Observation,
        id: 'obs-replaced',
        effectiveDateTime: '2026-06-01T12:30:00Z',
      },
    ],
    { sections: [HealthcareBasicSections.VitalSigns.claim] },
  );
  assert.equal(
    CommunicationResourceMutationContract.getCommunicationResources(withSet, { types: [ResourceTypesFhirR4.Observation] }).length,
    1,
  );

  const withDisabled = CommunicationResourceMutationContract.disableCommunicationResources(withSet, {
    types: [ResourceTypesFhirR4.Observation],
  });
  const disabledObservation = CommunicationResourceMutationContract.getCommunicationResources(withDisabled, {
    types: [ResourceTypesFhirR4.Observation],
  })[0];
  assert.equal(
    disabledObservation.meta.tag.find((tag) => tag.system === CommunicationResourceLifecycleTagSystem)?.code,
    CommunicationResourceLifecycleTagCode.Disabled,
  );

  const withEnabled = CommunicationResourceMutationContract.enableCommunicationResources(withDisabled, {
    types: [ResourceTypesFhirR4.Observation],
  });
  const enabledObservation = CommunicationResourceMutationContract.getCommunicationResources(withEnabled, {
    types: [ResourceTypesFhirR4.Observation],
  })[0];
  assert.equal(
    enabledObservation.meta.tag.find((tag) => tag.system === CommunicationResourceLifecycleTagSystem)?.code,
    CommunicationResourceLifecycleTagCode.Enabled,
  );

  const removed = CommunicationResourceMutationContract.removeCommunicationResources(withEnabled, {
    types: [ResourceTypesFhirR4.Observation],
  });
  assert.equal(
    CommunicationResourceMutationContract.getCommunicationResources(removed, { types: [ResourceTypesFhirR4.Observation] }).length,
    0,
  );

  // Legacy alias remains available for backward compatibility.
  assert.equal(
    CommunicationResourceMutationContract.getX(removed, { types: [ResourceTypesFhirR4.Observation] }).length,
    0,
  );
});
