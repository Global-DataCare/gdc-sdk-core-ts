// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import {
  ActorCapabilities,
  ActorKinds,
} from 'gdc-common-utils-ts/constants/actor-session';
import type {
  ActorKind,
  Capability,
} from 'gdc-common-utils-ts/models/actor-session';

export { ActorCapabilities, ActorKinds };
export type { ActorKind, Capability };

export type ActorSessionDescriptor = {
  actorKinds: ActorKind[];
  capabilities: Capability[];
  appType: 'Organization' | 'Family';
  profileId: string;
  profileDid?: string;
  role?: string;
};

export type ActorFacadeDescriptor = {
  actorKind: ActorKind;
  capabilities: Capability[];
  appType: 'Organization' | 'Family';
  profileId: string;
  profileDid?: string;
  role?: string;
};

export type ActorFlags = {
  organizationController?: boolean;
  organizationEmployee?: boolean;
  individualController?: boolean;
  individualMember?: boolean;
  professionalPhysician?: boolean;
  professionalParamedic?: boolean;
};

export type ActorSessionDescriptorInput = {
  appType: 'Organization' | 'Family';
  profileId: string;
  profileDid?: string;
  role?: string;
  actorFlags: ActorFlags;
};

const actorCapabilityMatrix: Record<ActorKind, Capability[]> = {
  [ActorKinds.HostOnboarding]: [
    ActorCapabilities.HostingActivateOrganization,
    ActorCapabilities.HostingConfirmOrder,
    ActorCapabilities.HostingDisableHost,
    ActorCapabilities.HostingPurgeHost,
  ],
  [ActorKinds.OrganizationController]: [
    ActorCapabilities.OrganizationCreateEmployee,
    ActorCapabilities.OrganizationDisableEmployee,
    ActorCapabilities.OrganizationPurgeEmployee,
    ActorCapabilities.OrganizationDisableTenant,
    ActorCapabilities.OrganizationPurgeTenant,
    ActorCapabilities.OrganizationRequestSmartToken,
  ],
  [ActorKinds.OrganizationEmployee]: [
    ActorCapabilities.OrganizationActivateDevice,
    ActorCapabilities.OrganizationIssueActivationCode,
    ActorCapabilities.OrganizationRequestSmartToken,
  ],
  [ActorKinds.IndividualController]: [
    ActorCapabilities.IndividualBootstrap,
    ActorCapabilities.IndividualDisable,
    ActorCapabilities.IndividualPurge,
    ActorCapabilities.IndividualIngestCommunication,
    ActorCapabilities.IndividualUpsertRelatedPerson,
    ActorCapabilities.IndividualMemberDisable,
    ActorCapabilities.IndividualMemberPurge,
    ActorCapabilities.ConsentGrantProfessionalAccess,
    ActorCapabilities.IndividualImportIps,
    ActorCapabilities.IndividualGenerateDigitalTwin,
  ],
  [ActorKinds.IndividualMember]: [
    ActorCapabilities.IndividualImportIps,
    ActorCapabilities.IndividualGenerateDigitalTwin,
    ActorCapabilities.IndividualUpsertRelatedPerson,
  ],
  [ActorKinds.Professional]: [
    ActorCapabilities.ProfessionalMedication,
    ActorCapabilities.ProfessionalAppointment,
    ActorCapabilities.ProfessionalRequestSmartToken,
  ],
};

/**
 * Filters a capability list so that only capabilities valid for the given actor remain.
 *
 * @param actorKind Actor role to evaluate against the capability matrix.
 * @param capabilities Candidate capabilities to filter.
 */
export function filterCapabilitiesForActor(
  actorKind: ActorKind,
  capabilities: Capability[],
): Capability[] {
  const allowed = new Set(actorCapabilityMatrix[actorKind]);
  return [...new Set(capabilities.filter(capability => allowed.has(capability)))];
}

/**
 * Expands a composite actor session descriptor into one facade descriptor per actor kind.
 *
 * Each resulting facade keeps only the capabilities that belong to its actor kind.
 *
 * @param descriptor Composite descriptor that may contain multiple actor kinds.
 */
