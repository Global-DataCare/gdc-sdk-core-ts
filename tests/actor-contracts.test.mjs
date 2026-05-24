import test from 'node:test';
import assert from 'node:assert/strict';

import {
  expandActorSessionDescriptorToFacades,
  filterCapabilitiesForActor,
} from '../dist/index.js';

test('expandActorSessionDescriptorToFacades splits a family session into scoped facades', () => {
  const facades = expandActorSessionDescriptorToFacades({
    actorKinds: ['individual_controller', 'individual_member'],
    capabilities: [
      'individual.bootstrap',
      'individual.import_ips',
      'individual.generate_digital_twin',
      'consent.grant_professional_access',
    ],
    appType: 'Family',
    profileId: 'profile-family-1',
    profileDid: 'did:web:family:controller',
    role: 'controller',
  });

  assert.deepEqual(facades, [
    {
      actorKind: 'individual_controller',
      capabilities: ['individual.bootstrap', 'consent.grant_professional_access'],
      appType: 'Family',
      profileId: 'profile-family-1',
      profileDid: 'did:web:family:controller',
      role: 'controller',
    },
    {
      actorKind: 'individual_member',
      capabilities: ['individual.import_ips', 'individual.generate_digital_twin'],
      appType: 'Family',
      profileId: 'profile-family-1',
      profileDid: 'did:web:family:controller',
      role: 'controller',
    },
  ]);
});

test('filterCapabilitiesForActor removes capabilities owned by other actors', () => {
  assert.deepEqual(
    filterCapabilitiesForActor('organization_controller', [
      'organization.create_employee',
      'organization.issue_activation_code',
      'individual.import_ips',
    ]),
    ['organization.create_employee'],
  );
});
