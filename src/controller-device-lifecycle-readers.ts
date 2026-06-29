// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import {
  ClaimsIndividualProductSchemaorg,
  ClaimsOfferSchemaorg,
} from 'gdc-common-utils-ts/constants/schemaorg';
import { getClaimsInFirstDataEntry } from 'gdc-common-utils-ts/utils/bundle-reader';

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Reads the canonical commercial Offer identifier from one GW poll result body.
 *
 * Use this after:
 * - legal organization `_transaction-response`
 * - legacy legal organization `_activate-response`
 * - commercial individual organization `_transaction-response`
 */
export function readCommercialOfferId(body: unknown): string {
  const pollBody = (body || {}) as Record<string, unknown>;
  const bundle = ((pollBody.body as Record<string, unknown> | undefined) || pollBody);
  return normalizeText(getClaimsInFirstDataEntry(bundle)[ClaimsOfferSchemaorg.identifier]);
}

/**
 * Reads the canonical activation code returned for controller/professional
 * device bootstrap from one GW poll result body.
 *
 * Use this after:
 * - legal organization `Order/_batch-response`
 * - legal organization `_issue-response`
 * - other flows that return `org.schema.IndividualProduct.serialNumber`
 */
export function readActivationCode(body: unknown): string {
  const pollBody = (body || {}) as Record<string, unknown>;
  const bundle = ((pollBody.body as Record<string, unknown> | undefined) || pollBody);
  return normalizeText(getClaimsInFirstDataEntry(bundle)[ClaimsIndividualProductSchemaorg.serialNumber]);
}