export function expandActorSessionDescriptorToFacades(
  descriptor: ActorSessionDescriptor,
): ActorFacadeDescriptor[] {
  return [...new Set(descriptor.actorKinds)].map(actorKind => ({
    actorKind,
    capabilities: filterCapabilitiesForActor(actorKind, descriptor.capabilities),
    appType: descriptor.appType,
    profileId: descriptor.profileId,
    profileDid: descriptor.profileDid,
    role: descriptor.role,
  }));
}

/**
 * Builds a normalized actor session descriptor from boolean actor flags.
 *
 * @param input Session metadata plus actor flags used to derive actor kinds and capabilities.
 */
export function buildActorSessionDescriptorFromActorFlags(
  input: ActorSessionDescriptorInput,
): ActorSessionDescriptor {
  const actorKinds = new Set<ActorSessionDescriptor['actorKinds'][number]>();
  const capabilities = new Set<Capability>();

  if (input.actorFlags.organizationController) {
    actorKinds.add(ActorKinds.OrganizationController);
    capabilities.add(ActorCapabilities.OrganizationCreateEmployee);
    capabilities.add(ActorCapabilities.OrganizationDisableEmployee);
    capabilities.add(ActorCapabilities.OrganizationPurgeEmployee);
    capabilities.add(ActorCapabilities.OrganizationDisableTenant);
    capabilities.add(ActorCapabilities.OrganizationPurgeTenant);
    capabilities.add(ActorCapabilities.OrganizationRequestSmartToken);
  }
  if (input.actorFlags.organizationEmployee) {
    actorKinds.add(ActorKinds.OrganizationEmployee);
    capabilities.add(ActorCapabilities.OrganizationActivateDevice);
    capabilities.add(ActorCapabilities.OrganizationIssueActivationCode);
    capabilities.add(ActorCapabilities.OrganizationRequestSmartToken);
  }
  if (input.actorFlags.individualController) {
    actorKinds.add(ActorKinds.IndividualController);
    capabilities.add(ActorCapabilities.IndividualBootstrap);
    capabilities.add(ActorCapabilities.IndividualDisable);
    capabilities.add(ActorCapabilities.IndividualPurge);
    capabilities.add(ActorCapabilities.IndividualIngestCommunication);
    capabilities.add(ActorCapabilities.IndividualUpsertRelatedPerson);
    capabilities.add(ActorCapabilities.IndividualMemberDisable);
    capabilities.add(ActorCapabilities.IndividualMemberPurge);
    capabilities.add(ActorCapabilities.ConsentGrantProfessionalAccess);
    capabilities.add(ActorCapabilities.IndividualImportIps);
    capabilities.add(ActorCapabilities.IndividualGenerateDigitalTwin);
  }
  if (input.actorFlags.individualMember) {
    actorKinds.add(ActorKinds.IndividualMember);
    capabilities.add(ActorCapabilities.IndividualImportIps);
    capabilities.add(ActorCapabilities.IndividualGenerateDigitalTwin);
    capabilities.add(ActorCapabilities.IndividualUpsertRelatedPerson);
  }
  if (input.actorFlags.professionalPhysician) {
    actorKinds.add(ActorKinds.Professional);
    capabilities.add(ActorCapabilities.ProfessionalAppointment);
    capabilities.add(ActorCapabilities.ProfessionalMedication);
    capabilities.add(ActorCapabilities.ProfessionalRequestSmartToken);
  }
  if (input.actorFlags.professionalParamedic) {
    actorKinds.add(ActorKinds.Professional);
    capabilities.add(ActorCapabilities.ProfessionalMedication);
    capabilities.add(ActorCapabilities.ProfessionalRequestSmartToken);
  }

  return {
    actorKinds: [...actorKinds],
    capabilities: [...capabilities],
    appType: input.appType,
    profileId: input.profileId,
    profileDid: input.profileDid,
    role: input.role,
  };
}
