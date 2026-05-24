// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import {
  ObservationCategoryCodes,
  VitalSignsCodes,
  VitalSignsUnits,
} from 'gdc-common-utils-ts/constants/vital-signs';
import {
  ResourceTypesFhirR4,
} from 'gdc-common-utils-ts/constants/fhir-resource-types';
import type { FhirResourceLike } from './communication-resource-helpers.js';

export type VitalSignQuantityInput = Readonly<{
  value: number;
  effectiveDateTime?: string;
  subject?: string;
  id?: string;
}>;

export type BloodPressureInput = Readonly<{
  systolic: number;
  diastolic: number;
  effectiveDateTime?: string;
  subject?: string;
  id?: string;
}>;

type CodingDescriptor = Readonly<{
  system: string;
  code: string;
  display?: string;
}>;

export type VitalSignsDocumentBase = Readonly<{
  getResources: (resourceType?: string) => FhirResourceLike[];
}>;

function withObservationBase(
  code: CodingDescriptor,
  input: VitalSignQuantityInput | BloodPressureInput,
): FhirResourceLike {
  const observation: FhirResourceLike = {
    resourceType: ResourceTypesFhirR4.Observation,
    status: 'final',
    category: [
      {
        coding: [{
          system: ObservationCategoryCodes.VitalSigns.system,
          code: ObservationCategoryCodes.VitalSigns.code,
          display: ObservationCategoryCodes.VitalSigns.display,
        }],
      },
    ],
    code: {
      coding: [{
        system: code.system,
        code: code.code,
        ...(code.display ? { display: code.display } : {}),
      }],
    },
  };
  if (input.id) observation.id = input.id;
  if (input.effectiveDateTime) observation.effectiveDateTime = input.effectiveDateTime;
  if (input.subject) observation.subject = { reference: input.subject };
  return observation;
}

function getCodingToken(resource: FhirResourceLike): string | undefined {
  const code = resource.code as Record<string, unknown> | undefined;
  const codingList = code && Array.isArray(code.coding) ? code.coding : [];
  const coding = codingList[0];
  if (!coding || typeof coding !== 'object') return undefined;
  const system = typeof (coding as Record<string, unknown>).system === 'string'
    ? String((coding as Record<string, unknown>).system)
    : '';
  const value = typeof (coding as Record<string, unknown>).code === 'string'
    ? String((coding as Record<string, unknown>).code)
    : '';
  if (system && value) return `${system}|${value}`;
  return value || undefined;
}

function getVitalSignObservations(
  document: VitalSignsDocumentBase,
  acceptedTokens?: string[],
): FhirResourceLike[] {
  const observations = document.getResources(ResourceTypesFhirR4.Observation);
  const vitalCategoryToken = ObservationCategoryCodes.VitalSigns.claim;
  const accepted = new Set(acceptedTokens || []);
  return observations.filter((resource) => {
    const categories = Array.isArray(resource.category) ? resource.category : [];
    const isVitalSign = categories.some((category) => {
      if (!category || typeof category !== 'object') return false;
      const categoryRecord = category as Record<string, unknown>;
      const coding = Array.isArray(categoryRecord.coding)
        ? categoryRecord.coding
        : [];
      return coding.some((item: unknown) => {
        if (!item || typeof item !== 'object') return false;
        const record = item as Record<string, unknown>;
        return `${String(record.system || '')}|${String(record.code || '')}` === vitalCategoryToken;
      });
    });
    if (!isVitalSign) return false;
    if (!accepted.size) return true;
    const codeToken = getCodingToken(resource);
    return Boolean(codeToken && (accepted.has(codeToken) || accepted.has(codeToken.split('|').pop() || '')));
  });
}

/**
 * Creates a FHIR R4 vital-sign `Observation` for heart rate.
 */
export function createHeartRateObservation(input: VitalSignQuantityInput): FhirResourceLike {
  return {
    ...withObservationBase(VitalSignsCodes.HeartRate, input),
    valueQuantity: {
      value: input.value,
      system: VitalSignsUnits.BeatsPerMinute.system,
      code: VitalSignsUnits.BeatsPerMinute.code,
      unit: VitalSignsUnits.BeatsPerMinute.display,
    },
  };
}

/**
 * Creates a FHIR R4 vital-sign `Observation` for body temperature.
 */
export function createBodyTemperatureObservation(input: VitalSignQuantityInput): FhirResourceLike {
  return {
    ...withObservationBase(VitalSignsCodes.BodyTemperature, input),
    valueQuantity: {
      value: input.value,
      system: VitalSignsUnits.Celsius.system,
      code: VitalSignsUnits.Celsius.code,
      unit: VitalSignsUnits.Celsius.display,
    },
  };
}

/**
 * Creates a FHIR R4 vital-sign `Observation` for blood pressure.
 */
export function createBloodPressureObservation(input: BloodPressureInput): FhirResourceLike {
  return {
    ...withObservationBase(VitalSignsCodes.BloodPressure, input),
    component: [
      {
        code: {
          coding: [{
            system: VitalSignsCodes.SystolicBloodPressure.system,
            code: VitalSignsCodes.SystolicBloodPressure.code,
            display: VitalSignsCodes.SystolicBloodPressure.display,
          }],
        },
        valueQuantity: {
          value: input.systolic,
          system: VitalSignsUnits.MillimeterOfMercury.system,
          code: VitalSignsUnits.MillimeterOfMercury.code,
          unit: VitalSignsUnits.MillimeterOfMercury.display,
        },
      },
      {
        code: {
          coding: [{
            system: VitalSignsCodes.DiastolicBloodPressure.system,
            code: VitalSignsCodes.DiastolicBloodPressure.code,
            display: VitalSignsCodes.DiastolicBloodPressure.display,
          }],
        },
        valueQuantity: {
          value: input.diastolic,
          system: VitalSignsUnits.MillimeterOfMercury.system,
          code: VitalSignsUnits.MillimeterOfMercury.code,
          unit: VitalSignsUnits.MillimeterOfMercury.display,
        },
      },
    ],
  };
}

/**
 * Creates a read-only facade specialized in vital-sign observations.
 */
export function createVitalSignsFacade(document: VitalSignsDocumentBase) {
  return Object.freeze({
    getAll: () => getVitalSignObservations(document),
    getHeartRate: () => getVitalSignObservations(document, [VitalSignsCodes.HeartRate.claim]),
    getBloodPressure: () => getVitalSignObservations(document, [VitalSignsCodes.BloodPressure.claim]),
    getBodyTemperature: () => getVitalSignObservations(document, [VitalSignsCodes.BodyTemperature.claim]),
  });
}
