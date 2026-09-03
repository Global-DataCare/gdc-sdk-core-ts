// Flow contract: reuse shared test fixtures and canonical types; do not introduce duplicated literals.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXAMPLE_ALLERGY_IDENTIFIER,
  EXAMPLE_CONTROLLER_DID,
  EXAMPLE_IPS_COMPOSITION_IDENTIFIER,
  EXAMPLE_SUBJECT_DID,
  ResourceTypesFhirR4,
} from 'gdc-common-utils-ts';
import { EXAMPLE_INTER_TENANT_ACCESS_CONTRACT_PROVIDER_ORGANIZATION_URN } from 'gdc-common-utils-ts/examples/inter-tenant-access-contract';
import { cloneImportedClinicalDocumentForDemo } from '../dist/index.js';

test('clones an imported IPS into a separately identified document owned by the demo actor', () => {
  const allergyId = EXAMPLE_ALLERGY_IDENTIFIER.split(':').at(-1);
  const originalBundle = {
    resourceType: ResourceTypesFhirR4.Bundle,
    type: 'document',
    entry: [{
      fullUrl: `urn:uuid:${EXAMPLE_IPS_COMPOSITION_IDENTIFIER}`,
      resource: {
        resourceType: ResourceTypesFhirR4.Composition,
        id: EXAMPLE_IPS_COMPOSITION_IDENTIFIER,
        identifier: { value: EXAMPLE_IPS_COMPOSITION_IDENTIFIER },
        subject: { reference: EXAMPLE_SUBJECT_DID },
        author: [{ reference: EXAMPLE_INTER_TENANT_ACCESS_CONTRACT_PROVIDER_ORGANIZATION_URN }],
        section: [{ entry: [{ reference: `${ResourceTypesFhirR4.AllergyIntolerance}/${allergyId}` }] }],
      },
    }, {
      fullUrl: `urn:uuid:${allergyId}`,
      resource: {
        resourceType: ResourceTypesFhirR4.AllergyIntolerance,
        id: allergyId,
        identifier: [{ value: EXAMPLE_ALLERGY_IDENTIFIER }],
        patient: { reference: EXAMPLE_SUBJECT_DID },
      },
    }],
  };
  const cloned = cloneImportedClinicalDocumentForDemo({
    bundle: originalBundle,
    authenticatedActorDid: EXAMPLE_CONTROLLER_DID,
    createResourceId: ({ originalId }) => `${originalId}-demo-copy`,
  });

  assert.notStrictEqual(cloned, originalBundle);
  assert.equal(cloned.entry[0].resource.author[0].reference, EXAMPLE_CONTROLLER_DID);
  assert.equal(cloned.entry[0].resource.id, `${EXAMPLE_IPS_COMPOSITION_IDENTIFIER}-demo-copy`);
  assert.equal(cloned.entry[1].resource.id, `${allergyId}-demo-copy`);
  assert.equal(
    cloned.entry[0].resource.section[0].entry[0].reference,
    `${ResourceTypesFhirR4.AllergyIntolerance}/${allergyId}-demo-copy`,
  );
  assert.equal(cloned.entry[1].fullUrl, `urn:uuid:${allergyId}-demo-copy`);
  assert.equal(
    originalBundle.entry[0].resource.author[0].reference,
    EXAMPLE_INTER_TENANT_ACCESS_CONTRACT_PROVIDER_ORGANIZATION_URN,
  );
  assert.deepEqual(
    cloned.entry[1].resource.identifier,
    originalBundle.entry[1].resource.identifier,
  );
});

test('rejects a non-document input or an external provenance URN as the demo actor', () => {
  assert.throws(() => cloneImportedClinicalDocumentForDemo({
    bundle: { resourceType: ResourceTypesFhirR4.Bundle, type: 'collection', entry: [] },
    authenticatedActorDid: EXAMPLE_SUBJECT_DID,
  }), /Bundle.type=document/);

  assert.throws(() => cloneImportedClinicalDocumentForDemo({
    bundle: {
      resourceType: ResourceTypesFhirR4.Bundle,
      type: 'document',
      entry: [{ resource: { resourceType: ResourceTypesFhirR4.Composition } }],
    },
    authenticatedActorDid: EXAMPLE_INTER_TENANT_ACCESS_CONTRACT_PROVIDER_ORGANIZATION_URN,
  }), /authenticated actor did:web/);
});
