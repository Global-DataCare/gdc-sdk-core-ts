// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import {
  FhirIpsCreatorKinds,
  buildClinicalCreatorPermissionActor,
  buildFhirIpsCreatorAuthor,
  buildFhirIpsCreatorProvenance,
  resolveClinicalCreatorBinding,
  type AuthenticatedClinicalCreatorEvidence,
  type ClinicalCreatorBinding,
  type ClinicalCreatorPermissionActor,
  type FhirIpsCreatorAuthor,
  type FhirIpsCreatorProvenance,
} from 'gdc-common-utils-ts/utils/fhir-ips-creator-identity';

export type ClinicalCreatorIpsExportInput = Readonly<{
  bindings: readonly ClinicalCreatorBinding[];
  /** Already authenticated profile/channel evidence; this function does not authenticate it. */
  evidence: AuthenticatedClinicalCreatorEvidence;
}>;

export type ClinicalCreatorIpsExport = Readonly<{
  binding: ClinicalCreatorBinding;
  /** Canonical Composition author, attester and supporting FHIR resources. */
  provenance: FhirIpsCreatorProvenance;
  /** @deprecated Use `provenance`; retained for rolling portal compatibility. */
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
  const provenance = binding.kind === FhirIpsCreatorKinds.Professional
    ? buildFhirIpsCreatorProvenance({
        ...common,
        kind: FhirIpsCreatorKinds.Professional,
        organizationReference: binding.ownerIdentifier,
        role: binding.role,
      })
    : binding.kind === FhirIpsCreatorKinds.IndividualMember
      ? buildFhirIpsCreatorProvenance({
          ...common,
          kind: FhirIpsCreatorKinds.IndividualMember,
          subjectReference: binding.ownerIdentifier,
          role: binding.role,
        })
      : buildFhirIpsCreatorProvenance({
          ...common,
          kind: FhirIpsCreatorKinds.IndividualSubject,
          subjectReference: binding.ownerIdentifier,
        });

  return {
    binding,
    provenance,
    author,
    permissionActor: buildClinicalCreatorPermissionActor(binding),
  };
}

export type {
  AuthenticatedClinicalCreatorEvidence,
  ClinicalCreatorBinding,
  ClinicalCreatorPermissionActor,
  FhirIpsCreatorAuthor,
  FhirIpsCreatorProvenance,
} from 'gdc-common-utils-ts/utils/fhir-ips-creator-identity';
export {
  FhirIpsCreatorKinds,
  buildClinicalCreatorPermissionActor,
  buildFhirIpsCreatorAuthor,
  buildFhirIpsCreatorProvenance,
  resolveClinicalCreatorBinding,
} from 'gdc-common-utils-ts/utils/fhir-ips-creator-identity';
