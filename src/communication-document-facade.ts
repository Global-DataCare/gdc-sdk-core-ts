// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { FhirCodeSystems } from 'gdc-common-utils-ts/constants/fhir-code-systems';
import { ResourceTypesFhirR4 } from 'gdc-common-utils-ts/constants/fhir-resource-types';
import {
  getLocalTextAndIntDisplay,
  getNarrative,
  getXhtmlOrDerived,
  type LocalTextAndIntDisplay,
  type NarrativeResult,
} from 'gdc-common-utils-ts/utils/clinical-resource-view';
import { createVitalSignsFacade } from './vital-signs.js';
import type { FhirResourceLike } from './communication-resource-helpers.js';
import {
  getBundleDocumentEntries,
  getBundleDocumentResourcesByType,
  getFirstBundleDocumentFromCommunication,
  resolveCommunicationPayloads,
  sortFhirResourcesByDateDescending,
} from './communication-resource-helpers.js';

export type ResolvedCommunicationDocument = Readonly<{
  kind: 'fhir' | 'binary' | 'unknown';
  contentType?: string;
  title?: string;
  base64Data?: string;
  documentReference?: FhirResourceLike;
  bundle?: FhirResourceLike;
  source: 'attachment' | 'documentReference' | 'reference' | 'unknown';
}>;

export type FhirDocumentSection = Readonly<{
  title?: string;
  code?: string;
  entries: string[];
}>;

export type FhirDocumentResourceQuery = Readonly<{
  sections?: readonly string[];
  resourceType?: string;
  start?: string;
  end?: string;
  searchText?: string;
  page?: number;
  count?: number;
  offset?: number;
}>;

export type FhirDocumentFamilyQuery = Readonly<{
  sections?: readonly string[];
  start?: string;
  end?: string;
  searchText?: string;
  page?: number;
  count?: number;
  offset?: number;
}>;

export type FhirDocumentSectionSummary = Readonly<{
  sectionsRequested: readonly string[];
  sectionsResolved: readonly string[];
  totalResources: number;
  totalNarratives: number;
  countsBySection: Readonly<Record<string, number>>;
  countsByResourceType: Readonly<Record<string, number>>;
  countsBySectionAndResourceType: Readonly<Record<string, Readonly<Record<string, number>>>>;
}>;

