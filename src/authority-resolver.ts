// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import type {
  AuthorityCatalogRecord,
  AuthorityResolution,
  AuthorityResolutionInput,
} from 'gdc-common-utils-ts/models/authority-resolution';
import {
  buildLegacyAuthorityResolution,
  resolveAuthorityBaseUrl,
} from 'gdc-common-utils-ts/utils/authority-resolution';

export type {
  AuthorityCatalogRecord,
  AuthorityResolution,
  AuthorityResolutionInput,
} from 'gdc-common-utils-ts/models/authority-resolution';

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function startsWithAny(value: string, prefixes: readonly string[] | undefined): boolean {
  const normalized = normalizeString(value);
  if (!normalized || !prefixes?.length) return false;
  return prefixes.some((prefix) => normalized.startsWith(normalizeString(prefix)));
}

function equalsIgnoreCase(left: string, right: string): boolean {
  return normalizeString(left).toLowerCase() === normalizeString(right).toLowerCase();
}

function matchesRecord(record: AuthorityCatalogRecord, input: AuthorityResolutionInput): boolean {
  if (normalizeString(input.authorityDidWeb) && equalsIgnoreCase(record.authorityDidWeb, input.authorityDidWeb || '')) {
    return true;
  }
  if (normalizeString(input.authorityBaseUrl)) {
    const recordBaseUrl = resolveAuthorityBaseUrl({
      authorityBaseUrl: record.authorityBaseUrl,
      authorityDidWeb: record.authorityDidWeb,
    });
    const inputBaseUrl = resolveAuthorityBaseUrl({
      authorityBaseUrl: input.authorityBaseUrl,
      authorityDidWeb: input.authorityDidWeb,
    });
    if (recordBaseUrl && inputBaseUrl && equalsIgnoreCase(recordBaseUrl, inputBaseUrl)) {
      return true;
    }
  }
  if (
    normalizeString(input.tenantId)
    && normalizeString(input.jurisdiction)
    && normalizeString(input.sector)
    && equalsIgnoreCase(record.tenantId || '', input.tenantId || '')
    && equalsIgnoreCase(record.jurisdiction || '', input.jurisdiction || '')
    && equalsIgnoreCase(record.sector || '', input.sector || '')
  ) {
    return true;
  }
  if (startsWithAny(normalizeString(input.subjectDid), record.subjectDidPrefixes)) {
    return true;
  }
  if (startsWithAny(normalizeString(input.subjectSameAs), record.subjectSameAsPrefixes)) {
    return true;
  }
  return false;
}

/**
 * Runtime-neutral authority/host resolver contract.
 *
 * Typical usage:
 * - app code passes tenant context and optionally one subject identifier
 * - runtime returns the resolved host/ICA authority DID + base URL
 * - tenant-scoped hosted DID derivation happens after resolution, not before
 */
export interface AuthorityResolver {
  resolveAuthority(
    input: AuthorityResolutionInput,
  ): Promise<AuthorityResolution>;
}

/**
 * In-memory/shared resolver over preloaded authority catalog records.
 *
 * This is useful for:
 * - local/demo defaults
 * - backend startup preload
 * - browser/BFF bootstrap where the registry is already known
 */
export class StaticAuthorityResolver implements AuthorityResolver {
  private readonly records: readonly AuthorityCatalogRecord[];

  constructor(records: readonly AuthorityCatalogRecord[] = []) {
    this.records = [...records];
  }

  public async resolveAuthority(
    input: AuthorityResolutionInput,
  ): Promise<AuthorityResolution> {
    const record = this.records.find((entry) => matchesRecord(entry, input));
    if (record) {
      return {
        authorityDidWeb: record.authorityDidWeb,
        authorityBaseUrl: resolveAuthorityBaseUrl({
          authorityBaseUrl: record.authorityBaseUrl,
          authorityDidWeb: record.authorityDidWeb,
        }),
        tenantDidWeb: record.tenantDidWeb,
        metadataUrl: record.metadataUrl,
        source: 'catalog',
        matchedBy: normalizeString(input.subjectDid)
          ? 'subject-did'
          : normalizeString(input.subjectSameAs)
            ? 'subject-same-as'
            : normalizeString(input.authorityDidWeb)
              ? 'authority-did'
              : normalizeString(input.authorityBaseUrl)
                ? 'authority-base-url'
                : 'tenant-context',
        record,
      };
    }

    if (
      (normalizeString(input.authorityDidWeb) || normalizeString(input.authorityBaseUrl))
      && normalizeString(input.tenantId)
      && normalizeString(input.jurisdiction)
      && normalizeString(input.sector)
    ) {
      return buildLegacyAuthorityResolution({
        ...input,
        tenantId: normalizeString(input.tenantId),
        jurisdiction: normalizeString(input.jurisdiction),
        sector: normalizeString(input.sector),
      });
    }

    throw new Error(
      'AuthorityResolver could not resolve authority. Provide a matching catalog record or enough legacy fallback input (authorityDidWeb/authorityBaseUrl + tenantId + jurisdiction + sector).',
    );
  }
}
