// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { ClaimsPersonSchemaorg } from 'gdc-common-utils-ts/constants/schemaorg';
import type { EmployeeClaims } from 'gdc-common-utils-ts/utils/employee';

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
  buildEmployeeClaims,
  buildEmployeeSearchBundle,
  buildEmployeeSearchQuery,
} from 'gdc-common-utils-ts/utils/employee';

function cloneClaims(claims?: EmployeeClaims): EmployeeClaims {
  return { ...(claims || {}) };
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
