// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { ResourceTypesFhirR4 } from 'gdc-common-utils-ts/constants/fhir-resource-types';
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

export type FhirDocumentFacade = Readonly<{
  getBundle: () => FhirResourceLike | undefined;
  getSections: () => FhirDocumentSection[];
  getResources: (resourceType?: string) => FhirResourceLike[];
  getByDates: (resourceType: string, start?: string, end?: string) => FhirResourceLike[];
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
      if (!resourceType) return getBundleDocumentEntries(bundle);
      return getBundleDocumentResourcesByType(bundle, resourceType);
    },
    getByDates: (resourceType: string, start?: string, end?: string) => {
      return sortFhirResourcesByDateDescending(getBundleDocumentResourcesByType(bundle, resourceType))
        .filter((resource) => {
          const date = getCanonicalDate(resource);
          if (!date) return false;
          if (start && date < start) return false;
          if (end && date > end) return false;
          return true;
        });
    },
    getContainingTextOrDisplay: (resourceType: string, searchText: string) => {
      const normalized = searchText.trim().toLowerCase();
      if (!normalized) return [];
      return getBundleDocumentResourcesByType(bundle, resourceType)
        .filter((resource) => getTextIndex(resource).includes(normalized));
    },
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
