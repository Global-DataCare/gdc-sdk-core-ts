// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { ResourceTypesFhirR4 } from 'gdc-common-utils-ts/constants/fhir-resource-types';
import type { CommunicationInput } from './communication-bundle-contracts.js';
import {
  addResources,
  getResources,
  removeResources,
  setResources,
  type BundleResourceFilter,
  type BundleResourceMutationOptions,
} from './communication-bundle-resources.js';
import type { FhirResourceLike } from './communication-resource-helpers.js';
import {
  ConsentCommunicationOperationKinds,
  type ConsentCommunicationOperationInput,
  type ConsentCommunicationOperationKind,
  type ConsentCommunicationTargetKind,
  assertConsentCommunicationOperationInput,
} from './consent-communication-operations.js';

export type UniformMutationContract<
  TContainer,
  TItem,
  TFilter,
  TAddOptions = undefined,
  TSetOptions = undefined,
> = Readonly<{
  getX: (container: TContainer, filter?: TFilter) => TItem[];
  setX: (container: TContainer, filter: TFilter, items: TItem[], options?: TSetOptions) => TContainer;
  addX: (container: TContainer, items: TItem[], options?: TAddOptions) => TContainer;
  enableX: (container: TContainer, filter: TFilter) => TContainer;
  disableX: (container: TContainer, filter: TFilter) => TContainer;
  removeX: (container: TContainer, filter: TFilter) => TContainer;
}>;

export type ConsentOperationMutationSurface = Readonly<{
  getConsentOperations: (input: CommunicationInput, filter?: ConsentCommunicationOperationFilter) => ConsentCommunicationOperationInput[];
  setConsentOperations: (
    input: CommunicationInput,
    filter: ConsentCommunicationOperationFilter,
    operations: ConsentCommunicationOperationInput[],
  ) => CommunicationInput;
  addConsentOperations: (
    input: CommunicationInput,
    operations: ConsentCommunicationOperationInput[],
  ) => CommunicationInput;
  enableConsentOperations: (input: CommunicationInput, filter: ConsentCommunicationOperationFilter) => CommunicationInput;
  disableConsentOperations: (input: CommunicationInput, filter: ConsentCommunicationOperationFilter) => CommunicationInput;
  removeConsentOperations: (input: CommunicationInput, filter: ConsentCommunicationOperationFilter) => CommunicationInput;
}>;

export type CommunicationResourceMutationSurface = Readonly<{
  getCommunicationResources: (communicationOrBundle: FhirResourceLike, filter?: BundleResourceFilter) => FhirResourceLike[];
  setCommunicationResources: (
    communicationOrBundle: FhirResourceLike,
    filter: BundleResourceFilter,
    resources: FhirResourceLike[],
    options?: BundleResourceMutationOptions,
  ) => FhirResourceLike;
  addCommunicationResources: (
    communicationOrBundle: FhirResourceLike,
    resources: FhirResourceLike[],
    options?: BundleResourceMutationOptions,
  ) => FhirResourceLike;
  enableCommunicationResources: (communicationOrBundle: FhirResourceLike, filter: BundleResourceFilter) => FhirResourceLike;
  disableCommunicationResources: (communicationOrBundle: FhirResourceLike, filter: BundleResourceFilter) => FhirResourceLike;
  removeCommunicationResources: (communicationOrBundle: FhirResourceLike, filter: BundleResourceFilter) => FhirResourceLike;
}>;

export type ConsentCommunicationOperationFilter = Readonly<{
  operationIds?: string | string[];
  operationKinds?: ConsentCommunicationOperationKind | ConsentCommunicationOperationKind[];
  targetKinds?: ConsentCommunicationTargetKind | ConsentCommunicationTargetKind[];
  sections?: string | string[];
  purposes?: string | string[];
  types?: string | string[];
  date?: Readonly<{ start?: string; end?: string }>;
}>;

export const CommunicationResourceLifecycleTagSystem = 'org.gdc.resource.lifecycle' as const;

