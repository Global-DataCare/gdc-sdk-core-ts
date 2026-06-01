// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { ResourceTypesFhirR4 } from 'gdc-common-utils-ts/constants/fhir-resource-types';
import { ClaimConsent } from 'gdc-common-utils-ts/models/consent-rule';
import { CommunicationClaim } from 'gdc-common-utils-ts/models/interoperable-claims/communication-claims';
import type { CommunicationInput } from './communication-bundle-contracts.js';
import {
  addClaimsResourceToDraft,
  type CommunicationDraft,
} from './communication-draft.js';
import type { ResourceAttachmentOptions } from './communication-resource-helpers.js';

export const ConsentCommunicationOperationKinds = Object.freeze({
  Add: 'add',
  Update: 'update',
  Disable: 'disable',
  Enable: 'enable',
  Delete: 'delete',
});

export type ConsentCommunicationOperationKind =
  typeof ConsentCommunicationOperationKinds[keyof typeof ConsentCommunicationOperationKinds];

export const ConsentCommunicationTargetKinds = Object.freeze({
  Professional: 'professional',
  Person: 'person',
  Organization: 'organization',
  Department: 'department',
  Office: 'office',
});

export type ConsentCommunicationTargetKind =
  typeof ConsentCommunicationTargetKinds[keyof typeof ConsentCommunicationTargetKinds];

export type ConsentCommunicationSectionSelection = Readonly<{
  /** Core IPS sections (typically 12-16 sections). */
  core: string[];
  /** Extended sections outside the core IPS subset (optional). */
  extended?: string[];
}>;

export type ConsentCommunicationTarget = Readonly<{
  kind: ConsentCommunicationTargetKind;
  /** Canonical actor identifier: did:web, email, phone token, organization id, etc. */
  identifier: string;
  /**
   * Professional roles to apply.
   * - professional/person targets usually carry one role
   * - organization/department/office can carry many roles
   */
  roles?: string[];
}>;

export type ConsentCommunicationOperationInput = Readonly<{
  operationKind: ConsentCommunicationOperationKind;
  operationId: string;
  subject: string;
  purpose: string;
  target: ConsentCommunicationTarget;
  sections: ConsentCommunicationSectionSelection;
  consentIdentifier?: string;
  consentDate?: string;
  periodStart?: string;
  periodEnd?: string;
  codeDisplay?: string;
  sourcePortalUrl?: string;
  attachmentUrl?: string;
  attachmentContentType?: string;
  attachmentTitle?: string;
  noteText?: string;
}>;

export type ConsentCommunicationBatchInput = Readonly<{
  thid?: string;
  subject: string;
  sender?: string;
  recipient?: string | string[];
  operations: ConsentCommunicationOperationInput[];
  summaryText?: string;
}>;

function unique(values: readonly string[] | undefined): string[] {
  if (!values?.length) return [];
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function setClaimValues(
  claims: Record<string, unknown>,
  claimKey: string,
  values: readonly string[],
): Record<string, unknown> {
  return {
    ...claims,
    [claimKey]: unique(values).join(','),
  };
}

function normalizeOperation(input: ConsentCommunicationOperationInput): ConsentCommunicationOperationInput {
  const core = unique(input.sections.core);
  const extended = unique(input.sections.extended);
  const roles = unique(input.target.roles);
  return {
    ...input,
    operationId: String(input.operationId || '').trim(),
    subject: String(input.subject || '').trim(),
    purpose: String(input.purpose || '').trim(),
    target: {
      ...input.target,
      identifier: String(input.target.identifier || '').trim(),
      roles,
    },
    sections: {
      core,
      ...(extended.length ? { extended } : {}),
    },
  };
}

/**
 * Asserts that the provided operation has the minimum canonical fields.
 * This helper is runtime-neutral and does not perform any network I/O.
 */
export function assertConsentCommunicationOperationInput(
  input: ConsentCommunicationOperationInput,
): ConsentCommunicationOperationInput {
  const normalized = normalizeOperation(input);
  if (!normalized.operationId) {
    throw new TypeError('operationId is required.');
  }
  if (!normalized.subject) {
    throw new TypeError('subject is required.');
  }
  if (!normalized.purpose) {
    throw new TypeError('purpose is required.');
  }
  if (!normalized.target.identifier) {
    throw new TypeError('target.identifier is required.');
  }
  if (normalized.sections.core.length === 0) {
    throw new TypeError('sections.core must contain at least one section code.');
  }
  return normalized;
}

/**
 * Maps one abstract consent operation into claim fields suitable to be carried
 * as a claims-only `Consent` resource in `Communication.payload[]`.
 */
export function buildConsentOperationClaims(
  input: ConsentCommunicationOperationInput,
): Record<string, unknown> {
  const op = assertConsentCommunicationOperationInput(input);
  const roles = unique(op.target.roles);
  const coreSections = unique(op.sections.core);
  const extendedSections = unique(op.sections.extended);
  const allSections = unique([...coreSections, ...extendedSections]);
  const consentDate = String(op.consentDate || '').trim() || new Date().toISOString().slice(0, 10);

  let claims: Record<string, unknown> = {
    '@context': 'org.hl7.fhir.api',
    [ClaimConsent.subject]: op.subject,
    [ClaimConsent.identifier]: op.consentIdentifier,
    [ClaimConsent.date]: consentDate,
    [ClaimConsent.periodStart]: op.periodStart,
    [ClaimConsent.periodEnd]: op.periodEnd,
    [ClaimConsent.attachmentContentType]: op.attachmentContentType,
    [ClaimConsent.attachmentData]: op.attachmentUrl,
    [ClaimConsent.attachmentId]: op.attachmentTitle,
  };

  claims = setClaimValues(claims, ClaimConsent.actorIdentifier, [op.target.identifier]);
  claims = setClaimValues(claims, ClaimConsent.actorRole, roles);
  claims = setClaimValues(claims, ClaimConsent.purpose, [op.purpose]);
  claims = setClaimValues(claims, ClaimConsent.action, allSections);

  return claims;
}

/**
 * Appends one abstract consent operation as a claims-only `Consent` payload
 * entry inside a local `CommunicationDraft`.
 */
export function addConsentOperationToDraft(
  draft: CommunicationDraft,
  operation: ConsentCommunicationOperationInput,
  options: ResourceAttachmentOptions = {},
): CommunicationDraft {
  return addClaimsResourceToDraft(
    draft,
    ResourceTypesFhirR4.Consent,
    buildConsentOperationClaims(operation),
    {
      ...options,
      noteText: options.noteText || operation.noteText,
    },
  );
}

/**
 * Builds a `CommunicationInput` envelope that carries abstract consent
 * operations in top-level `claims` for BFF/backend orchestration.
 */
export function buildConsentOperationsCommunicationInput(
  input: ConsentCommunicationBatchInput,
): CommunicationInput {
  const operations = input.operations.map(assertConsentCommunicationOperationInput);
  const summaryText = String(input.summaryText || '').trim()
    || `Consent operations (${operations.length}) for subject ${input.subject}`;

  return {
    thid: input.thid,
    subject: String(input.subject || '').trim(),
    sender: input.sender,
    recipient: input.recipient,
    category: ['consent-management'],
    text: summaryText,
    claims: {
      '@context': 'org.hl7.fhir.api',
      [CommunicationClaim.Subject]: String(input.subject || '').trim(),
      [CommunicationClaim.Category]: 'consent-management',
      [CommunicationClaim.Text]: summaryText,
    },
    payload: { operations },
  };
}
