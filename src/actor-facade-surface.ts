// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { ActorKinds } from 'gdc-common-utils-ts/constants/actor-session';
import type { ActorKind } from 'gdc-common-utils-ts/models/actor-session';

/**
 * Canonical facade method names shared across runtime packages.
 *
 * Keep this vocabulary in `sdk-core` so:
 * - actor-scoped runtime facades do not drift independently
 * - tests can assert allowed surface without repeating inline strings
 * - docs can point to one neutral source of truth
 */
export const ActorFacadeMethods = Object.freeze({
  activateOrganizationInGatewayFromIcaProof: 'activateOrganizationInGatewayFromIcaProof',
  activateEmployeeDeviceWithActivationRequest: 'activateEmployeeDeviceWithActivationRequest',
  confirmLegalOrganizationOrder: 'confirmLegalOrganizationOrder',
  confirmIndividualOrganizationOrder: 'confirmIndividualOrganizationOrder',
  createOrganizationEmployee: 'createOrganizationEmployee',
  disableHost: 'disableHost',
  disableEmployee: 'disableEmployee',
  disableTenant: 'disableTenant',
  disableIndividual: 'disableIndividual',
  disableIndividualMember: 'disableIndividualMember',
  disableIndividualOrganization: 'disableIndividualOrganization',
  generateDigitalTwinFromSubjectData: 'generateDigitalTwinFromSubjectData',
  getIdentitySameAs: 'getIdentitySameAs',
  getIdentityVC: 'getIdentityVC',
  grantProfessionalAccess: 'grantProfessionalAccess',
  importIpsOrFhirAndUpdateIndex: 'importIpsOrFhirAndUpdateIndex',
  ingestCommunicationAndUpdateIndex: 'ingestCommunicationAndUpdateIndex',
  searchCommunicationParticipants: 'searchCommunicationParticipants',
  getLatestIps: 'getLatestIps',
  purgeHost: 'purgeHost',
  purgeEmployee: 'purgeEmployee',
  purgeTenant: 'purgeTenant',
  purgeIndividual: 'purgeIndividual',
  purgeIndividualMember: 'purgeIndividualMember',
  purgeIndividualOrganization: 'purgeIndividualOrganization',
  requestSmartToken: 'requestSmartToken',
  retrieveControllerCredentialsFromIca: 'retrieveControllerCredentialsFromIca',
  retrieveLegalRepresentativeCredentialFromIca: 'retrieveLegalRepresentativeCredentialFromIca',
  retrieveOrganizationCredentialFromIca: 'retrieveOrganizationCredentialFromIca',
  listLicenses: 'listLicenses',
  searchLicenses: 'searchLicenses',
  searchClinicalBundle: 'searchClinicalBundle',
  searchOrganizationEmployees: 'searchOrganizationEmployees',
  startIndividualOrganization: 'startIndividualOrganization',
  submitAndPoll: 'submitAndPoll',
  buildIdentityVpPayload: 'buildIdentityVpPayload',
  buildUnsignedIdentityVpJwt: 'buildUnsignedIdentityVpJwt',
  upsertRelatedPersonAndPoll: 'upsertRelatedPersonAndPoll',
} as const);

export type ActorFacadeMethod = typeof ActorFacadeMethods[keyof typeof ActorFacadeMethods];

