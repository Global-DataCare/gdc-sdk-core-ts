// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { ResourceTypesFhirR4 } from 'gdc-common-utils-ts/constants/fhir-resource-types';
import type { FhirResourceLike } from './communication-resource-helpers.js';
import { getFirstBundleDocumentFromCommunication } from './communication-resource-helpers.js';

export type BundleResourceDateFilter = Readonly<{
  start?: string;
  end?: string;
}>;

export type BundleResourceFilter = Readonly<{
  sections?: string | string[];
  types?: string | string[];
  date?: BundleResourceDateFilter;
}>;

export type BundleResourceMutationOptions = Readonly<{
  sections?: string | string[];
}>;

function toArray(value?: string | string[]): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value])
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getBundleFromInput(input: FhirResourceLike): FhirResourceLike | undefined {
  if (input.resourceType === ResourceTypesFhirR4.Bundle) return input;
  return getFirstBundleDocumentFromCommunication(input);
}

function ensureBundle(input: FhirResourceLike): FhirResourceLike {
  const bundle = getBundleFromInput(input);
  if (bundle) return clone(bundle);
  return {
    resourceType: ResourceTypesFhirR4.Bundle,
    type: 'document',
    entry: [],
  };
}

type ClinicalTemporalRange = Readonly<{
  start?: string;
  end?: string;
}>;

function getCanonicalClinicalTemporalRange(
  resource: FhirResourceLike,
): ClinicalTemporalRange | undefined {
  const choiceGroups: ReadonlyArray<Readonly<{
    points: readonly string[];
    period: string;
  }>> = [
    { points: ['effectiveDateTime', 'effectiveInstant'], period: 'effectivePeriod' },
    { points: ['performedDateTime'], period: 'performedPeriod' },
    { points: ['occurrenceDateTime'], period: 'occurrencePeriod' },
    { points: ['onsetDateTime'], period: 'onsetPeriod' },
  ];

  for (const choice of choiceGroups) {
    const point = readFirstStringProperty(resource, choice.points);
    if (point) return { start: point, end: point };
    const period = readPeriodProperty(resource, choice.period);
    if (period) return period;
  }

  const standalonePeriod = readPeriodProperty(resource, 'period')
    || readPeriodProperty(resource, 'timingPeriod');
  if (standalonePeriod) return standalonePeriod;

  const fallbackPoint = readFirstStringProperty(resource, [
    'issued',
    'recordedDate',
    'recorded',
    'authoredOn',
    'date',
    'sent',
    'created',
  ]);
  return fallbackPoint ? { start: fallbackPoint, end: fallbackPoint } : undefined;
}

