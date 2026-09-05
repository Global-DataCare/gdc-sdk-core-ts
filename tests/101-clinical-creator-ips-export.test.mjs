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
  EXAMPLE_PROVIDER_ORGANIZATION_DID,
  EXAMPLE_RELATED_PERSON_ROLE,
  EXAMPLE_SUBJECT_DID,
  CompositionAttesterModes,
  FhirIpsCreatorKinds,
  StableActorContactKinds,
  buildStableActorIdentifier,
} from 'gdc-common-utils-ts';
import {
  ClinicalSourceAuthorSelections,
  resolveClinicalCreatorIpsExport,
} from '../dist/index.js';

test('resolves portal, telephone and DCR channels to one organization author and professional attester', () => {
  const emailIdentifier = buildStableActorIdentifier({
    contactKind: StableActorContactKinds.Email,
    contact: EXAMPLE_EMAIL_PROFESSIONAL,
  });
  const telephoneIdentifier = buildStableActorIdentifier({
    contactKind: StableActorContactKinds.Phone,
    contact: EXAMPLE_KYC_CONTROLLER_TELEPHONE,
  });
  const binding = {
    kind: FhirIpsCreatorKinds.Professional,
    actorIdentifier: `urn:uuid:${EXAMPLE_KYC_CONTROLLER_USER_UUID}`,
    authorIdentifier: `urn:uuid:${EXAMPLE_KYC_CONTROLLER_UUID}`,
    ownerIdentifier: EXAMPLE_PROVIDER_ORGANIZATION_DID,
    role: EXAMPLE_HEALTHCARE_ACTOR_ROLE_RECEPTIONIST,
    verifiedContactIdentifiers: [emailIdentifier, telephoneIdentifier],
    dcrClientIds: [EXAMPLE_CLIENT_INSTANCE_UUID],
  };

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

test('keeps the content owner as author and the registered member as attester', () => {
  const binding = {
    kind: FhirIpsCreatorKinds.IndividualMember,
    actorIdentifier: `urn:uuid:${EXAMPLE_KYC_CONTROLLER_USER_UUID}`,
    authorIdentifier: `urn:uuid:${EXAMPLE_KYC_CONTROLLER_UUID}`,
    ownerIdentifier: EXAMPLE_SUBJECT_DID,
    role: EXAMPLE_RELATED_PERSON_ROLE,
    dcrClientIds: [EXAMPLE_CLIENT_INSTANCE_UUID],
  };
  const evidence = { dcrClientId: EXAMPLE_CLIENT_INSTANCE_UUID };

  const dictated = resolveClinicalCreatorIpsExport({ bindings: [binding], evidence });
  assert.equal(dictated.provenance.authorReference, EXAMPLE_SUBJECT_DID);
  assert.equal(dictated.provenance.attesters[0].party.reference, binding.authorIdentifier);

  const memberCreated = resolveClinicalCreatorIpsExport({
    bindings: [binding],
    evidence,
    sourceAuthor: ClinicalSourceAuthorSelections.Creator,
  });
  assert.equal(memberCreated.provenance.authorReference, binding.ownerIdentifier);
  assert.equal(memberCreated.provenance.attesters[0].party.reference, binding.authorIdentifier);

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