const actorFacadeSurfaceMatrix: Record<ActorKind, readonly ActorFacadeMethod[]> = {
  [ActorKinds.HostOnboarding]: [
    ActorFacadeMethods.activateOrganizationInGatewayFromIcaProof,
    ActorFacadeMethods.confirmLegalOrganizationOrder,
    ActorFacadeMethods.disableHost,
    ActorFacadeMethods.purgeHost,
    ActorFacadeMethods.submitAndPoll,
  ],
  [ActorKinds.OrganizationController]: [
    ActorFacadeMethods.activateEmployeeDeviceWithActivationRequest,
    ActorFacadeMethods.createOrganizationEmployee,
    ActorFacadeMethods.disableEmployee,
    ActorFacadeMethods.disableTenant,
    ActorFacadeMethods.listLicenses,
    ActorFacadeMethods.purgeEmployee,
    ActorFacadeMethods.purgeTenant,
    ActorFacadeMethods.requestSmartToken,
    ActorFacadeMethods.retrieveControllerCredentialsFromIca,
    ActorFacadeMethods.retrieveLegalRepresentativeCredentialFromIca,
    ActorFacadeMethods.retrieveOrganizationCredentialFromIca,
    ActorFacadeMethods.searchLicenses,
    ActorFacadeMethods.searchOrganizationEmployees,
    ActorFacadeMethods.submitAndPoll,
  ],
  [ActorKinds.OrganizationEmployee]: [
    ActorFacadeMethods.activateEmployeeDeviceWithActivationRequest,
    ActorFacadeMethods.requestSmartToken,
  ],
  [ActorKinds.IndividualController]: [
    ActorFacadeMethods.confirmIndividualOrganizationOrder,
    ActorFacadeMethods.disableIndividual,
    ActorFacadeMethods.disableIndividualMember,
    ActorFacadeMethods.disableIndividualOrganization,
    ActorFacadeMethods.generateDigitalTwinFromSubjectData,
    ActorFacadeMethods.getLatestIps,
    ActorFacadeMethods.grantProfessionalAccess,
    ActorFacadeMethods.importIpsOrFhirAndUpdateIndex,
    ActorFacadeMethods.ingestCommunicationAndUpdateIndex,
    ActorFacadeMethods.listLicenses,
    ActorFacadeMethods.purgeIndividual,
    ActorFacadeMethods.purgeIndividualMember,
    ActorFacadeMethods.purgeIndividualOrganization,
    ActorFacadeMethods.requestSmartToken,
    ActorFacadeMethods.searchClinicalBundle,
    ActorFacadeMethods.searchCommunicationParticipants,
    ActorFacadeMethods.searchLicenses,
    ActorFacadeMethods.startIndividualOrganization,
    ActorFacadeMethods.submitAndPoll,
    ActorFacadeMethods.upsertRelatedPersonAndPoll,
  ],
  [ActorKinds.IndividualMember]: [
    ActorFacadeMethods.requestSmartToken,
    ActorFacadeMethods.upsertRelatedPersonAndPoll,
  ],
  [ActorKinds.Professional]: [
    ActorFacadeMethods.buildIdentityVpPayload,
    ActorFacadeMethods.buildUnsignedIdentityVpJwt,
    ActorFacadeMethods.getIdentitySameAs,
    ActorFacadeMethods.getIdentityVC,
    ActorFacadeMethods.grantProfessionalAccess,
    ActorFacadeMethods.ingestCommunicationAndUpdateIndex,
    ActorFacadeMethods.requestSmartToken,
    ActorFacadeMethods.searchCommunicationParticipants,
    ActorFacadeMethods.submitAndPoll,
  ],
};

/**
 * Returns the canonical runtime-facing method surface for one actor kind.
 */
export function getActorFacadeMethods(actorKind: ActorKind): readonly ActorFacadeMethod[] {
  return actorFacadeSurfaceMatrix[actorKind] || [];
}

/**
 * Checks whether one actor kind should expose one facade method.
 */
export function actorKindSupportsFacadeMethod(
  actorKind: ActorKind,
  method: ActorFacadeMethod,
): boolean {
  return getActorFacadeMethods(actorKind).includes(method);
}

/**
 * Employee management belongs only to organization controllers.
 */
export function actorKindCanManageEmployees(actorKind: ActorKind): boolean {
  return actorKind === ActorKinds.OrganizationController;
}

/**
 * Related-person lifecycle belongs to the individual side, not organization employees.
 */
export function actorKindCanManageRelatedPersons(actorKind: ActorKind): boolean {
  return actorKind === ActorKinds.IndividualController || actorKind === ActorKinds.IndividualMember;
}
