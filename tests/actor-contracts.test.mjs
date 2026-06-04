import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ActorCapabilities,
  ActorKinds,
  expandActorSessionDescriptorToFacades,
  filterCapabilitiesForActor,
} from '../dist/index.js';

test('expandActorSessionDescriptorToFacades splits a family session into scoped facades', () => {
  const facades = expandActorSessionDescriptorToFacades({
    actorKinds: [ActorKinds.IndividualController, ActorKinds.IndividualMember],
    capabilities: [
      ActorCapabilities.IndividualBootstrap,
      ActorCapabilities.IndividualIngestCommunication,
      ActorCapabilities.IndividualUpsertRelatedPerson,
      ActorCapabilities.IndividualImportIps,
      ActorCapabilities.IndividualGenerateDigitalTwin,
      ActorCapabilities.ConsentGrantProfessionalAccess,
    ],
    appType: 'Family',
    profileId: 'profile-family-1',
    profileDid: 'did:web:family:controller',
    role: 'controller',
  });

  assert.deepEqual(facades, [
    {
      actorKind: ActorKinds.IndividualController,
      capabilities: [
        ActorCapabilities.IndividualBootstrap,
        ActorCapabilities.IndividualIngestCommunication,
        ActorCapabilities.IndividualUpsertRelatedPerson,
        ActorCapabilities.IndividualImportIps,
        ActorCapabilities.IndividualGenerateDigitalTwin,
        ActorCapabilities.ConsentGrantProfessionalAccess,
      ],
      appType: 'Family',
      profileId: 'profile-family-1',
      profileDid: 'did:web:family:controller',
      role: 'controller',
    },
    {
      actorKind: ActorKinds.IndividualMember,
      capabilities: [
        ActorCapabilities.IndividualUpsertRelatedPerson,
        ActorCapabilities.IndividualImportIps,
        ActorCapabilities.IndividualGenerateDigitalTwin,
      ],
      appType: 'Family',
      profileId: 'profile-family-1',
      profileDid: 'did:web:family:controller',
      role: 'controller',
    },
  ]);
});

test('filterCapabilitiesForActor removes capabilities owned by other actors', () => {
  assert.deepEqual(
    filterCapabilitiesForActor(ActorKinds.OrganizationController, [
      ActorCapabilities.OrganizationCreateEmployee,
      ActorCapabilities.OrganizationIssueActivationCode,
      ActorCapabilities.OrganizationRequestSmartToken,
      ActorCapabilities.IndividualImportIps,
    ]),
    [ActorCapabilities.OrganizationCreateEmployee, ActorCapabilities.OrganizationRequestSmartToken],
  );
});
