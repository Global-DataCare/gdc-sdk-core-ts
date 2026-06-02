// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import type {
  CommunicationInteroperableClaims,
} from 'gdc-common-utils-ts/utils/communication-claim-helpers';
import {
  addCommunicationCategoryList,
  getCommunicationCategoryList,
  getCommunicationIdentifier,
  getCommunicationSubject,
  getCommunicationText,
  setCommunicationCategory,
  setCommunicationIdentifier,
  setCommunicationSubject,
  setCommunicationText,
} from 'gdc-common-utils-ts/utils/communication-claim-helpers';
import type {
  InteroperableClaims as ConsentInteroperableClaims,
} from 'gdc-common-utils-ts/utils/consent-claim-helpers';
import {
  addActorIdentifierList,
  addPurposeList,
  addSectionList,
  getActorIdentifierList,
  getActorRoleList,
  getConsentDate,
  getConsentDecision,
  getConsentIdentifier,
  getConsentPeriodEnd,
  getConsentPeriodStart,
  getConsentSubject,
  getPurposeList,
  getSectionList,
  setActorIdentifierList,
  setActorRoleList,
  setConsentDate,
  setConsentDecision,
  setConsentIdentifier,
  setConsentPeriodEnd,
  setConsentPeriodStart,
  setConsentSubject,
  setPurposeList,
  setSectionList,
} from 'gdc-common-utils-ts/utils/consent-claim-helpers';
import type {
  MedicationInteroperableClaims,
} from 'gdc-common-utils-ts/utils/medication-claim-helpers';
import {
  addMedicationCategoryList,
  getMedicationCategoryList,
  getMedicationDosageAsNeeded,
  getMedicationDoseQuantityUnit,
  getMedicationDoseQuantityValue,
  getMedicationEffective,
  getMedicationIdentifier,
  getMedicationStatus,
  getMedicationSubject,
  getMedicationText,
  getMedicationTimingFrequency,
  getMedicationTimingPeriod,
  getMedicationTimingPeriodUnit,
  setMedicationCategoryList,
  setMedicationDosageAsNeeded,
  setMedicationDoseQuantityUnit,
  setMedicationDoseQuantityValue,
  setMedicationEffective,
  setMedicationIdentifier,
  setMedicationStatus,
  setMedicationSubject,
  setMedicationText,
  setMedicationTimingFrequency,
  setMedicationTimingPeriod,
  setMedicationTimingPeriodUnit,
} from 'gdc-common-utils-ts/utils/medication-claim-helpers';

/**
 * Thin fluent wrapper over canonical Communication flat-claim helpers from
 * `gdc-common-utils-ts`.
 *
 * Use this class when frontend, backend, or AI agents want discoverable,
 * chainable methods instead of importing many standalone helper functions.
 */
export class CommunicationClaims {
  private claims: CommunicationInteroperableClaims;

  private constructor(claims: CommunicationInteroperableClaims) {
    this.claims = { ...claims };
  }

  /**
   * Creates a new Communication claims editor with the provided base claims.
   */
  static create(
    claims: CommunicationInteroperableClaims = { '@context': 'org.hl7.fhir.r4' },
  ): CommunicationClaims {
    return new CommunicationClaims(claims);
  }

  /**
   * Wraps an existing Communication claims object so it can be edited fluently.
   */
  static fromClaims(claims: CommunicationInteroperableClaims): CommunicationClaims {
    return new CommunicationClaims(claims);
  }

  setIdentifier(value: unknown): this {
    this.claims = setCommunicationIdentifier(this.claims, value);
    return this;
  }

  getIdentifier(): string {
    return getCommunicationIdentifier(this.claims);
  }

  setSubject(value: unknown): this {
    this.claims = setCommunicationSubject(this.claims, value);
    return this;
  }

  getSubject(): string {
    return getCommunicationSubject(this.claims);
  }

  setCategoryList(values: string | readonly string[]): this {
    this.claims = setCommunicationCategory(this.claims, values);
    return this;
  }

  addCategoryList(values: string | readonly string[]): this {
    this.claims = addCommunicationCategoryList(this.claims, values);
    return this;
  }

  getCategoryList(): string[] {
    return getCommunicationCategoryList(this.claims);
  }

  setText(value: unknown): this {
    this.claims = setCommunicationText(this.claims, value);
    return this;
  }

  getText(): string {
    return getCommunicationText(this.claims);
  }

  toClaims(): CommunicationInteroperableClaims {
    return { ...this.claims };
  }
}

/**
 * Thin fluent wrapper over canonical Consent flat-claim helpers from
 * `gdc-common-utils-ts`.
 */
export class ConsentClaims {
  private claims: ConsentInteroperableClaims;

  private constructor(claims: ConsentInteroperableClaims) {
    this.claims = { ...claims };
  }

  static create(
    claims: ConsentInteroperableClaims = { '@context': 'org.hl7.fhir.api' },
  ): ConsentClaims {
    return new ConsentClaims(claims);
  }

  static fromClaims(claims: ConsentInteroperableClaims): ConsentClaims {
    return new ConsentClaims(claims);
  }

  setIdentifier(value: string): this {
    this.claims = setConsentIdentifier(this.claims, value);
    return this;
  }

  getIdentifier(): string {
    return getConsentIdentifier(this.claims);
  }

  setSubject(value: string): this {
    this.claims = setConsentSubject(this.claims, value);
    return this;
  }

  getSubject(): string {
    return getConsentSubject(this.claims);
  }

  setDecision(value: string): this {
    this.claims = setConsentDecision(this.claims, value);
    return this;
  }