export type FhirDocumentFacade = Readonly<{
  getBundle: () => FhirResourceLike | undefined;
  getSections: () => FhirDocumentSection[];
  getSectionResources: (sectionCode: string, resourceType?: string) => FhirResourceLike[];
  getResources: (resourceTypeOrQuery?: string | FhirDocumentResourceQuery) => FhirResourceLike[];
  getByDates: (resourceTypeOrQuery: string | FhirDocumentResourceQuery, start?: string, end?: string) => FhirResourceLike[];
  getContainingTextOrDisplay: (resourceType: string, searchText: string) => FhirResourceLike[];
  getSectionSummary: (input?: { sections?: readonly string[] }) => FhirDocumentSectionSummary;
  getLocalTextAndIntDisplay: (resource: FhirResourceLike) => LocalTextAndIntDisplay;
  getXhtmlOrDerived: (resource: FhirResourceLike) => string | undefined;
  getNarrative: (resource: FhirResourceLike) => NarrativeResult;
  getAllergies: (query?: FhirDocumentFamilyQuery & { clinicalStatus?: readonly string[]; verificationStatus?: readonly string[]; criticality?: readonly string[] }) => FhirResourceLike[];
  getConditions: (query?: FhirDocumentFamilyQuery & { clinicalStatus?: readonly string[]; verificationStatus?: readonly string[]; severity?: readonly string[] }) => FhirResourceLike[];
  getMedications: (query?: FhirDocumentFamilyQuery & { status?: readonly string[] }) => FhirResourceLike[];
  getVitalSigns: (query?: FhirDocumentFamilyQuery & { code?: readonly string[] }) => FhirResourceLike[];
  vitalSigns: Readonly<{
    getAll: () => FhirResourceLike[];
    getHeartRate: () => FhirResourceLike[];
    getBloodPressure: () => FhirResourceLike[];
    getBodyTemperature: () => FhirResourceLike[];
  }>;
}>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getCanonicalDate(resource: FhirResourceLike): string | undefined {
  const candidates = [
    resource.effectiveDateTime,
    resource.issued,
    resource.authoredOn,
    resource.performedDateTime,
    resource.recordedDate,
    resource.date,
    resource.sent,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return undefined;
}

function normalizeSectionCodeToken(value: string | undefined): string | undefined {
  const normalized = String(value || '').trim();
  if (!normalized) return undefined;
  if (!normalized.includes('|')) return normalized.toLowerCase();
  const parts = normalized.split('|');
  return String(parts[parts.length - 1] || '').trim().toLowerCase() || undefined;
}

function formatSectionCode(system: unknown, code: unknown): string | undefined {
  const normalizedSystem = typeof system === 'string' ? system.trim() : '';
  const normalizedCode = typeof code === 'string' ? code.trim() : '';
  if (!normalizedCode) return undefined;
  if (normalizedSystem === FhirCodeSystems.Loinc) {
    return `LOINC|${normalizedCode}`;
  }
  return [normalizedSystem, normalizedCode].filter(Boolean).join('|') || undefined;
}

function getAttachmentMetadata(payload: Record<string, unknown>): {
  contentType?: string;
  title?: string;
  data?: string;
  source: 'attachment' | 'documentReference' | 'reference' | 'unknown';
} {
  const attachment = isPlainObject(payload.contentAttachment) ? payload.contentAttachment : undefined;
  if (attachment) {
    return {
      contentType: typeof attachment.contentType === 'string' ? attachment.contentType : undefined,
      title: typeof attachment.title === 'string' ? attachment.title : undefined,
      data: typeof attachment.data === 'string' ? attachment.data : undefined,
      source: 'attachment',
    };
  }
  const reference = isPlainObject(payload.contentReference) ? payload.contentReference : undefined;
  if (reference) {
    return { source: 'reference' };
  }
  return { source: 'unknown' };
}

function getTextIndex(resource: FhirResourceLike): string {
  const fragments: string[] = [];
  const walk = (value: unknown): void => {
    if (typeof value === 'string' && value.trim()) {
      fragments.push(value.trim().toLowerCase());
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (isPlainObject(value)) {
      Object.values(value).forEach(walk);
    }
  };
  walk(resource);
  return fragments.join(' ');
}

function normalizeTokenList(values?: readonly string[]): string[] {
  return Array.from(new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean)));
}

function normalizePositiveInteger(value: unknown): number | undefined {
  const numeric = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isInteger(numeric) && numeric > 0 ? numeric : undefined;
}

function normalizeNonNegativeInteger(value: unknown): number | undefined {
  const numeric = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : undefined;
}

function filterResourcesByQuery(
  facade: Pick<FhirDocumentFacade, 'getSections' | 'getSectionResources'>,
  bundle: FhirResourceLike | undefined,
  query?: FhirDocumentResourceQuery,
): FhirResourceLike[] {
  const normalizedSections = normalizeTokenList(query?.sections);
  const requestedType = typeof query?.resourceType === 'string' ? query.resourceType : undefined;

  const sectionFiltered = normalizedSections.length > 0
    ? normalizedSections.flatMap((section) => facade.getSectionResources(section, requestedType))
    : getBundleDocumentResourcesByType(bundle, requestedType || '');

  const resources = normalizedSections.length > 0
    ? dedupeResources(sectionFiltered)
    : requestedType
      ? getBundleDocumentResourcesByType(bundle, requestedType)
      : getBundleDocumentEntries(bundle);

  const searched = typeof query?.searchText === 'string' && query.searchText.trim()
    ? resources.filter((resource) => getTextIndex(resource).includes(query.searchText!.trim().toLowerCase()))
    : resources;

  const dated = sortFhirResourcesByDateDescending(searched)
    .filter((resource) => {
      const date = getCanonicalDate(resource);
      if (query?.start && (!date || date < query.start)) return false;
      if (query?.end && (!date || date > query.end)) return false;
      return true;
    });

  return dated;
}

function applyPagination(resources: FhirResourceLike[], query?: Pick<FhirDocumentResourceQuery, 'page' | 'count' | 'offset'>): FhirResourceLike[] {
  const count = normalizePositiveInteger(query?.count);
  const page = normalizePositiveInteger(query?.page);
  const explicitOffset = normalizeNonNegativeInteger(query?.offset);
  const offset = explicitOffset ?? (count && page ? (page - 1) * count : 0);
  if (!count && !offset) {
    return resources;
  }
  return resources.slice(offset || 0, count ? (offset || 0) + count : undefined);
}

