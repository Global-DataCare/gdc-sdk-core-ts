// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { ResourceTypesFhirR4 } from 'gdc-common-utils-ts/constants/fhir-resource-types';
import { createVitalSignsFacade } from './vital-signs.js';
import {
  getResources as getBundleResources,
  type BundleResourceFilter,
} from './communication-bundle-resources.js';
import type { FhirResourceLike } from './communication-resource-helpers.js';
import {
  getBundleDocumentEntries,
  getBundleDocumentResourcesByType,
  getFirstBundleDocumentFromCommunication,
  resolveCommunicationPayloads,
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

export type FhirDocumentFacade = Readonly<{
  getBundle: () => FhirResourceLike | undefined;
  getSections: () => FhirDocumentSection[];
  getResources: (resourceType?: string) => FhirResourceLike[];
  /** Returns a new facade limited to the selected Composition sections. */
  filterBySections: (sections: string | string[]) => FhirDocumentFacade;
  /** Returns a new facade limited to the selected FHIR resource types. */
  filterByTypes: (types: string | string[]) => FhirDocumentFacade;
  /**
   * Returns a new facade limited to one clinical date range. Point-valued FHIR
   * dates must fall inside it; FHIR Period values must overlap it.
   */
  filterByClinicalDateRange: (from?: string, to?: string) => FhirDocumentFacade;
  /** Returns a new facade over the same document without accumulated filters. */
  resetFilters: () => FhirDocumentFacade;
  /** @deprecated Compatibility alias; use `resetFilters()` for UI reset actions. */
  clearFilters: () => FhirDocumentFacade;
  /**
   * Returns resources matching a low-level combined filter.
   * @deprecated Scope the facade with `filterBySections`,
   * `filterByTypes` and `filterByClinicalDateRange`, then call `getResources`.
   */
  getResourcesByFilter: (filter?: BundleResourceFilter) => FhirResourceLike[];
  /** Returns the number of resources matching one combined clinical filter. */
  getResourceCount: (filter?: BundleResourceFilter) => number;
  getContainingTextOrDisplay: (resourceType: string, searchText: string) => FhirResourceLike[];
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
  return createScopedFhirDocumentFacade(bundle);
}

function createScopedFhirDocumentFacade(
  bundle: FhirResourceLike | undefined,
  scope: BundleResourceFilter = {},
): FhirDocumentFacade {
  const facade = Object.freeze({
    getBundle: () => bundle,
    filterBySections: (sections: string | string[]) =>
      createScopedFhirDocumentFacade(bundle, {
        ...scope,
        sections: cloneFilterTokens(sections),
      }),
    filterByTypes: (types: string | string[]) =>
      createScopedFhirDocumentFacade(bundle, {
        ...scope,
        types: cloneFilterTokens(types),
      }),
    filterByClinicalDateRange: (from?: string, to?: string) =>
      createScopedFhirDocumentFacade(bundle, {
        ...scope,
        date: validateFilterDateRange(from, to),
      }),
    resetFilters: () => createScopedFhirDocumentFacade(bundle),
    clearFilters: () => createScopedFhirDocumentFacade(bundle),
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
              code: firstCoding
                ? [firstCoding.system, firstCoding.code].filter(Boolean).join('|') || undefined
                : undefined,
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
    getResources: (resourceType?: string) => {
      if (!resourceType && !hasResourceFilter(scope)) {
        return getBundleDocumentEntries(bundle);
      }
      return bundle
        ? getBundleResources(bundle, mergeResourceFilters(
          scope,
          resourceType ? { types: [resourceType] } : {},
        ))
        : [];
    },
    getResourcesByFilter: (filter: BundleResourceFilter = {}) =>
      bundle ? getBundleResources(bundle, mergeResourceFilters(scope, filter)) : [],
    getResourceCount: (filter: BundleResourceFilter = {}) =>
      bundle ? getBundleResources(bundle, mergeResourceFilters(scope, filter)).length : 0,
    getContainingTextOrDisplay: (resourceType: string, searchText: string) => {
      const normalized = searchText.trim().toLowerCase();
      if (!normalized) return [];
      const resources = bundle
        ? getBundleResources(bundle, mergeResourceFilters(scope, {
          types: [resourceType],
        }))
        : [];
      return resources
        .filter((resource) => getTextIndex(resource).includes(normalized));
    },
  });
  return Object.freeze({
    ...facade,
    vitalSigns: createVitalSignsFacade(facade),
  });
}

function cloneFilterTokens(value: string | string[]): string[] {
  return (Array.isArray(value) ? value : [value])
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function validateFilterDateRange(
  start?: string,
  end?: string,
): BundleResourceFilter['date'] | undefined {
  const normalizedStart = String(start || '').trim() || undefined;
  const normalizedEnd = String(end || '').trim() || undefined;
  if (normalizedStart && !Number.isFinite(Date.parse(normalizedStart))) {
    throw new TypeError('FHIR document filter date from must be a valid date.');
  }
  if (normalizedEnd && !Number.isFinite(Date.parse(normalizedEnd))) {
    throw new TypeError('FHIR document filter date to must be a valid date.');
  }
  if (
    normalizedStart
    && normalizedEnd
    && Date.parse(normalizedStart) > Date.parse(normalizedEnd)
  ) {
    throw new RangeError('FHIR document filter date from must not be after to.');
  }
  if (!normalizedStart && !normalizedEnd) return undefined;
  return {
    ...(normalizedStart ? { start: normalizedStart } : {}),
    ...(normalizedEnd ? { end: normalizedEnd } : {}),
  };
}

function hasResourceFilter(filter: BundleResourceFilter): boolean {
  const sections = Array.isArray(filter.sections) ? filter.sections : [filter.sections];
  const types = Array.isArray(filter.types) ? filter.types : [filter.types];
  return sections.some(Boolean)
    || types.some(Boolean)
    || Boolean(filter.date?.start || filter.date?.end);
}

function mergeResourceFilters(
  base: BundleResourceFilter,
  override: BundleResourceFilter,
): BundleResourceFilter {
  return {
    ...(base.sections !== undefined ? { sections: base.sections } : {}),
    ...(base.types !== undefined ? { types: base.types } : {}),
    ...(base.date !== undefined ? { date: base.date } : {}),
    ...(override.sections !== undefined ? { sections: override.sections } : {}),
    ...(override.types !== undefined ? { types: override.types } : {}),
    ...(override.date !== undefined ? { date: override.date } : {}),
  };
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
