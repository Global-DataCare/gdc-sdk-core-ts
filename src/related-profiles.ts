// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.
/**
 * @fileoverview Runtime-neutral helpers for `related profiles` projections.
 *
 * @architecture 101
 * - Shared DTO types come from `gdc-common-utils-ts`.
 * - This module only normalizes and extracts payloads for SDK consumers.
 * - Bundle parsing uses constants instead of inline response keys.
 */

import {
  RELATED_PROFILE_SEARCH_PARAM_ACTOR_IDENTIFIER,
  RELATED_PROFILE_SEARCH_PARAM_INCLUDE_INACTIVE,
  RELATED_PROFILE_SEARCH_PARAM_RELATIONSHIP,
  RELATED_PROFILE_SEARCH_PARAM_SUBJECT_ID,
  RELATED_PROFILE_SOURCE_RELATED_PERSON,
  type RelatedProfileSearchInput,
  type RelatedProfileSearchResult,
  type RelatedProfileSummary,
} from 'gdc-common-utils-ts/models/related-profile';

export {
  RELATED_PROFILE_SEARCH_PARAM_ACTOR_IDENTIFIER,
  RELATED_PROFILE_SEARCH_PARAM_INCLUDE_INACTIVE,
  RELATED_PROFILE_SEARCH_PARAM_RELATIONSHIP,
  RELATED_PROFILE_SEARCH_PARAM_SUBJECT_ID,
  RELATED_PROFILE_SOURCE_RELATED_PERSON,
} from 'gdc-common-utils-ts/models/related-profile';

const BUNDLE_DATA_KEY = 'data' as const;
const ENTRY_RESOURCE_KEY = 'resource' as const;
const RELATED_PROFILE_TOTAL_KEY = 'total' as const;

export type {
  RelatedProfileRole,
  RelatedProfileSearchInput,
  RelatedProfileSearchResult,
  RelatedProfileSource,
  RelatedProfileStatus,
  RelatedProfileSummary,
} from 'gdc-common-utils-ts/models/related-profile';

function normalizeOptionalText(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}

export function createRelatedProfileSearchInput(
  input: RelatedProfileSearchInput,
): RelatedProfileSearchInput {
  return {
    actorIdentifier: String(input.actorIdentifier || '').trim(),
    subjectId: normalizeOptionalText(input.subjectId),
    relationship: normalizeOptionalText(input.relationship),
    includeInactive: input.includeInactive === true,
  };
}

export function createRelatedProfileSummary(
  input: RelatedProfileSummary,
): RelatedProfileSummary {
  return {
    relationshipId: String(input.relationshipId || '').trim(),
    source: RELATED_PROFILE_SOURCE_RELATED_PERSON,
    subjectId: String(input.subjectId || '').trim(),
    actorIdentifier: normalizeOptionalText(input.actorIdentifier),
    actorDisplayName: normalizeOptionalText(input.actorDisplayName),
    actorTelecom: normalizeOptionalText(input.actorTelecom),
    relationship: normalizeOptionalText(input.relationship),
    role: input.role,
    isController: input.isController === true,
    status: input.status,
    claims: { ...(input.claims || {}) },
  };
}

export function createRelatedProfileSearchResult(
  input: RelatedProfileSearchResult,
): RelatedProfileSearchResult {
  const actorIdentifier = String(input.actorIdentifier || '').trim();
  const data = Array.isArray(input.data) ? input.data.map(createRelatedProfileSummary) : [];
  return {
    actorIdentifier,
    total:
      Number.isFinite(input.total) && Number(input.total) >= 0
        ? Math.floor(Number(input.total))
        : data.length,
    data,
  };
}

export function extractRelatedProfileSearchResultFromSubmitPollBody(
  body: unknown,
): RelatedProfileSearchResult | undefined {
  const entries = Array.isArray((body as any)?.[BUNDLE_DATA_KEY]) ? (body as any)[BUNDLE_DATA_KEY] : [];
  const resource = entries[0]?.[ENTRY_RESOURCE_KEY];
  if (!resource || typeof resource !== 'object') return undefined;
  const actorIdentifier = normalizeOptionalText(resource[RELATED_PROFILE_SEARCH_PARAM_ACTOR_IDENTIFIER]);
  if (!actorIdentifier) return undefined;
  return createRelatedProfileSearchResult({
    actorIdentifier,
    total: Number(resource[RELATED_PROFILE_TOTAL_KEY] ?? 0),
    data: Array.isArray(resource[BUNDLE_DATA_KEY]) ? resource[BUNDLE_DATA_KEY] : [],
  });
}

export function extractIncludeInactiveSearchFlag(value: unknown): boolean {
  return normalizeBoolean(value) === true;
}
