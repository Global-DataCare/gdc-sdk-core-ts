// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import {
  ClaimsIndividualProductSchemaorg,
  ClaimsOfferSchemaorg,
} from 'gdc-common-utils-ts/constants/schemaorg';
function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Accepts the complete submit/poll result and reads the first response entry.
 * Current Order and Organization/_issue responses return lifecycle claims in
 * `entry.resource.meta.claims`. Legacy entry-scoped projections remain
 * readable temporarily for rolling-deployment compatibility.
 */
function readFirstEntryClaims(value: unknown): Record<string, unknown> {
  const result = (value || {}) as Record<string, any>;
  const bundle = result.poll?.body || result.body || result;
  const entries = Array.isArray(bundle.data) ? bundle.data : Array.isArray(bundle.entry) ? bundle.entry : [];
  const first = (entries[0] || {}) as Record<string, any>;
  return (first.resource?.meta?.claims || first.meta?.claims || {}) as Record<string, unknown>;
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
  return normalizeText(readFirstEntryClaims(body)[ClaimsOfferSchemaorg.identifier]);
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
  return normalizeText(readFirstEntryClaims(body)[ClaimsIndividualProductSchemaorg.serialNumber]);
}
