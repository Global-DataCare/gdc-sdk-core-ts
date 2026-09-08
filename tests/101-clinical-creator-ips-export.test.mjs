// Flow contract: reuse shared test fixtures and canonical types; do not introduce duplicated literals.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXAMPLE_CLIENT_INSTANCE_UUID,
  EXAMPLE_EMAIL_PROFESSIONAL,
  EXAMPLE_HEALTHCARE_ACTOR_ROLE_RECEPTIONIST,
  EXAMPLE_KYC_CONTROLLER_TELEPHONE,
  EXAMPLE_KYC_CONTROLLER_USER_UUID,
  EXAMPLE_KYC_CONTROLLER_UUID,
  EXAMPLE_PROVIDER_ORGANIZATION_AUTHORIZATION_URN_CDS,
  EXAMPLE_PRIVATE_INDIVIDUAL_UUID,
  CompositionAttesterModes,
  FhirIpsCreatorKinds,
  HealthcareActorRoleCodes,
  HL7_CODING_SYSTEM_V3_ROLE_CODE,
  StableActorContactKinds,
  UrnPrefixes,
  buildStableActorIdentifier,
} from 'gdc-common-utils-ts';
import {
  ClinicalSourceAuthorSelections,
  normalizeClinicalCreatorBinding,
  resolveClinicalCreatorIpsExport,
} from '../dist/index.js';

test('normalizes a high-level personal creator binding before transport', () => {
  const binding = normalizeClinicalCreatorBinding({
    kind: FhirIpsCreatorKinds.IndividualMember,
    actorIdentifier: EXAMPLE_KYC_CONTROLLER_USER_UUID,
    assignmentIdentifier: EXAMPLE_KYC_CONTROLLER_UUID,
    ownerIdentifier: EXAMPLE_PRIVATE_INDIVIDUAL_UUID,
    role: HealthcareActorRoleCodes.Controller,
  });

  assert.deepEqual(binding, {
    kind: FhirIpsCreatorKinds.IndividualMember,
    actorIdentifier: `${UrnPrefixes.Uuid}${EXAMPLE_KYC_CONTROLLER_USER_UUID}`,
    authorIdentifier: `${UrnPrefixes.Uuid}${EXAMPLE_KYC_CONTROLLER_UUID}`,
    ownerIdentifier: `${UrnPrefixes.Uuid}${EXAMPLE_PRIVATE_INDIVIDUAL_UUID}`,
    role: `${HL7_CODING_SYSTEM_V3_ROLE_CODE}|${HealthcareActorRoleCodes.Controller}`,
  });
});

test('resolves portal, telephone and DCR channels to one organization author and professional attester', () => {
  const emailIdentifier = buildStableActorIdentifier({
    contactKind: StableActorContactKinds.Email,
    contact: EXAMPLE_EMAIL_PROFESSIONAL,
  });
  const telephoneIdentifier = buildStableActorIdentifier({
    contactKind: StableActorContactKinds.Phone,
    contact: EXAMPLE_KYC_CONTROLLER_TELEPHONE,
  });
  const binding = normalizeClinicalCreatorBinding({
    kind: FhirIpsCreatorKinds.Professional,
    actorIdentifier: EXAMPLE_KYC_CONTROLLER_USER_UUID,
    assignmentIdentifier: EXAMPLE_KYC_CONTROLLER_UUID,
    ownerIdentifier: EXAMPLE_PROVIDER_ORGANIZATION_AUTHORIZATION_URN_CDS,
    role: EXAMPLE_HEALTHCARE_ACTOR_ROLE_RECEPTIONIST,
    verifiedContactIdentifiers: [emailIdentifier, telephoneIdentifier],
    dcrClientIds: [EXAMPLE_CLIENT_INSTANCE_UUID],
  });

  for (const evidence of [
    { verifiedContactIdentifiers: [emailIdentifier] },
    { verifiedContactIdentifiers: [telephoneIdentifier] },
    { dcrClientId: EXAMPLE_CLIENT_INSTANCE_UUID },
  ]) {
    const exported = resolveClinicalCreatorIpsExport({ bindings: [binding], evidence });
    assert.equal(exported.provenance.authorReference, binding.ownerIdentifier);
    assert.deepEqual(exported.provenance.attesters, [{
      mode: CompositionAttesterModes.Professional,
      party: { reference: binding.authorIdentifier },
    }]);
    assert.deepEqual(exported.provenance.entries, exported.author.entries);
    // Compatibility-only projection: older consumers still see the role as author.
    assert.equal(exported.author.authorReference, binding.authorIdentifier);
    assert.equal(exported.author.entries[0].resource.resourceType, 'Organization');
    assert.equal(exported.author.entries[1].resource.resourceType, 'Practitioner');
    assert.equal(exported.author.entries[2].resource.resourceType, 'PractitionerRole');
    assert.deepEqual(exported.permissionActor, {
      actorIdentifier: binding.authorIdentifier,
      actorRole: binding.role,
    });
  }
});

test('keeps personal content author selection separate from the member attester', () => {
  const binding = normalizeClinicalCreatorBinding({
    kind: FhirIpsCreatorKinds.IndividualMember,
    actorIdentifier: EXAMPLE_KYC_CONTROLLER_USER_UUID,
    assignmentIdentifier: EXAMPLE_KYC_CONTROLLER_UUID,
    ownerIdentifier: EXAMPLE_PRIVATE_INDIVIDUAL_UUID,
    role: HealthcareActorRoleCodes.Controller,
    dcrClientIds: [EXAMPLE_CLIENT_INSTANCE_UUID],
  });
  const evidence = { dcrClientId: EXAMPLE_CLIENT_INSTANCE_UUID };

  const memberCreatedByDefault = resolveClinicalCreatorIpsExport({ bindings: [binding], evidence });
  assert.equal(memberCreatedByDefault.provenance.authorReference, binding.authorIdentifier);
  assert.equal(memberCreatedByDefault.provenance.attesters[0].party.reference, binding.authorIdentifier);

  const memberCreated = resolveClinicalCreatorIpsExport({
    bindings: [binding],
    evidence,
    sourceAuthor: ClinicalSourceAuthorSelections.Creator,
  });
  assert.equal(memberCreated.provenance.authorReference, binding.authorIdentifier);
  assert.equal(memberCreated.provenance.attesters[0].party.reference, binding.authorIdentifier);

  // The member transcribes content originated by the individual: the owner is
  // author, while the same registered RelatedPerson performs the attestation.
  const individualCreated = resolveClinicalCreatorIpsExport({
    bindings: [binding],
    evidence,
    sourceAuthor: ClinicalSourceAuthorSelections.Owner,
  });
  assert.equal(individualCreated.provenance.authorReference, binding.ownerIdentifier);
  assert.equal(individualCreated.provenance.attesters[0].party.reference, binding.authorIdentifier);

  // This literal is deliberately invalid: browsers cannot inject an author.
  assert.throws(() => resolveClinicalCreatorIpsExport({
    bindings: [binding],
    evidence,
    sourceAuthor: 'urn:uuid:browser-supplied-author',
  }), /sourceAuthor/);
});

test('fails closed when an authenticated channel has no creator binding', () => {
  assert.throws(() => resolveClinicalCreatorIpsExport({
    bindings: [],
    evidence: { dcrClientId: EXAMPLE_CLIENT_INSTANCE_UUID },
  }), /No clinical creator binding matches/);
});
