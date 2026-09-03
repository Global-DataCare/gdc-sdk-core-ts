// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import {
  FhirIpsCreatorKinds,
  buildClinicalCreatorPermissionActor,
  buildFhirIpsCreatorAuthor,
  resolveClinicalCreatorBinding,
  type AuthenticatedClinicalCreatorEvidence,
  type ClinicalCreatorBinding,
  type ClinicalCreatorPermissionActor,
  type FhirIpsCreatorAuthor,
} from 'gdc-common-utils-ts/utils/fhir-ips-creator-identity';

export type ClinicalCreatorIpsExportInput = Readonly<{
  bindings: readonly ClinicalCreatorBinding[];
  /** Already authenticated profile/channel evidence; this function does not authenticate it. */
  evidence: AuthenticatedClinicalCreatorEvidence;
}>;

export type ClinicalCreatorIpsExport = Readonly<{
  binding: ClinicalCreatorBinding;
  author: FhirIpsCreatorAuthor;
  permissionActor: ClinicalCreatorPermissionActor;
}>;

/**
 * Resolves one authenticated channel to its durable role assignment and
 * projects the corresponding FHIR IPS author resources and Consent actor.
 *
 * This export-only helper does not alter direct clinical writes: callers keep
 * using `profile.actorDid` as `sender` and as the editable copy author.
 */
export function resolveClinicalCreatorIpsExport(
  input: ClinicalCreatorIpsExportInput,
): ClinicalCreatorIpsExport {
  const binding = resolveClinicalCreatorBinding(input.bindings, input.evidence);
  if (!binding) {
    throw new Error('No clinical creator binding matches the authenticated channel.');
  }

  const common = {
    kind: binding.kind,
    actorIdentifier: binding.actorIdentifier,
    authorIdentifier: binding.authorIdentifier,
  } as const;
  const author = binding.kind === FhirIpsCreatorKinds.Professional
    ? buildFhirIpsCreatorAuthor({
        ...common,
        kind: FhirIpsCreatorKinds.Professional,
        organizationReference: binding.ownerIdentifier,
        role: binding.role,
      })
    : binding.kind === FhirIpsCreatorKinds.IndividualMember
      ? buildFhirIpsCreatorAuthor({
          ...common,
          kind: FhirIpsCreatorKinds.IndividualMember,
          subjectReference: binding.ownerIdentifier,
          role: binding.role,
        })
      : buildFhirIpsCreatorAuthor({
          ...common,
          kind: FhirIpsCreatorKinds.IndividualSubject,
          subjectReference: binding.ownerIdentifier,
        });

  return {
    binding,
    author,
    permissionActor: buildClinicalCreatorPermissionActor(binding),
  };
}

export type {
  AuthenticatedClinicalCreatorEvidence,
  ClinicalCreatorBinding,
  ClinicalCreatorPermissionActor,
  FhirIpsCreatorAuthor,
} from 'gdc-common-utils-ts/utils/fhir-ips-creator-identity';
export {
  FhirIpsCreatorKinds,
  buildClinicalCreatorPermissionActor,
  buildFhirIpsCreatorAuthor,
  resolveClinicalCreatorBinding,
} from 'gdc-common-utils-ts/utils/fhir-ips-creator-identity';
