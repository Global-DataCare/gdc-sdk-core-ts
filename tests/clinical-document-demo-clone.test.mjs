// Flow contract: reuse shared test fixtures and canonical types; do not introduce duplicated literals.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXAMPLE_ALLERGY_IDENTIFIER,
  EXAMPLE_CONTROLLER_DID,
  EXAMPLE_IPS_COMPOSITION_IDENTIFIER,
  EXAMPLE_INDIVIDUAL_CONTROLLER_ROLE_VALUE,
  EXAMPLE_KYC_CONTROLLER_USER_UUID,
  EXAMPLE_KYC_CONTROLLER_UUID,
  EXAMPLE_PROVIDER_ORGANIZATION_DID,
  EXAMPLE_PROFESSIONAL_DID,
  EXAMPLE_PROVIDER_ORGANIZATION_AUTHORIZATION_URN_CDS,
  EXAMPLE_HEALTHCARE_ACTOR_ROLE_RECEPTIONIST,
  FhirIpsCreatorKinds,
  EXAMPLE_SUBJECT_DID,
  ResourceTypesFhirR4,
} from 'gdc-common-utils-ts';
import {
  cloneImportedClinicalDocumentForDemo,
  resolveClinicalCreatorIpsExport,
} from '../dist/index.js';

test('clones an imported IPS with the local source author and professional attester from the protected profile', () => {
  // Application contract: profile.actorDid remains the sender. The editable
  // copy receives FHIR provenance projected from its registered binding.
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
        author: [{ reference: EXAMPLE_PROVIDER_ORGANIZATION_AUTHORIZATION_URN_CDS }],
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
    clinicalCreator: resolveClinicalCreatorIpsExport({
      bindings: [{
        kind: FhirIpsCreatorKinds.Professional,
        actorIdentifier: `urn:uuid:${EXAMPLE_KYC_CONTROLLER_USER_UUID}`,
        authorIdentifier: `urn:uuid:${EXAMPLE_KYC_CONTROLLER_UUID}`,
        ownerIdentifier: EXAMPLE_PROVIDER_ORGANIZATION_AUTHORIZATION_URN_CDS,
        role: EXAMPLE_HEALTHCARE_ACTOR_ROLE_RECEPTIONIST,
        actorDids: [EXAMPLE_PROFESSIONAL_DID],
      }],
      evidence: { actorDid: EXAMPLE_PROFESSIONAL_DID },
    }),
    createResourceId: ({ originalId }) => `${originalId}-demo-copy`,
  });

  // The helper owns the provenance rewrite; sender/recipient belong to the later
  // updateClinicalSummary call and must not be inferred from imported data.
  assert.notStrictEqual(cloned, originalBundle);
  assert.equal(
    cloned.entry[0].resource.author[0].reference,
    EXAMPLE_PROVIDER_ORGANIZATION_AUTHORIZATION_URN_CDS,
  );
  assert.equal(
    cloned.entry[0].resource.attester[0].party.reference,
    `urn:uuid:${EXAMPLE_KYC_CONTROLLER_UUID}`,
  );
  assert.ok(cloned.entry.some(({ resource }) => resource.resourceType === ResourceTypesFhirR4.PractitionerRole));
  assert.equal(cloned.entry[0].resource.id, `${EXAMPLE_IPS_COMPOSITION_IDENTIFIER}-demo-copy`);
  assert.equal(cloned.entry[1].resource.id, `${allergyId}-demo-copy`);
  assert.equal(
    cloned.entry[0].resource.section[0].entry[0].reference,
    `${ResourceTypesFhirR4.AllergyIntolerance}/${allergyId}-demo-copy`,
  );
  assert.equal(cloned.entry[1].fullUrl, `urn:uuid:${allergyId}-demo-copy`);
  assert.equal(
    originalBundle.entry[0].resource.author[0].reference,
    EXAMPLE_PROVIDER_ORGANIZATION_AUTHORIZATION_URN_CDS,
  );
  assert.deepEqual(
    cloned.entry[1].resource.identifier,
    originalBundle.entry[1].resource.identifier,
  );
});

test('uses one RelatedPerson reference as both author and attester for an individual member copy', () => {
  // Flow contract: member/controller actorDid remains transport identity; the
  // registered RelatedPerson urn:uuid is both FHIR author and attester.
  const relatedPersonReference = `urn:uuid:${EXAMPLE_KYC_CONTROLLER_UUID}`;
  const originalBundle = {
    resourceType: ResourceTypesFhirR4.Bundle,
    type: 'document',
    entry: [{ resource: { resourceType: ResourceTypesFhirR4.Composition } }],
  };
  const clinicalCreator = resolveClinicalCreatorIpsExport({
    bindings: [{
      kind: FhirIpsCreatorKinds.IndividualMember,
      actorIdentifier: `urn:uuid:${EXAMPLE_KYC_CONTROLLER_USER_UUID}`,
      authorIdentifier: relatedPersonReference,
      ownerIdentifier: EXAMPLE_SUBJECT_DID,
      role: EXAMPLE_INDIVIDUAL_CONTROLLER_ROLE_VALUE,
      actorDids: [EXAMPLE_CONTROLLER_DID],
    }],
    evidence: { actorDid: EXAMPLE_CONTROLLER_DID },
  });
  const cloned = cloneImportedClinicalDocumentForDemo({
    bundle: originalBundle,
    clinicalCreator,
    createResourceId: () => EXAMPLE_IPS_COMPOSITION_IDENTIFIER,
  });
  assert.equal(cloned.entry[0].resource.author[0].reference, relatedPersonReference);
  assert.equal(cloned.entry[0].resource.attester[0].party.reference, relatedPersonReference);
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
    authenticatedActorDid: EXAMPLE_PROVIDER_ORGANIZATION_AUTHORIZATION_URN_CDS,
  }), /authenticated actor did:web/);
});