export const CommunicationResourceLifecycleTagCode = Object.freeze({
  Enabled: 'enabled',
  Disabled: 'disabled',
} as const);

function toArray(value?: string | string[]): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value])
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function toKindArray<T extends string>(value?: T | T[]): T[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value])
    .map((item) => String(item || '').trim())
    .filter(Boolean) as T[];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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

function getOperationDate(operation: ConsentCommunicationOperationInput): string | undefined {
  const date = String(operation.consentDate || operation.periodStart || '').trim();
  return date || undefined;
}

function matchesDate(
  operation: ConsentCommunicationOperationInput,
  date?: Readonly<{ start?: string; end?: string }>,
): boolean {
  if (!date?.start && !date?.end) return true;
  const value = getOperationDate(operation);
  if (!value) return false;
  if (date.start && value < date.start) return false;
  if (date.end && value > date.end) return false;
  return true;
}

function getOperationList(input: CommunicationInput): ConsentCommunicationOperationInput[] {
  const payload = input.payload as Record<string, unknown> | undefined;
  const operations = payload?.operations;
  if (!Array.isArray(operations)) return [];
  return operations.map((item) => assertConsentCommunicationOperationInput(item as ConsentCommunicationOperationInput));
}

function setOperationList(
  input: CommunicationInput,
  operations: ConsentCommunicationOperationInput[],
): CommunicationInput {
  const next = clone(input);
  const payload = (next.payload && typeof next.payload === 'object' && !Array.isArray(next.payload))
    ? { ...(next.payload as Record<string, unknown>) }
    : {};
  payload.operations = operations;
  next.payload = payload;
  return next;
}

function matchesOperation(
  operation: ConsentCommunicationOperationInput,
  filter: ConsentCommunicationOperationFilter,
): boolean {
  const operationIds = toArray(filter.operationIds);
  if (operationIds.length && !operationIds.includes(operation.operationId)) return false;

  const operationKinds = toKindArray(filter.operationKinds);
  if (operationKinds.length && !operationKinds.includes(operation.operationKind)) return false;

  const targetKinds = toKindArray(filter.targetKinds);
  if (targetKinds.length && !targetKinds.includes(operation.target.kind)) return false;

  const purposes = toArray(filter.purposes);
  if (purposes.length && !purposes.includes(operation.purpose)) return false;

  const sections = toArray(filter.sections).map(normalizeSectionToken);
  if (sections.length) {
    const operationSections = [
      ...operation.sections.core,
      ...(operation.sections.extended || []),
    ].map(normalizeSectionToken);
    if (!sections.some((section) => operationSections.includes(section))) return false;
  }

  const types = toArray(filter.types);
  if (types.length && !types.includes(ResourceTypesFhirR4.Consent)) return false;

  return matchesDate(operation, filter.date);
}

export function getConsentOperations(
  input: CommunicationInput,
  filter: ConsentCommunicationOperationFilter = {},
): ConsentCommunicationOperationInput[] {
  return getOperationList(input).filter((operation) => matchesOperation(operation, filter));
}

export function addConsentOperations(
  input: CommunicationInput,
  operations: ConsentCommunicationOperationInput[],
): CommunicationInput {
  const current = getOperationList(input);
  const additions = operations.map(assertConsentCommunicationOperationInput);
  return setOperationList(input, [...current, ...additions]);
}

export function setConsentOperations(
  input: CommunicationInput,
  filter: ConsentCommunicationOperationFilter,
  operations: ConsentCommunicationOperationInput[],
): CommunicationInput {
  const current = getOperationList(input);
  const keep = current.filter((operation) => !matchesOperation(operation, filter));
  const replacements = operations.map(assertConsentCommunicationOperationInput);
  return setOperationList(input, [...keep, ...replacements]);
}

