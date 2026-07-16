import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EXAMPLE_PROFILE_ORGANIZATION_DID,
  EXAMPLE_PROFILE_SESSION_INPUT,
} from 'gdc-common-utils-ts/examples';
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
    profileId: EXAMPLE_PROFILE_SESSION_INPUT.profileId.trim(),
    profileDid: EXAMPLE_PROFILE_ORGANIZATION_DID,
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
      profileId: EXAMPLE_PROFILE_SESSION_INPUT.profileId.trim(),
      profileDid: EXAMPLE_PROFILE_ORGANIZATION_DID,
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
      profileId: EXAMPLE_PROFILE_SESSION_INPUT.profileId.trim(),
      profileDid: EXAMPLE_PROFILE_ORGANIZATION_DID,
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
