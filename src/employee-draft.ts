// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { ClaimsPersonSchemaorg } from 'gdc-common-utils-ts/constants/schemaorg';

export type EmployeeClaims = Record<string, unknown>;

export type EmployeeSearchValue =
  | string
  | number
  | boolean
  | readonly (string | number | boolean)[];

export type EmployeeDraftInput = Readonly<{
  identifier?: string;
  email?: string;
  role?: string;
  worksFor?: string;
  memberOf?: string;
  memberOfOrgTaxId?: string;
  additionalClaims?: EmployeeClaims;
}>;

export type EmployeeBatchEntryOptions = Readonly<{
  requestType: string;
  requestMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  employeeClaims?: EmployeeClaims;
  resourceId?: string;
}>;

export type EmployeeSearchBundleOptions = Readonly<{
  employeeClaims?: Record<string, EmployeeSearchValue | undefined>;
}>;

function cloneClaims(claims?: EmployeeClaims): EmployeeClaims {
  return { ...(claims || {}) };
}

function normalizeSearchValue(value: EmployeeSearchValue): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(',');
  }
  return String(value).trim();
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

  setIdentifier(identifier: string): this {
    this.claims[ClaimsPersonSchemaorg.identifier] = String(identifier).trim();
    return this;
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

export function buildEmployeeClaims(input: EmployeeDraftInput): EmployeeClaims {
  const draft = new EmployeeDraft(input.additionalClaims);
  if (typeof input.identifier === 'string' && input.identifier.trim()) draft.setIdentifier(input.identifier);
  if (typeof input.email === 'string' && input.email.trim()) draft.setEmail(input.email);
  if (typeof input.role === 'string' && input.role.trim()) draft.setRole(input.role);
  if (typeof input.worksFor === 'string' && input.worksFor.trim()) draft.setWorksFor(input.worksFor);
  if (typeof input.memberOf === 'string' && input.memberOf.trim()) draft.setMemberOf(input.memberOf);
  if (typeof input.memberOfOrgTaxId === 'string' && input.memberOfOrgTaxId.trim()) {
    draft.setMemberOfOrgTaxId(input.memberOfOrgTaxId);
  }
  return draft.toClaims();
}

export function buildEmployeeBatchEntry(options: EmployeeBatchEntryOptions): {
  type: string;
  request: { method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' };
  meta: { claims: EmployeeClaims };
  resource: { resourceType: 'Employee'; id?: string; meta: { claims: EmployeeClaims } };
} {
  const claims = cloneClaims(options.employeeClaims);
  return {
    type: options.requestType,
    request: { method: options.requestMethod },
    meta: { claims },
    resource: {
      resourceType: 'Employee',
      ...(options.resourceId ? { id: options.resourceId } : {}),
      meta: { claims },
    },
  };
}

export function buildEmployeeSearchQuery(input: EmployeeSearchBundleOptions = {}): string {
  const params = new URLSearchParams();
  const claims = input.employeeClaims || {};
  for (const [key, value] of Object.entries(claims)) {
    if (value === undefined || value === null) continue;
    const normalized = normalizeSearchValue(value);
    if (!normalized) continue;
    params.set(key, normalized);
  }
  const query = params.toString();
  return query ? `Employee?${query}` : 'Employee';
}

export function buildEmployeeSearchBundle(input: EmployeeSearchBundleOptions = {}): {
  resourceType: 'Bundle';
  type: 'batch';
  entry: Array<{
    request: {
      method: 'GET';
      url: string;
    };
  }>;
} {
  return {
    resourceType: 'Bundle',
    type: 'batch',
    entry: [{
      request: {
        method: 'GET',
        url: buildEmployeeSearchQuery(input),
      },
    }],
  };
}