function readFirstStringProperty(
  resource: FhirResourceLike,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = resource[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function readPeriodProperty(
  resource: FhirResourceLike,
  key: string,
): ClinicalTemporalRange | undefined {
  const candidate = resource[key];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return undefined;
  }
  const period = candidate as Record<string, unknown>;
  const start = typeof period.start === 'string' ? period.start.trim() : '';
  const end = typeof period.end === 'string' ? period.end.trim() : '';
  if (!start && !end) return undefined;
  return {
    ...(start ? { start } : {}),
    ...(end ? { end } : {}),
  };
}

function normalizeSectionToken(value: string): string {
  const token = String(value || '').trim();
  if (!token) return '';
  if (token.includes('|')) {
    const parts = token.split('|');
    return String(parts[parts.length - 1] || '').trim().toLowerCase();
  }
  return token.toLowerCase();
}

function buildSectionReferenceSet(bundle: FhirResourceLike, sections: string[]): Set<string> {
  const normalized = new Set(sections.map(normalizeSectionToken).filter(Boolean));
  const ids = new Set<string>();
  const entries = Array.isArray(bundle.entry) ? bundle.entry : [];

  for (const entry of entries) {
    const resource = (entry as Record<string, unknown>)?.resource as FhirResourceLike | undefined;
    if (!resource || resource.resourceType !== ResourceTypesFhirR4.Composition) continue;
    const sectionList = Array.isArray(resource.section) ? resource.section : [];

    for (const section of sectionList) {
      const sectionObject = section as Record<string, unknown>;
      const code = ((sectionObject.code as Record<string, unknown> | undefined)?.coding as unknown[] | undefined)?.find(
        (coding) => typeof (coding as Record<string, unknown>)?.code === 'string',
      ) as Record<string, unknown> | undefined;

      const codeValue = normalizeSectionToken(String(code?.code || ''));
      if (!codeValue || !normalized.has(codeValue)) continue;

      const refs = Array.isArray(sectionObject.entry) ? sectionObject.entry : [];
      for (const reference of refs) {
        const value = String((reference as Record<string, unknown>)?.reference || '').trim();
        if (!value) continue;
        ids.add(value);
        if (value.includes('/')) ids.add(value.split('/').pop() || value);
        if (value.toLowerCase().startsWith('urn:uuid:')) {
          ids.add(value.slice('urn:uuid:'.length));
        }
      }
    }
  }

  return ids;
}

function ensureComposition(bundle: FhirResourceLike): FhirResourceLike {
  const entries = Array.isArray(bundle.entry) ? bundle.entry : [];
  const existing = entries
    .map((entry) => (entry as Record<string, unknown>)?.resource as FhirResourceLike | undefined)
    .find((resource) => resource?.resourceType === ResourceTypesFhirR4.Composition);
  if (existing) return existing;

  const composition: FhirResourceLike = {
    resourceType: ResourceTypesFhirR4.Composition,
    id: `composition-${entries.length + 1}`,
    section: [],
  };

  entries.push({ resource: composition });
  bundle.entry = entries;
  return composition;
}

function ensureSectionOnComposition(composition: FhirResourceLike, sectionCode: string): Record<string, unknown> {
  const sections = Array.isArray(composition.section) ? composition.section as Record<string, unknown>[] : [];
  const targetCode = normalizeSectionToken(sectionCode);
  const existing = sections.find((section) => {
    const coding = ((section.code as Record<string, unknown> | undefined)?.coding as unknown[] | undefined)?.find(
      (item) => typeof (item as Record<string, unknown>)?.code === 'string',
    ) as Record<string, unknown> | undefined;
    return normalizeSectionToken(String(coding?.code || '')) === targetCode;
  });

  if (existing) return existing;

  const created: Record<string, unknown> = {
    code: {
      coding: [{ code: sectionCode.includes('|') ? sectionCode.split('|').pop() : sectionCode }],
    },
    entry: [],
  };
  sections.push(created);
  composition.section = sections;
  return created;
}

function matchesType(resource: FhirResourceLike, types: string[]): boolean {
  if (types.length === 0) return true;
  return types.includes(String(resource.resourceType || ''));
}

function matchesDate(resource: FhirResourceLike, date?: BundleResourceDateFilter): boolean {
  if (!date?.start && !date?.end) return true;
  const resourceRange = getCanonicalClinicalTemporalRange(resource);
  if (!resourceRange) return false;

  const queryStart = parseTemporalBoundary(date.start, false);
  const queryEnd = parseTemporalBoundary(date.end, true);
  const resourceStart = parseTemporalBoundary(resourceRange.start, false);
  const resourceEnd = parseTemporalBoundary(resourceRange.end, true);

  if (date.start && queryStart === undefined) return false;
  if (date.end && queryEnd === undefined) return false;
  if (resourceRange.start && resourceStart === undefined) return false;
  if (resourceRange.end && resourceEnd === undefined) return false;

  const normalizedQueryStart = queryStart ?? Number.NEGATIVE_INFINITY;
  const normalizedQueryEnd = queryEnd ?? Number.POSITIVE_INFINITY;
  const normalizedResourceStart = resourceStart ?? Number.NEGATIVE_INFINITY;
  const normalizedResourceEnd = resourceEnd ?? Number.POSITIVE_INFINITY;

  return normalizedResourceEnd >= normalizedQueryStart
    && normalizedResourceStart <= normalizedQueryEnd;
}

function parseTemporalBoundary(
  value: string | undefined,
  endOfDay: boolean,
): number | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(normalized);
  const timestamp = Date.parse(
    dateOnly
      ? `${normalized}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
      : normalized,
  );
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

/**
 * Returns resources from the bundle embedded in a Communication (or from a raw
 * Bundle) filtered by section, type, and date.
 */
export function getResources(
  communicationOrBundle: FhirResourceLike,
  filter: BundleResourceFilter = {},
): FhirResourceLike[] {
  const bundle = getBundleFromInput(communicationOrBundle);
  if (!bundle || !Array.isArray(bundle.entry)) return [];

  const sectionTokens = toArray(filter.sections);
  const sectionRefs = sectionTokens.length ? buildSectionReferenceSet(bundle, sectionTokens) : undefined;
  const types = toArray(filter.types);

  return bundle.entry
    .map((entry) => (entry as Record<string, unknown>)?.resource as FhirResourceLike | undefined)
    .filter((resource): resource is FhirResourceLike => Boolean(resource))
    .filter((resource) => {
      if (!sectionRefs) return true;
      const resourceId = String(resource.id || '').trim();
      const fullRef = `${resource.resourceType}/${resourceId}`;
      return sectionRefs.has(resourceId) || sectionRefs.has(fullRef);
    })
    .filter((resource) => matchesType(resource, types))
    .filter((resource) => matchesDate(resource, filter.date));
}

/**
 * Adds resources into the bundle embedded in a Communication (or raw Bundle)
 * and optionally links them to one or more Composition sections.
 */
export function addResources(
  communicationOrBundle: FhirResourceLike,
  resources: FhirResourceLike[],
  options: BundleResourceMutationOptions = {},
): FhirResourceLike {
  const bundle = ensureBundle(communicationOrBundle);
  const entries = Array.isArray(bundle.entry) ? bundle.entry as Array<Record<string, unknown>> : [];

  const sectionTokens = toArray(options.sections);
  const composition = sectionTokens.length ? ensureComposition(bundle) : undefined;
  const sectionObjects = composition
    ? sectionTokens.map((section) => ensureSectionOnComposition(composition, section))
    : [];

  resources.forEach((resource, index) => {
    const nextResource = clone(resource);
    if (!nextResource.id) {
      nextResource.id = `resource-${entries.length + index + 1}`;
    }

    entries.push({ resource: nextResource });

    if (sectionObjects.length) {
      const reference = `${nextResource.resourceType}/${nextResource.id}`;
      for (const section of sectionObjects) {
        const refs = Array.isArray(section.entry) ? section.entry as Array<Record<string, unknown>> : [];
        if (!refs.some((item) => item.reference === reference)) {
          refs.push({ reference });
        }
        section.entry = refs;
      }
    }
  });

  bundle.entry = entries;
  return bundle;
}

/**
 * Replaces resources matching the provided filter and appends the given new
 * resources, returning the updated bundle.
 */
export function setResources(
  communicationOrBundle: FhirResourceLike,
  filter: BundleResourceFilter,
  resources: FhirResourceLike[],
  options: BundleResourceMutationOptions = {},
): FhirResourceLike {
  const bundle = ensureBundle(communicationOrBundle);
  const toReplace = new Set(
    getResources(bundle, filter)
      .map((resource) => String(resource.id || '').trim())
      .filter(Boolean),
  );

  const entries = Array.isArray(bundle.entry) ? bundle.entry as Array<Record<string, unknown>> : [];
  bundle.entry = entries.filter((entry) => {
    const resource = entry.resource as FhirResourceLike | undefined;
    if (!resource) return true;
    const id = String(resource.id || '').trim();
    return !id || !toReplace.has(id);
  });

  return addResources(bundle, resources, options);
}

/**
 * Removes resources matching the provided filter.
 */
export function removeResources(
  communicationOrBundle: FhirResourceLike,
  filter: BundleResourceFilter,
): FhirResourceLike {
  return setResources(communicationOrBundle, filter, []);
}