function setConsentOperationKindByFilter(
  input: CommunicationInput,
  filter: ConsentCommunicationOperationFilter,
  operationKind: ConsentCommunicationOperationKind,
): CommunicationInput {
  const current = getOperationList(input);
  const next = current.map((operation) => {
    if (!matchesOperation(operation, filter)) return operation;
    return {
      ...operation,
      operationKind,
    };
  });
  return setOperationList(input, next);
}

export function enableConsentOperations(
  input: CommunicationInput,
  filter: ConsentCommunicationOperationFilter,
): CommunicationInput {
  return setConsentOperationKindByFilter(input, filter, ConsentCommunicationOperationKinds.Enable);
}

export function disableConsentOperations(
  input: CommunicationInput,
  filter: ConsentCommunicationOperationFilter,
): CommunicationInput {
  return setConsentOperationKindByFilter(input, filter, ConsentCommunicationOperationKinds.Disable);
}

export function removeConsentOperations(
  input: CommunicationInput,
  filter: ConsentCommunicationOperationFilter,
): CommunicationInput {
  const current = getOperationList(input);
  return setOperationList(input, current.filter((operation) => !matchesOperation(operation, filter)));
}

function setResourceLifecycleState(
  resources: FhirResourceLike[],
  enabled: boolean,
): FhirResourceLike[] {
  return resources.map((resource) => {
    const next = clone(resource);
    const meta = (next.meta && typeof next.meta === 'object' && !Array.isArray(next.meta))
      ? { ...(next.meta as Record<string, unknown>) }
      : {};
    const tags = Array.isArray(meta.tag) ? [...(meta.tag as Array<Record<string, unknown>>)] : [];

    const retained = tags.filter((tag) => String(tag.system || '').trim() !== CommunicationResourceLifecycleTagSystem);
    retained.push({
      system: CommunicationResourceLifecycleTagSystem,
      code: enabled
        ? CommunicationResourceLifecycleTagCode.Enabled
        : CommunicationResourceLifecycleTagCode.Disabled,
    });

    meta.tag = retained;
    next.meta = meta;
    return next;
  });
}

export function enableCommunicationResources(
  communicationOrBundle: FhirResourceLike,
  filter: BundleResourceFilter,
): FhirResourceLike {
  const matched = getResources(communicationOrBundle, filter);
  const enabled = setResourceLifecycleState(matched, true);
  return setResources(communicationOrBundle, filter, enabled);
}

export function disableCommunicationResources(
  communicationOrBundle: FhirResourceLike,
  filter: BundleResourceFilter,
): FhirResourceLike {
  const matched = getResources(communicationOrBundle, filter);
  const disabled = setResourceLifecycleState(matched, false);
  return setResources(communicationOrBundle, filter, disabled);
}

export const ConsentOperationMutationContract: ConsentOperationMutationSurface & UniformMutationContract<
  CommunicationInput,
  ConsentCommunicationOperationInput,
  ConsentCommunicationOperationFilter
> = Object.freeze({
  getConsentOperations,
  setConsentOperations,
  addConsentOperations,
  enableConsentOperations,
  disableConsentOperations,
  removeConsentOperations,
  // Backward-compatible aliases.
  getX: getConsentOperations,
  setX: setConsentOperations,
  addX: addConsentOperations,
  enableX: enableConsentOperations,
  disableX: disableConsentOperations,
  removeX: removeConsentOperations,
});

export const CommunicationResourceMutationContract: CommunicationResourceMutationSurface & UniformMutationContract<
  FhirResourceLike,
  FhirResourceLike,
  BundleResourceFilter,
  BundleResourceMutationOptions,
  BundleResourceMutationOptions
> = Object.freeze({
  getCommunicationResources: getResources,
  setCommunicationResources: setResources,
  addCommunicationResources: addResources,
  enableCommunicationResources,
  disableCommunicationResources,
  removeCommunicationResources: removeResources,
  // Backward-compatible aliases.
  getX: getResources,
  setX: setResources,
  addX: addResources,
  enableX: enableCommunicationResources,
  disableX: disableCommunicationResources,
  removeX: removeResources,
});
