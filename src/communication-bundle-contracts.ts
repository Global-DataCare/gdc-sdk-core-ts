// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { ResourceTypesFhirR4 } from 'gdc-common-utils-ts/constants/fhir-resource-types';

export type AttachmentObj = {
  id?: string;
  contentType?: string;
  title?: string;
  dataBase64?: string;
  url?: string;
  contentHash?: string;
};

export type CommunicationInput = {
  thid?: string;
  pthid?: string;
  channelId?: string;
  partOf?: string;
  subject: string;
  sender?: string;
  recipient?: string | string[];
  sent?: string;
  category?: string | string[];
  text?: string;
  attachments?: AttachmentObj[];
  contentReference?: string | string[];
  claims?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

export type CommMsgExtendedInput = {
  thid?: string;
  pthid?: string;
  channelId?: string;
  partOf?: string;
  from?: string;
  to?: string[];
  subject?: string;
  body?: Record<string, unknown>;
  claims?: Record<string, unknown>;
};

export type DateRange = {
  start?: string;
  end?: string;
};

export type SectionFilter = {
  anyOf?: string[];
  allOf?: string[];
};

const includedResourceTypes = [
  ResourceTypesFhirR4.Communication,
  ResourceTypesFhirR4.Composition,
  ResourceTypesFhirR4.DocumentReference,
  ResourceTypesFhirR4.AllergyIntolerance,
  ResourceTypesFhirR4.Condition,
  ResourceTypesFhirR4.MedicationStatement,
  ResourceTypesFhirR4.Observation,
  ResourceTypesFhirR4.Procedure,
  ResourceTypesFhirR4.Immunization,
  ResourceTypesFhirR4.RelatedPerson,
  ResourceTypesFhirR4.DiagnosticReport,
  ResourceTypesFhirR4.CarePlan,
  ResourceTypesFhirR4.Encounter,
  ResourceTypesFhirR4.AdverseEvent,
  ResourceTypesFhirR4.Consent,
  ResourceTypesFhirR4.Appointment,
] as const;

export type IncludedResourceType = typeof includedResourceTypes[number];

export type BundleSearchQuery = {
  subject: string;
  section?: SectionFilter;
  date?: DateRange;
  includedTypes?: IncludedResourceType[];
  code?: string | string[];
  category?: string | string[];
  author?: string | string[];
  thid?: string;
  pthid?: string;
  channelId?: string;
  partOf?: string;
  searchParams?: Record<string, string | number | boolean | undefined>;
};

export type CompositionSearchQuery = {
  subject: string;
  section?: SectionFilter;
  date?: DateRange;
  type?: string | string[];
  author?: string | string[];
  searchParams?: Record<string, string | number | boolean | undefined>;
};

export type ProjectedResourceSummary = {
  resourceType: IncludedResourceType | string;
  id: string;
  subject?: string;
  effectiveDateTime?: string;
  code?: string;
  category?: string;
  sourceCommunicationId?: string;
};

export type BundleSearchResult = {
  total: number;
  entries: ProjectedResourceSummary[];
  bundle?: Record<string, unknown>;
};

export type CommunicationAuditRecord = {
  communicationId: string;
  thid?: string;
  pthid?: string;
  channelId?: string;
  partOf?: string;
  subject: string;
  sender?: string;
  recipient?: string | string[];
  createdAt: string;
  resourceIds?: string[];
};

function assertPlainObject(value: unknown, name: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} must be a plain object`);
  }
}

function assertOptionalStringField(
  value: Record<string, unknown>,
  fieldName: string,
): void {
  if (value[fieldName] !== undefined && typeof value[fieldName] !== 'string') {
    throw new TypeError(`${fieldName} must be a string`);
  }
}

function assertStringField(value: Record<string, unknown>, fieldName: string): void {
  if (typeof value[fieldName] !== 'string') {
    throw new TypeError(`${fieldName} must be a string`);
  }
}

function assertStringArrayField(
  value: Record<string, unknown>,
  fieldName: string,
): void {
  const candidate = value[fieldName];
  if (!Array.isArray(candidate) || candidate.some(item => typeof item !== 'string')) {
    throw new TypeError(`${fieldName} must be an array of strings`);
  }
}

function assertThreadFields(value: Record<string, unknown>): void {
  assertOptionalStringField(value, 'thid');
  assertOptionalStringField(value, 'pthid');
  assertOptionalStringField(value, 'channelId');
  assertOptionalStringField(value, 'partOf');
}

function assertStringOrStringArrayField(
  value: Record<string, unknown>,
  fieldName: string,
): void {
  const candidate = value[fieldName];
  if (candidate === undefined) {
    return;
  }
  if (typeof candidate === 'string') {
    return;
  }
  if (Array.isArray(candidate) && candidate.every(item => typeof item === 'string')) {
    return;
  }
  throw new TypeError(`${fieldName} must be a string or an array of strings`);
}

function assertAttachmentObject(value: unknown, index: number): void {
  assertPlainObject(value, `attachments[${index}]`);
  assertOptionalStringField(value, 'id');
  assertOptionalStringField(value, 'contentType');
  assertOptionalStringField(value, 'title');
  assertOptionalStringField(value, 'dataBase64');
  assertOptionalStringField(value, 'url');
  assertOptionalStringField(value, 'contentHash');
}

function assertSectionFilter(value: unknown): void {
  assertPlainObject(value, 'section');
  if (value.anyOf !== undefined) {
    assertStringArrayField({ 'section.anyOf': value.anyOf }, 'section.anyOf');
  }
  if (value.allOf !== undefined) {
    assertStringArrayField({ 'section.allOf': value.allOf }, 'section.allOf');
  }
}

function assertDateRange(value: unknown): void {
  assertPlainObject(value, 'date');
  assertOptionalStringField({ 'date.start': value.start }, 'date.start');
  assertOptionalStringField({ 'date.end': value.end }, 'date.end');
}

const includedResourceTypeSet = new Set<IncludedResourceType>(includedResourceTypes);

function assertIncludedTypes(value: unknown): void {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !includedResourceTypeSet.has(item as IncludedResourceType))) {
    throw new TypeError('includedTypes must be an array of supported resource types');
  }
}

function assertPrimitiveSearchParams(
  value: Record<string, unknown>,
): void {
  for (const [key, candidate] of Object.entries(value)) {
    if (
      candidate !== undefined &&
      typeof candidate !== 'string' &&
      typeof candidate !== 'number' &&
      typeof candidate !== 'boolean'
    ) {
      throw new TypeError(`searchParams.${key} must be a string, number, boolean, or undefined`);
    }
  }
}

function assertStringOrStringArrayValue(value: unknown, fieldName: string): void {
  if (value === undefined) {
    return;
  }
  if (typeof value === 'string') {
    return;
  }
  if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
    return;
  }
  throw new TypeError(`${fieldName} must be a string or an array of strings`);
}

/**
 * Validates the shape of a runtime-neutral `CommunicationInput`.
 *
 * @param value Candidate value to validate.
 */
export function assertCommunicationInput(value: unknown): asserts value is CommunicationInput {
  assertPlainObject(value, 'CommunicationInput');
  assertStringField(value, 'subject');
  assertThreadFields(value);
  assertOptionalStringField(value, 'sender');
  assertStringOrStringArrayValue(value.recipient, 'recipient');
  assertOptionalStringField(value, 'sent');
  assertStringOrStringArrayValue(value.category, 'category');
  assertOptionalStringField(value, 'text');
  if (value.attachments !== undefined) {
    if (!Array.isArray(value.attachments)) {
      throw new TypeError('attachments must be an array');
    }
    value.attachments.forEach((attachment, index) => assertAttachmentObject(attachment, index));
  }
  assertStringOrStringArrayValue(value.contentReference, 'contentReference');
  if (value.claims !== undefined) {
    assertPlainObject(value.claims, 'claims');
  }
  if (value.payload !== undefined) {
    assertPlainObject(value.payload, 'payload');
  }
}

/**
 * Validates the shape of a runtime-neutral `CommMsgExtendedInput`.
 *
 * @param value Candidate value to validate.
 */
export function assertCommMsgExtendedInput(
  value: unknown,
): asserts value is CommMsgExtendedInput {
  assertPlainObject(value, 'CommMsgExtendedInput');
  assertThreadFields(value);
  assertOptionalStringField(value, 'from');
  if (value.to !== undefined) {
    assertStringArrayField(value, 'to');
  }
  assertOptionalStringField(value, 'subject');
  if (value.body !== undefined) {
    assertPlainObject(value.body, 'body');
  }
  if (value.claims !== undefined) {
    assertPlainObject(value.claims, 'claims');
  }
}

/**
 * Validates the shape of a canonical clinical `BundleSearchQuery`.
 *
 * @param value Candidate value to validate.
 */
export function assertBundleSearchQuery(value: unknown): asserts value is BundleSearchQuery {
  assertPlainObject(value, 'BundleSearchQuery');
  assertStringField(value, 'subject');
  assertThreadFields(value);

  if (value.section !== undefined) {
    assertSectionFilter(value.section);
  }
  if (value.date !== undefined) {
    assertDateRange(value.date);
  }
  if (value.includedTypes !== undefined) {
    assertIncludedTypes(value.includedTypes);
  }
  assertStringOrStringArrayValue(value.code, 'code');
  assertStringOrStringArrayValue(value.category, 'category');
  assertStringOrStringArrayValue(value.author, 'author');

  if (value.searchParams !== undefined) {
    assertPlainObject(value.searchParams, 'searchParams');
    assertPrimitiveSearchParams(value.searchParams);
  }
}