function dedupeResources(resources: FhirResourceLike[]): FhirResourceLike[] {
  const seen = new Set<string>();
  const out: FhirResourceLike[] = [];
  for (const resource of resources) {
    const key = `${String(resource.resourceType || '')}|${String(resource.id || '')}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(resource);
    }
  }
  return out;
}

function splitClaimCsv(resource: FhirResourceLike, key: string): string[] {
  const claims = isPlainObject(resource.meta) && isPlainObject(resource.meta.claims)
    ? resource.meta.claims as Record<string, unknown>
    : {};
  const value = claims[key];
  return typeof value === 'string'
    ? value.split(',').map((item) => item.trim()).filter(Boolean)
    : [];
}

function matchesAnyClaimValue(resource: FhirResourceLike, keys: readonly string[], expected?: readonly string[]): boolean {
  const normalizedExpected = normalizeTokenList(expected);
  if (normalizedExpected.length === 0) {
    return true;
  }

  const claims = isPlainObject(resource.meta) && isPlainObject(resource.meta.claims)
    ? resource.meta.claims as Record<string, unknown>
    : {};

  for (const key of keys) {
    const raw = claims[key];
    const values = typeof raw === 'string'
      ? raw.split(',').map((item) => item.trim()).filter(Boolean)
      : raw == null
        ? []
        : [String(raw).trim()].filter(Boolean);
    if (values.some((value) => normalizedExpected.includes(value))) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves the first document reachable from a FHIR `Communication`.
 *
 * The returned descriptor hides whether the document was attached directly
 * or wrapped in a `DocumentReference`.
 *
 * @param communication FHIR `Communication` resource to inspect.
 */
export function getDocumentFromCommunication(
  communication: FhirResourceLike,
): ResolvedCommunicationDocument | undefined {
  const payloads = resolveCommunicationPayloads(communication);
  const first = payloads[0];
  if (!first) return undefined;

  const payloadArray = Array.isArray((communication as Record<string, unknown>).payload)
    ? ((communication as Record<string, unknown>).payload as unknown[])
    : undefined;
  const communicationPayload = payloadArray
    ? payloadArray[first.payloadIndex]
    : undefined;
  const payloadMeta = isPlainObject(communicationPayload)
    ? getAttachmentMetadata(communicationPayload)
    : { source: 'unknown' as const };

  if (first.bundle) {
    return {
      kind: 'fhir',
      contentType: payloadMeta.contentType || 'application/fhir+json',
      title: payloadMeta.title,
      base64Data: payloadMeta.data,
      documentReference: first.documentReference,
      bundle: first.bundle,
      source: first.documentReference?.resourceType === ResourceTypesFhirR4.DocumentReference
        ? 'documentReference'
        : payloadMeta.source,
    };
  }

  if (payloadMeta.contentType || payloadMeta.data) {
    return {
      kind: payloadMeta.contentType?.includes('fhir') ? 'fhir' : 'binary',
      contentType: payloadMeta.contentType,
      title: payloadMeta.title,
      base64Data: payloadMeta.data,
      documentReference: first.documentReference,
      bundle: first.resource?.resourceType === ResourceTypesFhirR4.Bundle ? first.resource : undefined,
      source: first.documentReference?.resourceType === ResourceTypesFhirR4.DocumentReference
        ? 'documentReference'
        : payloadMeta.source,
    };
  }

  return {
    kind: 'unknown',
    source: payloadMeta.source,
    documentReference: first.documentReference,
    bundle: first.bundle,
  };
}

/**
 * Creates a read-only document facade over a FHIR `Bundle document`
 * or over a FHIR `Communication` that contains one.
 *
 * @param communicationOrBundle Either a FHIR `Bundle document` or a FHIR `Communication`.
 */
export function createFhirDocumentFacade(
  communicationOrBundle: FhirResourceLike,
): FhirDocumentFacade {
  const bundle = communicationOrBundle.resourceType === ResourceTypesFhirR4.Bundle
    ? communicationOrBundle
    : getFirstBundleDocumentFromCommunication(communicationOrBundle);

  const facade = Object.freeze({
    getBundle: () => bundle,
    getSections: () => {
      const compositions = getBundleDocumentResourcesByType(bundle, ResourceTypesFhirR4.Composition);
      return compositions.flatMap((composition) => {
        const sections = Array.isArray(composition.section) ? composition.section : [];
        return sections
          .filter(isPlainObject)
          .map((section) => {
            const sectionCode = isPlainObject(section.code) ? section.code : undefined;
            const codingValue = sectionCode ? sectionCode.coding : undefined;
            const codingList = Array.isArray(codingValue) ? codingValue : [];
            const firstCoding = codingList.find(isPlainObject);
            return {
              title: typeof section.title === 'string' ? section.title : undefined,
              code: firstCoding ? formatSectionCode(firstCoding.system, firstCoding.code) : undefined,
              entries: Array.isArray(section.entry)
                ? section.entry
                .filter(isPlainObject)
                .map((entry) => (typeof entry.reference === 'string' ? entry.reference : ''))
                .filter(Boolean)
                : [],
            };
          });
      });
    },
    getSectionResources: (sectionCode: string, resourceType?: string) => {
      const normalizedTarget = normalizeSectionCodeToken(sectionCode);
      if (!normalizedTarget || !Array.isArray(bundle?.entry)) return [];

      const sectionRefs = new Set(
        facade.getSections()
          .filter((section) => normalizeSectionCodeToken(section.code) === normalizedTarget)
          .flatMap((section) => section.entries),
      );
      if (sectionRefs.size === 0) return [];

      return bundle.entry
        .filter(isPlainObject)
        .map((entry) => {
          const resource = isPlainObject(entry.resource) ? entry.resource as FhirResourceLike : undefined;
          const id = typeof resource?.id === 'string' ? resource.id : undefined;
          const typedReference = resource?.resourceType && id ? `${resource.resourceType}/${id}` : undefined;
          const fullUrl = typeof entry.fullUrl === 'string' ? entry.fullUrl : undefined;
          if (!resource) return undefined;
          if (resourceType && resource.resourceType !== resourceType) return undefined;
          return sectionRefs.has(String(id || ''))
            || sectionRefs.has(String(typedReference || ''))
            || sectionRefs.has(String(fullUrl || ''))
            ? resource
            : undefined;
        })
        .filter((resource): resource is FhirResourceLike => Boolean(resource));
    },
    getResources: (resourceTypeOrQuery?: string | FhirDocumentResourceQuery) => {
      if (!resourceTypeOrQuery) {
        return getBundleDocumentEntries(bundle);
      }
      if (typeof resourceTypeOrQuery === 'string') {
        return getBundleDocumentResourcesByType(bundle, resourceTypeOrQuery);
      }
      return applyPagination(
        filterResourcesByQuery(facade as Pick<FhirDocumentFacade, 'getSections' | 'getSectionResources'>, bundle, resourceTypeOrQuery),
        resourceTypeOrQuery,
      );
    },
    getByDates: (resourceTypeOrQuery: string | FhirDocumentResourceQuery, start?: string, end?: string) => {
      if (typeof resourceTypeOrQuery === 'string') {
        return sortFhirResourcesByDateDescending(getBundleDocumentResourcesByType(bundle, resourceTypeOrQuery))
          .filter((resource) => {
            const date = getCanonicalDate(resource);
            if (!date) return false;
            if (start && date < start) return false;
            if (end && date > end) return false;
            return true;
          });
      }
      return applyPagination(
        filterResourcesByQuery(
          facade as Pick<FhirDocumentFacade, 'getSections' | 'getSectionResources'>,
          bundle,
          resourceTypeOrQuery,
        ),
        resourceTypeOrQuery,
      );
    },
    getContainingTextOrDisplay: (resourceType: string, searchText: string) => {
      const normalized = searchText.trim().toLowerCase();
      if (!normalized) return [];
      return getBundleDocumentResourcesByType(bundle, resourceType)
        .filter((resource) => getTextIndex(resource).includes(normalized));
    },
    getSectionSummary: (input?: { sections?: readonly string[] }) => {
      const sectionsRequested = normalizeTokenList(input?.sections);
      const sectionsResolved = sectionsRequested.length > 0
        ? sectionsRequested
        : facade.getSections().map((section) => String(section.code || '').trim()).filter(Boolean);

      const countsBySection: Record<string, number> = {};
      const countsByResourceType: Record<string, number> = {};
      const countsBySectionAndResourceType: Record<string, Record<string, number>> = {};
      let totalNarratives = 0;

      for (const section of sectionsResolved) {
        const sectionResources = facade.getSectionResources(section);
        countsBySection[section] = sectionResources.length;
        countsBySectionAndResourceType[section] = countsBySectionAndResourceType[section] || {};

        for (const resource of sectionResources) {
          const resourceType = String(resource.resourceType || 'Unknown');
          countsByResourceType[resourceType] = (countsByResourceType[resourceType] || 0) + 1;
          countsBySectionAndResourceType[section][resourceType] = (countsBySectionAndResourceType[section][resourceType] || 0) + 1;
          if (getXhtmlOrDerived(resource)) {
            totalNarratives += 1;
          }
        }
      }

      return {
        sectionsRequested,
        sectionsResolved,
        totalResources: Object.values(countsBySection).reduce((sum, value) => sum + value, 0),
        totalNarratives,
        countsBySection,
        countsByResourceType,
        countsBySectionAndResourceType,
      };
    },
    getLocalTextAndIntDisplay: (resource: FhirResourceLike) => getLocalTextAndIntDisplay(resource),
    getXhtmlOrDerived: (resource: FhirResourceLike) => getXhtmlOrDerived(resource),
    getNarrative: (resource: FhirResourceLike) => getNarrative(resource),
    getAllergies: (query: FhirDocumentFamilyQuery & { clinicalStatus?: readonly string[]; verificationStatus?: readonly string[]; criticality?: readonly string[] } = {}) => applyPagination(filterResourcesByQuery(
      facade as Pick<FhirDocumentFacade, 'getSections' | 'getSectionResources'>,
      bundle,
      { ...query, resourceType: ResourceTypesFhirR4.AllergyIntolerance },
    ).filter((resource) => (
      matchesAnyClaimValue(resource, ['AllergyIntolerance.clinical-status', 'org.hl7.fhir.api.AllergyIntolerance.clinical-status'], query?.clinicalStatus)
      && matchesAnyClaimValue(resource, ['AllergyIntolerance.verification-status', 'org.hl7.fhir.api.AllergyIntolerance.verification-status'], query?.verificationStatus)
      && matchesAnyClaimValue(resource, ['AllergyIntolerance.criticality', 'org.hl7.fhir.api.AllergyIntolerance.criticality'], query?.criticality)
    )), query),
    getConditions: (query: FhirDocumentFamilyQuery & { clinicalStatus?: readonly string[]; verificationStatus?: readonly string[]; severity?: readonly string[] } = {}) => applyPagination(filterResourcesByQuery(
      facade as Pick<FhirDocumentFacade, 'getSections' | 'getSectionResources'>,
      bundle,
      { ...query, resourceType: ResourceTypesFhirR4.Condition },
    ).filter((resource) => (
      matchesAnyClaimValue(resource, ['Condition.clinical-status', 'org.hl7.fhir.api.Condition.clinical-status'], query?.clinicalStatus)
      && matchesAnyClaimValue(resource, ['Condition.verification-status', 'org.hl7.fhir.api.Condition.verification-status'], query?.verificationStatus)
      && matchesAnyClaimValue(resource, ['Condition.severity', 'org.hl7.fhir.api.Condition.severity'], query?.severity)
    )), query),
    getMedications: (query: FhirDocumentFamilyQuery & { status?: readonly string[] } = {}) => applyPagination(filterResourcesByQuery(
      facade as Pick<FhirDocumentFacade, 'getSections' | 'getSectionResources'>,
      bundle,
      { ...query, resourceType: ResourceTypesFhirR4.MedicationStatement },
    ).filter((resource) => (
      matchesAnyClaimValue(resource, ['MedicationStatement.status', 'org.hl7.fhir.api.MedicationStatement.status'], query?.status)
    )), query),
    getVitalSigns: (query: FhirDocumentFamilyQuery & { code?: readonly string[] } = {}) => applyPagination(filterResourcesByQuery(
      facade as Pick<FhirDocumentFacade, 'getSections' | 'getSectionResources'>,
      bundle,
      { ...query, resourceType: ResourceTypesFhirR4.Observation },
    ).filter((resource) => (
      matchesAnyClaimValue(resource, ['Observation.code', 'Observation.code-value'], query?.code)
        || normalizeTokenList(query?.code).length === 0
    )), query),
  });
  return Object.freeze({
    ...facade,
    vitalSigns: createVitalSignsFacade(facade),
  });
}

/**
 * Creates the high-level communication facade used by SDK consumers.
 *
 * Current methods:
 * - `getDocument(...)`
 * - `getFhirDocument(...)`
 */
export function createCommunicationFacade() {
  return Object.freeze({
    getDocument: getDocumentFromCommunication,
    getFhirDocument: createFhirDocumentFacade,
  });
}
