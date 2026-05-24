// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import type {
  ActiveConsentView,
  ConsentActorDescriptor,
  ConsentCoverageRequest,
  ConsentRuleMatch,
  EffectiveAccessEvaluation,
  MissingPermissionSet,
} from 'gdc-common-utils-ts/models/consent-access';
import {
  evaluateConsentCoverage,
  groupActiveConsentsByTarget,
} from 'gdc-common-utils-ts/utils/consent';
import { ResourceTypesFhirR4 } from 'gdc-common-utils-ts/constants/fhir-resource-types';
import type { ConsentRule } from 'gdc-common-utils-ts/models/consent-rule';
import type { BundleSearchQuery, CommunicationInput } from './communication-bundle-contracts.js';

export type PermissionRequestCommunicationInput = Readonly<{
  subject: string;
  requester: ConsentActorDescriptor;
  requesterRole?: string;
  purpose?: string;
  missing: MissingPermissionSet;
  communicationIdentifier?: string;
  thid?: string;
  sender?: string;
  recipient?: string | string[];
  justification?: string;
  documentContentCid?: string;
}>;

export type PermissionRequestCommunicationLookup = Readonly<{
  subject: string;
  communicationIdentifier?: string;
  thid?: string;
  contentCid?: string;
}>;

/**
 * Runtime-neutral interface for subject consent providers.
 */
export interface ActiveConsentProvider {
  getActiveConsentsForSubject(subject: string): Promise<ConsentRule[]>;
}

/**
 * Fetches active consent rules for a subject from an injected provider and
 * groups them by target family for controller-facing inspection.
 *
 * @param provider Consent provider abstraction.
 * @param subject Subject identifier whose active consents must be loaded.
 * @param now Optional evaluation timestamp.
 */
export async function groupConsentsForControllerView(
  provider: ActiveConsentProvider,
  subject: string,
  now?: string | Date,
): Promise<ActiveConsentView> {
  const rules = await provider.getActiveConsentsForSubject(subject);
  return groupActiveConsentsByTarget(rules, { subject, now });
}

/**
 * Evaluates requested access against the full active consent set for a subject.
 *
 * @param provider Consent provider abstraction.
 * @param request Access request to evaluate.
 */
export async function evaluateRequestedAccess(
  provider: ActiveConsentProvider,
  request: ConsentCoverageRequest,
): Promise<EffectiveAccessEvaluation> {
  const rules = await provider.getActiveConsentsForSubject(String(request.subject || '').trim());
  return evaluateConsentCoverage(rules, request);
}

/**
 * Returns the missing-permission projection for a consent evaluation.
 *
 * @param evaluation Result returned by `evaluateRequestedAccess(...)` or `evaluateConsentCoverage(...)`.
 */
export function getMissingPermissions(
  evaluation: EffectiveAccessEvaluation,
): MissingPermissionSet {
  return evaluation.missing;
}

function compact(values: Array<string | undefined>): string[] {
  return values.map((value) => String(value || '').trim()).filter(Boolean);
}

/**
 * Builds the canonical `Communication` payload used to request additional
 * subject-controlled permissions when the current SMART request is not covered.
 *
 * Push/email/SMS remain notification channels around this canonical
 * `Communication`, not the primary contract.
 *
 * @param input Permission-request details to encode.
 */
export function buildPermissionRequestCommunication(
  input: PermissionRequestCommunicationInput,
): CommunicationInput {
  const requester = input.requester;
  const requesterTargets = compact([
    requester.did,
    requester.email,
    requester.phone,
    requester.organizationDid,
    requester.organizationUrl,
    requester.jurisdiction,
  ]);
  const text = input.justification
    || `Missing consent coverage for ${input.missing.sections.join(', ') || 'requested sections'}`
      + `${input.missing.resourceTypes.length ? ` and ${input.missing.resourceTypes.join(', ')}` : ''}.`;

  const claims: Record<string, unknown> = {
    '@context': 'org.hl7.fhir.r4',
    'Communication.identifier': input.communicationIdentifier,
    'Communication.subject': input.subject,
    'Communication.recipient': input.recipient,
    'Communication.sender': input.sender,
    'AccessRequest.requester-target': requesterTargets.join(','),
    'AccessRequest.requester-role': input.requesterRole,
    'AccessRequest.purpose': input.purpose,
    'AccessRequest.missing-sections': input.missing.sections.join(','),
    'AccessRequest.missing-resource-types': input.missing.resourceTypes.join(','),
    'AccessRequest.document-content-cid': input.documentContentCid,
  };

  return {
    thid: input.thid,
    subject: input.subject,
    sender: input.sender,
    recipient: input.recipient,
    category: ['permission-request'],
    text,
    claims,
  };
}

/**
 * Builds a canonical subject-scoped `Bundle/_search` query for recovering a
 * permission-request `Communication` by stable identifiers.
 *
 * Retrieval keys supported by the current helper:
 * - `Communication.identifier`
 * - `thid`
 * - `DocumentReference.contenthash` (`z<base58>` CID)
 *
 * @param input Stable lookup keys for the permission request.
 */
export function buildPermissionRequestCommunicationLookupQuery(
  input: PermissionRequestCommunicationLookup,
): BundleSearchQuery {
  const searchParams: Record<string, string> = {};
  if (input.communicationIdentifier) searchParams['Communication.identifier'] = input.communicationIdentifier;
  if (input.contentCid) searchParams['DocumentReference.contenthash'] = input.contentCid;

  return {
    subject: input.subject,
    includedTypes: [
      ResourceTypesFhirR4.Communication,
      ResourceTypesFhirR4.DocumentReference,
    ],
    thid: input.thid,
    searchParams,
  };
}

export type {
  ActiveConsentView,
  ConsentActorDescriptor,
  ConsentCoverageRequest,
  ConsentRuleMatch,
  EffectiveAccessEvaluation,
  MissingPermissionSet,
};