  getDecision(): string {
    return getConsentDecision(this.claims);
  }

  setDate(value: string): this {
    this.claims = setConsentDate(this.claims, value);
    return this;
  }

  getDate(): string {
    return getConsentDate(this.claims);
  }

  setPeriodStart(value: string): this {
    this.claims = setConsentPeriodStart(this.claims, value);
    return this;
  }

  getPeriodStart(): string {
    return getConsentPeriodStart(this.claims);
  }

  setPeriodEnd(value: string): this {
    this.claims = setConsentPeriodEnd(this.claims, value);
    return this;
  }

  getPeriodEnd(): string {
    return getConsentPeriodEnd(this.claims);
  }

  setPurposeList(values: string | readonly string[]): this {
    this.claims = setPurposeList(this.claims, values);
    return this;
  }

  addPurposeList(values: string | readonly string[]): this {
    this.claims = addPurposeList(this.claims, values);
    return this;
  }

  getPurposeList(): string[] {
    return getPurposeList(this.claims);
  }

  setActorRoleList(values: string | readonly string[]): this {
    this.claims = setActorRoleList(this.claims, values);
    return this;
  }

  getActorRoleList(): string[] {
    return getActorRoleList(this.claims);
  }

  setActorIdentifierList(values: string | readonly string[]): this {
    this.claims = setActorIdentifierList(this.claims, values);
    return this;
  }

  addActorIdentifierList(values: string | readonly string[]): this {
    this.claims = addActorIdentifierList(this.claims, values);
    return this;
  }

  getActorIdentifierList(): string[] {
    return getActorIdentifierList(this.claims);
  }

  setSectionList(values: string | readonly string[]): this {
    this.claims = setSectionList(this.claims, values);
    return this;
  }

  addSectionList(values: string | readonly string[]): this {
    this.claims = addSectionList(this.claims, values);
    return this;
  }

  getSectionList(): string[] {
    return getSectionList(this.claims);
  }

  toClaims(): ConsentInteroperableClaims {
    return { ...this.claims };
  }
}

/**
 * Thin fluent wrapper over canonical MedicationStatement flat-claim helpers
 * from `gdc-common-utils-ts`.
 */
export class MedicationStatementClaims {
  private claims: MedicationInteroperableClaims;

  private constructor(claims: MedicationInteroperableClaims) {
    this.claims = { ...claims };
  }

  static create(
    claims: MedicationInteroperableClaims = { '@context': 'org.hl7.fhir.api' },
  ): MedicationStatementClaims {
    return new MedicationStatementClaims(claims);
  }

  static fromClaims(claims: MedicationInteroperableClaims): MedicationStatementClaims {
    return new MedicationStatementClaims(claims);
  }

  setIdentifier(value: string): this {
    this.claims = setMedicationIdentifier(this.claims, value);
    return this;
  }

  getIdentifier(): string {
    return getMedicationIdentifier(this.claims);
  }

  setSubject(value: string): this {
    this.claims = setMedicationSubject(this.claims, value);
    return this;
  }

  getSubject(): string {
    return getMedicationSubject(this.claims);
  }

  setStatus(value: string): this {
    this.claims = setMedicationStatus(this.claims, value);
    return this;
  }

  getStatus(): string {
    return getMedicationStatus(this.claims);
  }

  setEffective(value: string): this {
    this.claims = setMedicationEffective(this.claims, value);
    return this;
  }

  getEffective(): string {
    return getMedicationEffective(this.claims);
  }

  setText(value: string): this {
    this.claims = setMedicationText(this.claims, value);
    return this;
  }

  getText(): string {
    return getMedicationText(this.claims);
  }

  setCategoryList(values: string | readonly string[]): this {
    this.claims = setMedicationCategoryList(this.claims, values);
    return this;
  }

  addCategoryList(values: string | readonly string[]): this {
    this.claims = addMedicationCategoryList(this.claims, values);
    return this;
  }

  getCategoryList(): string[] {
    return getMedicationCategoryList(this.claims);
  }

  setDoseQuantityValue(value: number): this {
    this.claims = setMedicationDoseQuantityValue(this.claims, value);
    return this;
  }

  getDoseQuantityValue(): number | undefined {
    return getMedicationDoseQuantityValue(this.claims);
  }

  setDoseQuantityUnit(value: string): this {
    this.claims = setMedicationDoseQuantityUnit(this.claims, value);
    return this;
  }

  getDoseQuantityUnit(): string {
    return getMedicationDoseQuantityUnit(this.claims);
  }

  setTimingFrequency(value: number): this {
    this.claims = setMedicationTimingFrequency(this.claims, value);
    return this;
  }

  getTimingFrequency(): number | undefined {
    return getMedicationTimingFrequency(this.claims);
  }

  setTimingPeriod(value: number): this {
    this.claims = setMedicationTimingPeriod(this.claims, value);
    return this;
  }

  getTimingPeriod(): number | undefined {
    return getMedicationTimingPeriod(this.claims);
  }

  setTimingPeriodUnit(value: string): this {
    this.claims = setMedicationTimingPeriodUnit(this.claims, value);
    return this;
  }

  getTimingPeriodUnit(): string {
    return getMedicationTimingPeriodUnit(this.claims);
  }

  setDosageAsNeeded(value: boolean): this {
    this.claims = setMedicationDosageAsNeeded(this.claims, value);
    return this;
  }

  getDosageAsNeeded(): boolean | undefined {
    return getMedicationDosageAsNeeded(this.claims);
  }

  toClaims(): MedicationInteroperableClaims {
    return { ...this.claims };
  }
}
