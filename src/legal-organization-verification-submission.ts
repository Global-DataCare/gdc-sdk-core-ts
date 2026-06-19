// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import type { BundleJsonApi } from 'gdc-common-utils-ts/models/bundle';
import { getBaseUrlFromDidWeb } from 'gdc-common-utils-ts/utils/did';
import {
  buildLegalOrganizationVerificationTransactionBundle,
  type LegalOrganizationVerificationTransactionInput,
} from 'gdc-common-utils-ts/utils/legal-organization-verification-transaction';

export type LegalOrganizationVerificationGatewayRouteInput = Readonly<{
  /**
   * Host publication/discovery jurisdiction used in the GW host route:
   * `/host/cds-{jurisdiction}/v1/{hostNetwork}/...`
   *
   * This is a host-scoped value. It must not be confused with the tenant
   * organization jurisdiction used later by tenant-scoped routes.
   */
  jurisdiction: string;
  /**
   * Host runtime/network path segment used in:
   * `/host/cds-{jurisdiction}/v1/{hostNetwork}/...`
   *
   * Step by step:
   * - on host routes this segment identifies the host runtime/network scope
   * - on tenant routes the analogous segment is usually called `sector`
   * - do not reuse the tenant term `sector` when documenting host onboarding
   */
  hostNetwork: string;
}>;

export type LegalOrganizationVerificationGatewayTarget = Readonly<{
  providerDidWeb?: string;
  providerBaseUrl?: string;
}>;

export type LegalOrganizationVerificationGatewaySubmission = Readonly<{
  method: 'POST';
  endpointPath: string;
  endpointUrl: string;
  authorization: Readonly<{
    scheme: 'Bearer';
    tokenType: 'id_token';
    token: string;
  }>;
  contentType: 'application/json';
  body: BundleJsonApi;
}>;

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

/**
 * Builds the canonical GW CORE host path for the first legal-organization
 * onboarding step that forwards a verification request to ICA.
 *
 * This route is intentionally distinct from `_activate`:
 * - `_transaction` starts from the signed PDF evidence and controller binding
 * - `_activate` starts from an already-issued ICA proof (`vp_token`)
 *
 * Routing rule:
 * - `{jurisdiction}` here is the host coverage/publication jurisdiction
 * - `{hostNetwork}` here is the host runtime/network segment
 * - neither value should be inferred from the tenant business sector
 */
export function resolveLegalOrganizationVerificationGatewayPath(
  input: LegalOrganizationVerificationGatewayRouteInput,
): string {
  const jurisdiction = normalizeText(input.jurisdiction).toLowerCase();
  const hostNetwork = normalizeText(input.hostNetwork);
  if (!jurisdiction) {
    throw new Error('resolveLegalOrganizationVerificationGatewayPath requires jurisdiction.');
  }
  if (!hostNetwork) {
    throw new Error('resolveLegalOrganizationVerificationGatewayPath requires hostNetwork.');
  }
  return `/host/cds-${jurisdiction}/v1/${hostNetwork}/registry/org.schema/Organization/_transaction`;
}

/**
 * Resolves the absolute GW CORE URL for the legal-organization verification
 * transaction from either a provider `did:web` or an explicit base URL.
 */
export function resolveLegalOrganizationVerificationGatewayUrl(
  target: LegalOrganizationVerificationGatewayTarget,
  route: LegalOrganizationVerificationGatewayRouteInput,
): string {
  const explicitBaseUrl = normalizeText(target.providerBaseUrl);
  const providerDidWeb = normalizeText(target.providerDidWeb);
  const baseUrl = explicitBaseUrl
    ? normalizeBaseUrl(explicitBaseUrl)
    : normalizeBaseUrl(getBaseUrlFromDidWeb(providerDidWeb));
  if (!baseUrl) {
    throw new Error('resolveLegalOrganizationVerificationGatewayUrl requires providerBaseUrl or providerDidWeb.');
  }
  return `${baseUrl}${resolveLegalOrganizationVerificationGatewayPath(route)}`;
}

/**
 * Canonical SDK-core builder for the first legal-organization onboarding
 * payload submitted to GW CORE host `_transaction`.
 */
export function buildLegalOrganizationVerificationGatewayRequestBundle(
  input: LegalOrganizationVerificationTransactionInput,
): BundleJsonApi {
  return buildLegalOrganizationVerificationTransactionBundle(input);
}

/**
 * Creates the HTTP submission descriptor that a node/frontend runtime can send
 * to GW CORE for the host-side legal-organization verification transaction.
 */
export function createLegalOrganizationVerificationGatewaySubmission(input: Readonly<{
  target: LegalOrganizationVerificationGatewayTarget;
  route: LegalOrganizationVerificationGatewayRouteInput;
  idToken: string;
  body: BundleJsonApi;
}>): LegalOrganizationVerificationGatewaySubmission {
  return {
    method: 'POST',
    endpointPath: resolveLegalOrganizationVerificationGatewayPath(input.route),
    endpointUrl: resolveLegalOrganizationVerificationGatewayUrl(input.target, input.route),
    authorization: {
      scheme: 'Bearer',
      tokenType: 'id_token',
      token: normalizeText(input.idToken),
    },
    contentType: 'application/json',
    body: input.body,
  };
}
