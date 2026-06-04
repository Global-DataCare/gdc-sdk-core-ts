// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { ClaimsPersonSchemaorg } from 'gdc-common-utils-ts/constants/schemaorg';
import {
  EmployeeBatchEntryTypes,
  EmployeeBundleMethods,
  buildEmployeeBatchEntry,
  buildEmployeeClaims,
  buildEmployeeSearchBundle as buildEmployeeSearchBundleBase,
} from 'gdc-common-utils-ts/utils/employee';
import type {
  EmployeeBatchEntryInput,
  EmployeeClaims,
  EmployeeSearchBundleInput,
} from 'gdc-common-utils-ts/utils/employee';

export type EmployeeBatchBundleInput = Readonly<{
  entries: readonly EmployeeBatchEntryInput[];
}>;

export type BuiltEmployeeBatchEntry = ReturnType<typeof buildEmployeeBatchEntry> & {
  fullUrl?: string;
};

export type EmployeeBatchEntriesBundleInput = Readonly<{
  entries: readonly BuiltEmployeeBatchEntry[];
}>;

export type EmployeePurgeBundleInput = Readonly<{
  identifier: string;
  resourceId?: string;
  resourceType?: 'Employee';
  requestType?: (typeof EmployeeBatchEntryTypes)['purge'];
}>;

export type {
  EmployeeBatchEntryInput,
  EmployeeBatchMethod,
  EmployeeClaims,
  EmployeeDraftInput,
  EmployeeSearchBundleInput,
  EmployeeSearchValue,
} from 'gdc-common-utils-ts/utils/employee';
export {
  buildEmployeeBatchEntry,
} from 'gdc-common-utils-ts/utils/employee';
export { BundleEditor } from 'gdc-common-utils-ts/utils/bundle-editor';
export { BundleReader } from 'gdc-common-utils-ts/utils/bundle-reader';
export { BundleEntryEditor, EmployeeEntryEditor } from 'gdc-common-utils-ts/utils/bundle-editor';

function normalizeEmployeeSearchClaims(
  claims?: EmployeeSearchBundleInput['claims'],
): EmployeeSearchBundleInput['claims'] {
  const normalized = { ...(claims || {}) };
  delete normalized['@context'];
  return normalized;
}

export { buildEmployeeClaims };

export function buildEmployeeSearchBundle(
  input: EmployeeSearchBundleInput = {},
): ReturnType<typeof buildEmployeeSearchBundleBase> {
  return buildEmployeeSearchBundleBase({
    ...input,
    claims: normalizeEmployeeSearchClaims(input.claims),
  });
}

export function buildEmployeeBatchBundle(
  input: EmployeeBatchBundleInput,
): {
  resourceType: 'Bundle';
  type: 'batch';
  entry: Array<BuiltEmployeeBatchEntry>;
} {
  return {
    resourceType: 'Bundle',
    type: 'batch',
    entry: [...input.entries].map((entry) => buildEmployeeBatchEntry(entry) as BuiltEmployeeBatchEntry),
  };
}

export function buildEmployeeBatchBundleFromEntries(
  input: EmployeeBatchEntriesBundleInput,
): {
  resourceType: 'Bundle';
  type: 'batch';
  entry: Array<BuiltEmployeeBatchEntry>;
} {
  return {
    resourceType: 'Bundle',
    type: 'batch',
    entry: [...input.entries],
  };
}

export function buildEmployeePurgeBundle(
  input: EmployeePurgeBundleInput,
): ReturnType<typeof buildEmployeeBatchBundle> {
  const identifier = input.identifier.trim();
  return buildEmployeeBatchBundle({
    entries: [
      {
        type: input.requestType || EmployeeBatchEntryTypes.purge,
        method: EmployeeBundleMethods.purge,
        resourceId: input.resourceId || identifier,
        resourceType: input.resourceType,
        claims: buildEmployeeClaims({ identifier }),
      },
    ],
  });
}

function cloneClaims(claims?: EmployeeClaims): EmployeeClaims {
  return { ...(claims || {}) };
}

function normalizeOptionalIdentifier(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = String(value).trim();
  return normalized ? normalized : undefined;
}

function createEmployeeIdentifierUrn(): string {
  const cryptoLike = globalThis as typeof globalThis & {
    crypto?: { randomUUID?: () => string };
  };
  const uuid = typeof cryptoLike.crypto?.randomUUID === 'function'
    ? cryptoLike.crypto.randomUUID()
    : `employee-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `urn:uuid:${uuid}`;
}

/**
 * Runtime-neutral builder for canonical `org.schema.Person.*` employee claims.
 *
 * This draft only authors claims. Transport/runtime layers remain responsible
 * for wrapping those claims into batches, DIDComm envelopes, portal requests,
 * or direct GW CORE HTTP calls.
 */
export class EmployeeDraft {
  private readonly claims: EmployeeClaims;

  constructor(initialClaims: EmployeeClaims = {}) {
    this.claims = {
      '@context': 'org.schema',
      ...cloneClaims(initialClaims),
    };
  }

  mergeClaims(claims: EmployeeClaims): this {
    Object.assign(this.claims, cloneClaims(claims));
    return this;
  }

  /**
   * Sets the canonical employee identifier.
   *
   * Empty, blank, `null`, or `undefined` values are normalized as "identifier
   * absent" and therefore remove the identifier from the current draft.
   */
  setIdentifier(identifier?: string | null): this {
    const normalized = normalizeOptionalIdentifier(identifier);
    if (!normalized) {
      delete this.claims[ClaimsPersonSchemaorg.identifier];
      return this;
    }
    this.claims[ClaimsPersonSchemaorg.identifier] = normalized;
    return this;
  }

  /** Returns the current canonical employee identifier when already present in memory. */
  getEmployeeIdentifier(): string | undefined {
    return normalizeOptionalIdentifier(this.claims[ClaimsPersonSchemaorg.identifier]);
  }

  /** Ensures the draft carries one canonical `urn:uuid:*` employee identifier. */
  ensureEmployeeIdentifier(): string {
    const existing = this.getEmployeeIdentifier();
    if (existing) {
      return existing;
    }
    const generated = createEmployeeIdentifierUrn();
    this.claims[ClaimsPersonSchemaorg.identifier] = generated;
    return generated;
  }

  setEmail(email: string): this {
    this.claims[ClaimsPersonSchemaorg.email] = String(email).trim();
    return this;
  }

  setRole(role: string): this {
    this.claims[ClaimsPersonSchemaorg.hasOccupationalRoleValue] = String(role).trim();
    return this;
  }

  setWorksFor(worksFor: string): this {
    this.claims[ClaimsPersonSchemaorg.worksFor] = String(worksFor).trim();
    return this;
  }

  setMemberOf(memberOf: string): this {
    this.claims[ClaimsPersonSchemaorg.memberOf] = String(memberOf).trim();
    return this;
  }

  setMemberOfOrgTaxId(taxId: string): this {
    this.claims[ClaimsPersonSchemaorg.memberOfOrgTaxId] = String(taxId).trim();
    return this;
  }

  toClaims(): EmployeeClaims {
    return cloneClaims(this.claims);
  }
}
