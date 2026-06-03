// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { ClaimsPersonSchemaorg } from 'gdc-common-utils-ts/constants/schemaorg';
import {
  buildEmployeeBatchEntry,
  buildEmployeeSearchBundle,
} from 'gdc-common-utils-ts/utils/employee';
import type {
  EmployeeBatchEntryInput,
  EmployeeClaims,
  EmployeeSearchBundleInput,
} from 'gdc-common-utils-ts/utils/employee';

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
} from 'gdc-common-utils-ts/utils/employee';

function cloneClaims(claims?: EmployeeClaims): EmployeeClaims {
  return { ...(claims || {}) };
}

function cloneClaimValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return [...value] as T;
  }
  return value;
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

/**
 * Runtime-neutral employee bundle/session editor for developer-facing examples.
 *
 * Why this exists:
 * - onboarding examples should show an explicit editor/session pattern
 * - controller flows often start from "set claims, inspect them, then build
 *   create/update/search requests"
 * - callers should not need to assemble raw bundle entries by hand
 *
 * This class intentionally stays transport-neutral. It authors claims and
 * derives request payloads, but does not submit them.
 */
export class EmployeeBundleSession {
  private readonly claims: EmployeeClaims;

  constructor(initialClaims: EmployeeClaims = {}) {
    this.claims = {
      '@context': 'org.schema',
      ...cloneClaims(initialClaims),
    };
  }

  /** Returns one canonical claim value without exposing internal mutable state. */
  public getClaim(key: string): unknown {
    return cloneClaimValue(this.claims[key]);
  }

  /** Returns whether the editor currently carries a given canonical claim key. */
  public hasClaim(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.claims, key);
  }

  /** Sets one canonical claim value, replacing any previous value for that key. */
  public setClaim(key: string, value: unknown): this {
    this.claims[String(key).trim()] = cloneClaimValue(value);
    return this;
  }

  /** Appends a value to a repeated canonical claim, promoting scalars to arrays when needed. */
  public addClaim(key: string, value: unknown): this {
    const normalizedKey = String(key).trim();
    const current = this.claims[normalizedKey];
    if (current === undefined) {
      this.claims[normalizedKey] = cloneClaimValue(value);
      return this;
    }
    if (Array.isArray(current)) {
      this.claims[normalizedKey] = [...current, cloneClaimValue(value)];
      return this;
    }
    this.claims[normalizedKey] = [current, cloneClaimValue(value)];
    return this;
  }

  /** Removes one canonical claim from the current editor state. */
  public removeClaim(key: string): this {
    delete this.claims[String(key).trim()];
    return this;
  }

  /** Merges an externally prepared canonical claims object into the editor state. */
  public mergeClaims(claims: EmployeeClaims): this {
    Object.assign(this.claims, cloneClaims(claims));
    return this;
  }

  /** Convenience setter for the canonical employee technical identifier claim. */
  public setIdentifier(identifier: string): this {
    this.claims[ClaimsPersonSchemaorg.identifier] = String(identifier).trim();
    return this;
  }

  /** Convenience setter for the canonical employee email claim. */
  public setEmail(email: string): this {
    this.claims[ClaimsPersonSchemaorg.email] = String(email).trim();
    return this;
  }

  /** Convenience setter for the canonical employee occupational role claim. */
  public setRole(role: string): this {
    this.claims[ClaimsPersonSchemaorg.hasOccupationalRoleValue] = String(role).trim();
    return this;
  }

  /** Convenience setter for the canonical employee `worksFor` claim. */
  public setWorksFor(worksFor: string): this {
    this.claims[ClaimsPersonSchemaorg.worksFor] = String(worksFor).trim();
    return this;
  }

  /** Convenience setter for the canonical employee `memberOf` claim. */
  public setMemberOf(memberOf: string): this {
    this.claims[ClaimsPersonSchemaorg.memberOf] = String(memberOf).trim();
    return this;
  }

  /** Convenience setter for the canonical employee organization tax id claim. */
  public setMemberOfOrgTaxId(taxId: string): this {
    this.claims[ClaimsPersonSchemaorg.memberOfOrgTaxId] = String(taxId).trim();
    return this;
  }

  /** Serializes the current editor state into a detached canonical claims object. */
  public toClaims(): EmployeeClaims {
    return cloneClaims(this.claims);
  }

  /** Builds a canonical employee bundle entry from the current editor state. */
  public toBundleEntry(input: Omit<EmployeeBatchEntryInput, 'claims'>): ReturnType<typeof buildEmployeeBatchEntry> {
    return buildEmployeeBatchEntry({
      ...input,
      claims: this.toClaims(),
    });
  }

  /** Builds the canonical employee batch search bundle from the current editor state. */
  public toBundleSearch(input: Omit<EmployeeSearchBundleInput, 'claims'> = {}): ReturnType<typeof buildEmployeeSearchBundle> {
    return buildEmployeeSearchBundle({
      ...input,
      claims: this.toClaims(),
    });
  }
}
