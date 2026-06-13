// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import {
  createLifecycleResultReader,
  type LifecycleResultReader,
} from 'gdc-common-utils-ts/utils/lifecycle-result-reader';
import {
  type IndividualOrganizationLifecycleClaims,
  IndividualOrganizationLifecycleDraft,
  IndividualOrganizationLifecycleOperations,
  type IndividualOrganizationLifecycleDraftState,
} from 'gdc-common-utils-ts/utils/individual-organization-lifecycle';

export {
  IndividualOrganizationLifecycleOperations,
};

export type IndividualOrganizationLifecycleDraftInput =
  Partial<IndividualOrganizationLifecycleDraftState>;

export interface IndividualOrganizationLifecycleFacade {
  createDraft(initial?: IndividualOrganizationLifecycleDraftInput): IndividualOrganizationLifecycleDraft;
  createDisableDraft(initial?: Omit<IndividualOrganizationLifecycleDraftInput, 'operation'>): IndividualOrganizationLifecycleDraft;
  createPurgeDraft(initial?: Omit<IndividualOrganizationLifecycleDraftInput, 'operation'>): IndividualOrganizationLifecycleDraft;
  setIdentifier(
    draft: IndividualOrganizationLifecycleDraft,
    identifier: string,
  ): IndividualOrganizationLifecycleDraft;
  setOwnerEmail(
    draft: IndividualOrganizationLifecycleDraft,
    email: string,
  ): IndividualOrganizationLifecycleDraft;
  setResourceId(
    draft: IndividualOrganizationLifecycleDraft,
    resourceId?: string,
  ): IndividualOrganizationLifecycleDraft;
  mergeClaims(
    draft: IndividualOrganizationLifecycleDraft,
    claims: IndividualOrganizationLifecycleClaims,
  ): IndividualOrganizationLifecycleDraft;
  readLifecycleResult(result: Record<string, unknown>): LifecycleResultReader;
}

/**
 * Thin neutral facade over the shared individual-organization lifecycle draft.
 *
 * Intent:
 * - keep `sdk-core` as the canonical public place where runtime packages
 *   discover lifecycle surface
 * - reuse the shared chainable draft from `gdc-common-utils-ts`
 * - expose one explicit readback entry point for lifecycle operation results
 */
export function createIndividualOrganizationLifecycleFacade():
IndividualOrganizationLifecycleFacade {
  return {
    createDraft(initial = {}) {
      return new IndividualOrganizationLifecycleDraft(initial);
    },
    createDisableDraft(initial = {}) {
      return new IndividualOrganizationLifecycleDraft({
        ...initial,
        operation: IndividualOrganizationLifecycleOperations.Disable,
      });
    },
    createPurgeDraft(initial = {}) {
      return new IndividualOrganizationLifecycleDraft({
        ...initial,
        operation: IndividualOrganizationLifecycleOperations.Purge,
      });
    },
    setIdentifier(draft, identifier) {
      return draft.setIdentifier(identifier);
    },
    setOwnerEmail(draft, email) {
      return draft.setOwnerEmail(email);
    },
    setResourceId(draft, resourceId) {
      return draft.setResourceId(resourceId);
    },
    mergeClaims(draft, claims) {
      return draft.mergeClaims(claims);
    },
    readLifecycleResult(result) {
      return createLifecycleResultReader(result);
    },
  };
}
