import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ActorFacadeMethods,
  ActorKinds,
  actorKindCanManageEmployees,
  actorKindCanManageRelatedPersons,
  actorKindSupportsFacadeMethod,
  getActorFacadeMethods,
} from '../dist/index.js';

test('organization controller facade surface includes employee methods and excludes related-person methods', () => {
  const controllerSurface = getActorFacadeMethods(ActorKinds.OrganizationController);

  assert.equal(actorKindCanManageEmployees(ActorKinds.OrganizationController), true);
  assert.equal(actorKindCanManageEmployees(ActorKinds.Professional), false);
  assert.equal(controllerSurface.includes(ActorFacadeMethods.createOrganizationEmployee), true);
  assert.equal(controllerSurface.includes(ActorFacadeMethods.disableEmployee), true);
  assert.equal(controllerSurface.includes(ActorFacadeMethods.searchLicenses), true);
  assert.equal(controllerSurface.includes(ActorFacadeMethods.listLicenses), true);
  assert.equal(controllerSurface.includes(ActorFacadeMethods.purgeEmployee), true);
  assert.equal(controllerSurface.includes(ActorFacadeMethods.searchOrganizationEmployees), true);
  assert.equal(controllerSurface.includes(ActorFacadeMethods.upsertRelatedPersonAndPoll), false);
  assert.equal(actorKindSupportsFacadeMethod(
    ActorKinds.OrganizationController,
    ActorFacadeMethods.createOrganizationEmployee,
  ), true);
  assert.equal(actorKindSupportsFacadeMethod(
    ActorKinds.OrganizationController,
    ActorFacadeMethods.grantProfessionalAccess,
  ), false);
});

test('professional facade surface excludes employee lifecycle methods', () => {
  const professionalSurface = getActorFacadeMethods(ActorKinds.Professional);

  assert.equal(professionalSurface.includes(ActorFacadeMethods.createOrganizationEmployee), false);
  assert.equal(professionalSurface.includes(ActorFacadeMethods.disableEmployee), false);
  assert.equal(professionalSurface.includes(ActorFacadeMethods.purgeEmployee), false);
  assert.equal(professionalSurface.includes(ActorFacadeMethods.requestSmartToken), true);
  assert.equal(professionalSurface.includes(ActorFacadeMethods.ingestCommunicationAndUpdateIndex), true);
  assert.equal(professionalSurface.includes(ActorFacadeMethods.searchCommunicationParticipants), true);
});

test('individual-side facade surface owns related-person management and not organization employee lifecycle', () => {
  assert.equal(actorKindCanManageRelatedPersons(ActorKinds.IndividualController), true);
  assert.equal(actorKindCanManageRelatedPersons(ActorKinds.IndividualMember), true);
  assert.equal(actorKindCanManageRelatedPersons(ActorKinds.OrganizationEmployee), false);
  assert.equal(actorKindSupportsFacadeMethod(
    ActorKinds.IndividualController,
    ActorFacadeMethods.upsertRelatedPersonAndPoll,
  ), true);
  assert.equal(actorKindSupportsFacadeMethod(
    ActorKinds.IndividualController,
    ActorFacadeMethods.searchClinicalBundle,
  ), true);
  assert.equal(actorKindSupportsFacadeMethod(
    ActorKinds.IndividualController,
    ActorFacadeMethods.searchCommunicationParticipants,
  ), true);
  assert.equal(actorKindSupportsFacadeMethod(
    ActorKinds.IndividualController,
    ActorFacadeMethods.searchLicenses,
  ), true);
  assert.equal(actorKindSupportsFacadeMethod(
    ActorKinds.IndividualController,
    ActorFacadeMethods.listLicenses,
  ), true);
  assert.equal(actorKindSupportsFacadeMethod(
    ActorKinds.IndividualController,
    ActorFacadeMethods.getLatestIps,
  ), true);
  assert.equal(actorKindSupportsFacadeMethod(
    ActorKinds.IndividualController,
    ActorFacadeMethods.createOrganizationEmployee,
  ), false);
});

test('license list/search is advertised in actor facade surfaces once GW exposes License/_search', () => {
  const controllerSurface = getActorFacadeMethods(ActorKinds.OrganizationController);
  assert.equal(controllerSurface.includes(ActorFacadeMethods.searchLicenses), true);
  assert.equal(controllerSurface.includes(ActorFacadeMethods.listLicenses), true);
});

test('host onboarding facade surface is declared in sdk-core for shared runtime consumption', () => {
  const hostSurface = getActorFacadeMethods(ActorKinds.HostOnboarding);

  assert.equal(hostSurface.includes(ActorFacadeMethods.activateOrganizationInGatewayFromIcaProof), true);
  assert.equal(hostSurface.includes(ActorFacadeMethods.confirmLegalOrganizationOrder), true);
  assert.equal(hostSurface.includes(ActorFacadeMethods.disableHost), true);
  assert.equal(hostSurface.includes(ActorFacadeMethods.purgeHost), true);
  assert.equal(hostSurface.includes(ActorFacadeMethods.submitAndPoll), true);
  assert.equal(hostSurface.includes(ActorFacadeMethods.createOrganizationEmployee), false);
});
