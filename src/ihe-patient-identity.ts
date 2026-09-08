// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { ResourceTypesFhirR4 } from 'gdc-common-utils-ts/constants/fhir-resource-types';
import type { BundleJsonApi } from 'gdc-common-utils-ts/models/bundle';

export type FhirPatientMatchInput = Readonly<{
  resourceType: 'Patient';
  [key: string]: unknown;
}>;

export type FhirParameters = Readonly<{
  resourceType: 'Parameters';
  parameter: readonly Readonly<Record<string, unknown>>[];
}>;

function operationUrl(fhirBaseUrl: string, operation: string): URL {
  const url = new URL(fhirBaseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/Patient/${operation}`;
  url.search = '';
  url.hash = '';
  return url;
}

/**
 * Builds IHE PDQm ITI-119 as one native FHIR `Parameters` request body.
 *
 * It is not an array and not a Bundle. A caller that intentionally batches
 * operations may place this `Parameters` resource in one `Bundle.entry`.
 *
 * @see https://profiles.ihe.net/ITI/PDQm/ITI-119.html
 */
export function buildPdqmPatientMatchRequest(input: Readonly<{
  fhirBaseUrl: string;
  patient: FhirPatientMatchInput;
  onlyCertainMatches?: boolean;
}>): Readonly<{ method: 'POST'; url: string; body: FhirParameters }> {
  if (input.patient?.resourceType !== 'Patient') {
    throw new TypeError('PDQm match requires a Patient resource');
  }
  const parameter: Readonly<Record<string, unknown>>[] = [
    { name: 'resource', resource: input.patient },
  ];
  if (typeof input.onlyCertainMatches === 'boolean') {
    parameter.push({ name: 'onlyCertainMatches', valueBoolean: input.onlyCertainMatches });
  }
  return {
    method: 'POST',
    url: operationUrl(input.fhirBaseUrl, '$match').toString(),
    body: { resourceType: 'Parameters', parameter },
  };
}

/**
 * Wraps one PDQm match operation in the canonical GW primary Bundle body.
 *
 * DIDComm plain transports this Bundle at `message.body`. Strict transport
 * signs/encrypts that same message and sends it as form field `request=<JWE>`.
 */
export function buildPdqmPatientMatchGatewayBody(
  request: ReturnType<typeof buildPdqmPatientMatchRequest>,
): BundleJsonApi {
  return {
    resourceType: 'Bundle',
    type: 'batch',
    total: 1,
    data: [{
      type: ResourceTypesFhirR4.Parameters,
      resource: request.body,
      request: {
        method: 'POST',
        url: 'Patient/$match',
      },
    }],
  };
}
