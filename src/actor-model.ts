// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

export type ActorKind =
  | 'host_onboarding'
  | 'organization_controller'
  | 'organization_employee'
  | 'individual_controller'
  | 'individual_member'
  | 'professional';

export type Capability =
  | 'organization.create_employee'
  | 'organization.issue_activation_code'
  | 'organization.request_smart_token'
  | 'individual.bootstrap'
  | 'individual.import_ips'
  | 'individual.generate_digital_twin'
  | 'consent.grant_professional_access'
  | 'professional.medication'
  | 'professional.appointment'
  | 'professional.request_smart_token';

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
  host_onboarding: [],
  organization_controller: [
    'organization.create_employee',
    'organization.request_smart_token',
  ],
  organization_employee: [
    'organization.issue_activation_code',
    'organization.request_smart_token',
  ],
  individual_controller: [
    'individual.bootstrap',
    'consent.grant_professional_access',
  ],
  individual_member: [
    'individual.import_ips',
    'individual.generate_digital_twin',
  ],
  professional: [
    'professional.medication',
    'professional.appointment',
    'professional.request_smart_token',
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
    actorKinds.add('organization_controller');
    capabilities.add('organization.create_employee');
  }
  if (input.actorFlags.organizationEmployee) {
    actorKinds.add('organization_employee');
    capabilities.add('organization.issue_activation_code');
  }
  if (input.actorFlags.individualController) {
    actorKinds.add('individual_controller');
    capabilities.add('individual.bootstrap');
    capabilities.add('consent.grant_professional_access');
  }
  if (input.actorFlags.individualMember) {
    actorKinds.add('individual_member');
    capabilities.add('individual.import_ips');
    capabilities.add('individual.generate_digital_twin');
  }
  if (input.actorFlags.professionalPhysician) {
    actorKinds.add('professional');
    capabilities.add('professional.appointment');
    capabilities.add('professional.medication');
    capabilities.add('professional.request_smart_token');
  }
  if (input.actorFlags.professionalParamedic) {
    actorKinds.add('professional');
    capabilities.add('professional.medication');
    capabilities.add('professional.request_smart_token');
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
