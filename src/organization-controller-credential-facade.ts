// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { ActivationCredentialTypes } from 'gdc-common-utils-ts/constants/verifiable-credentials';

/**
 * Canonical output formats accepted by ICA direct credential retrieval.
 *
 * Keep these tokens centralized so frontend/BFF runtimes do not re-hardcode
 * query literals when switching between JSON VC payloads and JWT VC payloads.
 */
export const IcaCredentialFormats = Object.freeze({
  VcJson: 'vc+json',
  VcJwt: 'vc+jwt',
} as const);

/**
 * Shared retrieve-route defaults for the current ICA contract.
 *
 * These values model the direct `GET _retrieve` teaching path currently used by
 * controller-facing runtimes. Callers may still override them when another ICA
 * deployment exposes a different tenant id or profile version.
 */
export const IcaCredentialRetrieveDefaults = Object.freeze({
  tenantId: 'ica',
  protocolVersion: 'v1',
  credentialCollection: 'contract',
  credentialVersion: 'v2',
} as const);

/**
 * Compatibility prefix sometimes used in older GW/ICA examples.
 *
 * SDK callers should pass raw identifier values without this prefix. The
 * facade still strips it defensively so frontend/BFF code can tolerate mixed
 * legacy inputs while new integrations converge on plain identifier tokens.
 *
 * Important:
 * - the SDK must not assume that every accepted identifier is one tax id
 * - the SDK must not teach `TAX|...` as the canonical wire form
 * - when callers use `identifier`, the intended wire contract is the bare
 *   token value, not one prefixed or pipe-delimited representation
 */
export const LegacyTaxIdentifierPrefix = 'TAX|' as const;

export type IcaCredentialFormat = typeof IcaCredentialFormats[keyof typeof IcaCredentialFormats];

/**
 * Runtime-neutral route context needed to reach the ICA credential collection.
 *
 * Teaching flow:
 * 1. resolve the ICA deployment base URL through shared dataspace discovery
 * 2. choose the tenant id/jurisdiction/network that the target ICA expects
 * 3. pass that information to the facade so the runtime can build the direct
 *    `GET _retrieve` URL without hardcoding route fragments in the app layer
 */
export type IcaOrganizationCredentialRouteContext = Readonly<{
  jurisdiction: string;
  network?: string;
  /** @deprecated Use `network`. */
  sector?: string;
  tenantId?: string;
  protocolVersion?: string;
  credentialCollection?: string;
}>;

/**
 * Input for one direct ICA credential download.
 *
 * The caller owns `icaBaseUrl`. In production that URL should normally come
 * from one BFF/backend resolver layer or from a shared dataspace resolver that
 * the frontend trusts, rather than being hardcoded in the screen itself.
 *
 * Identifier semantics:
 * 1. `identifier` is the preferred teaching input
 * 2. the value is one plain token-like identifier string
 * 3. do not send one FHIR-style `system|value` pair here
 * 4. do not send one `coding system`
 * 5. do not send one pipe-delimited token
 * 6. do not assume the identifier is always a tax id
 *
 * Example:
 * - preferred: `VATES-B02652741`
 * - avoid in SDK examples: `urn:oid:...|VATES-B02652741`
 * - avoid in SDK examples: `TAX|VATES-B02652741`
 */
export type IcaCredentialDownloadInput = Readonly<{
  icaBaseUrl: string;
  route: IcaOrganizationCredentialRouteContext;
  identifier: string;
  format?: IcaCredentialFormat;
  credentialVersion?: string;
}>;

/**
 * Convenience input for downloading both controller-owned ICA credentials from
 * the same organization identifier.
 */
export type IcaControllerCredentialPairInput = IcaCredentialDownloadInput;

/**
 * Minimal HTTP response contract required by this facade.
 *
 * The package intentionally stays runtime-neutral, so it accepts either the
 * platform `fetch` implementation or one adapter that mimics the same subset
 * of methods used here.
 */
export type FetchLikeResponse = Readonly<{
  ok: boolean;
  status: number;
  headers?: { get(name: string): string | null | undefined };
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
}>;

export type FetchLike = (
  input: string,
  init?: Readonly<{
    method?: string;
    headers?: Record<string, string>;
  }>,
) => Promise<FetchLikeResponse>;

/**
 * Runtime-neutral retrieved ICA credential payload.
 *
 * - `vc+json` resolves to one JSON object
 * - `vc+jwt` resolves to one compact JWT string
 */
export type IcaRetrievedCredential = Record<string, unknown> | string;

/**
 * Bundle returned when a controller downloads both of its ICA credentials.
 */
export type IcaControllerCredentialPair = Readonly<{
  organizationCredential: IcaRetrievedCredential;
  legalRepresentativeCredential: IcaRetrievedCredential;
}>;

/**
 * High-level organization-controller facade for direct ICA credential
 * retrieval.
 *
 * This surface is intentionally didactic and step by step:
 * 1. resolve or receive the ICA base URL
 * 2. build the retrieve URL for the desired credential type
 * 3. download either the organization VC or the controller legal-representative VC
 * 4. optionally fetch both credentials as one teaching helper
 *
 * Query semantics documented for SDK consumers:
 * - direct ICA retrieval currently accepts `identifier` as one simplified
 *   token-like query value
 * - this is similar to one FHIR token search in intent, but not in full wire
 *   syntax
 * - the SDK teaching contract therefore uses the plain value only
 * - no `system|value`
 * - no `coding system`
 * - no pipe
 * - no canonical `TAX|` prefix assumption
 */
export interface OrganizationControllerCredentialFacade {
  /**
   * Builds the direct ICA URL for the organization VC.
   */
  buildOrganizationCredentialRetrieveUrl(input: IcaCredentialDownloadInput): string;
  /**
   * Builds the direct ICA URL for the controller legal-representative VC.
   */
  buildLegalRepresentativeCredentialRetrieveUrl(input: IcaCredentialDownloadInput): string;
  /**
   * Downloads the ICA-issued organization VC for one controller-owned
   * organization identifier.
   */
  retrieveOrganizationCredential(input: IcaCredentialDownloadInput): Promise<IcaRetrievedCredential>;
  /**
   * Downloads the ICA-issued controller legal-representative VC for one
   * controller-owned organization identifier.
   */
  retrieveLegalRepresentativeCredential(input: IcaCredentialDownloadInput): Promise<IcaRetrievedCredential>;
  /**
   * Downloads both controller-side ICA credentials from the same identifier.
   */
  retrieveControllerCredentials(input: IcaControllerCredentialPairInput): Promise<IcaControllerCredentialPair>;
}

export type CreateOrganizationControllerCredentialFacadeOptions = Readonly<{
  fetcher?: FetchLike;
}>;

const HttpMethods = Object.freeze({
  Get: 'GET',
} as const);

const HttpHeaderNames = Object.freeze({
  Accept: 'accept',
  ContentType: 'content-type',
} as const);

const HttpHeaderValues = Object.freeze({
  ApplicationJson: 'application/json',
  ApplicationVcJson: 'application/vc+json',
  ApplicationVcJwt: 'application/vc+jwt',
} as const);

function resolveRouteNetwork(route: IcaOrganizationCredentialRouteContext): string {
  const network = String(route.network || route.sector || '').trim();
  if (!network) {
    throw new Error('ICA credential retrieval requires route.network.');
  }
  return network;
}

function normalizeIdentifier(identifier: string): string {
  const trimmed = String(identifier || '').trim();
  if (!trimmed) {
    throw new Error('ICA credential retrieval requires identifier.');
  }
  return trimmed.startsWith(LegacyTaxIdentifierPrefix)
    ? trimmed.slice(LegacyTaxIdentifierPrefix.length)
    : trimmed;
}

function normalizeBasePath(pathname: string, tenantId: string): string {
  const trimmed = pathname.replace(/\/+$/u, '');
  if (!trimmed || trimmed === '/') {
    return `/${tenantId}`;
  }
  return trimmed.toLowerCase().endsWith(`/${tenantId}`.toLowerCase())
    ? trimmed
    : `${trimmed}/${tenantId}`;
}

function buildRetrieveUrl(
  input: IcaCredentialDownloadInput,
  credentialType: string,
): string {
  const icaBaseUrl = String(input.icaBaseUrl || '').trim();
  if (!icaBaseUrl) {
    throw new Error('ICA credential retrieval requires icaBaseUrl.');
  }
  const route = input.route;
  const tenantId = String(route.tenantId || IcaCredentialRetrieveDefaults.tenantId).trim();
  const jurisdiction = String(route.jurisdiction || '').trim();
  if (!jurisdiction) {
    throw new Error('ICA credential retrieval requires route.jurisdiction.');
  }
  const protocolVersion = String(route.protocolVersion || IcaCredentialRetrieveDefaults.protocolVersion).trim();
  const credentialCollection = String(
    route.credentialCollection || IcaCredentialRetrieveDefaults.credentialCollection,
  ).trim();
  const credentialVersion = String(
    input.credentialVersion || IcaCredentialRetrieveDefaults.credentialVersion,
  ).trim();
  const format = input.format || IcaCredentialFormats.VcJson;
  const identifier = normalizeIdentifier(input.identifier);
  const network = resolveRouteNetwork(route);

  const url = new URL(icaBaseUrl);
  url.pathname = [
    normalizeBasePath(url.pathname, tenantId),
    `cds-${jurisdiction}`,
    protocolVersion,
    network,
    'network',
    'credentials',
    credentialCollection,
    '_retrieve',
  ].join('/').replace(/\/{2,}/gu, '/');
  url.search = new URLSearchParams({
    type: credentialType,
    format,
    version: credentialVersion,
    identifier,
  }).toString();
  return url.toString();
}

async function readCredentialResponse(
  response: FetchLikeResponse,
  format: IcaCredentialFormat,
): Promise<IcaRetrievedCredential> {
  if (!response.ok) {
    const diagnostics = response.text ? await response.text() : '';
    throw new Error(`ICA credential retrieval failed with status ${response.status}${diagnostics ? `: ${diagnostics}` : '.'}`);
  }

  if (format === IcaCredentialFormats.VcJwt) {
    if (!response.text) {
      throw new Error('ICA vc+jwt retrieval requires response.text().');
    }
    return response.text();
  }

  if (!response.json) {
    throw new Error('ICA vc+json retrieval requires response.json().');
  }
  const payload = await response.json();
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('ICA vc+json retrieval returned a non-object payload.');
  }
  return payload as Record<string, unknown>;
}

/**
 * Creates the runtime-neutral organization-controller credential facade.
 *
 * Integration note:
 * - `sdk-core` only defines the retrieval contract
 * - the caller supplies the real `fetch` implementation
 * - the caller also decides where the ICA base URL comes from
 * - the recommended source for that URL is one shared dataspace resolver or
 *   one trusted BFF, not one screen-local hardcoded literal
 *
 * Identifier note:
 * - use `identifier` as one plain token-like query value
 * - treat it as context-dependent
 * - do not force FHIR token syntax with `system|value`
 * - do not force tax-id-only semantics unless the surrounding business flow
 *   explicitly narrows the identifier domain
 */
export function createOrganizationControllerCredentialFacade(
  options: CreateOrganizationControllerCredentialFacadeOptions = {},
): OrganizationControllerCredentialFacade {
  const fetcher = options.fetcher || (globalThis.fetch as unknown as FetchLike);
  if (typeof fetcher !== 'function') {
    throw new Error('OrganizationControllerCredentialFacade requires one fetcher.');
  }

  async function retrieveByType(
    input: IcaCredentialDownloadInput,
    credentialType: string,
  ): Promise<IcaRetrievedCredential> {
    const format = input.format || IcaCredentialFormats.VcJson;
    const url = buildRetrieveUrl(input, credentialType);
    const response = await fetcher(url, {
      method: HttpMethods.Get,
      headers: {
        [HttpHeaderNames.Accept]:
          format === IcaCredentialFormats.VcJwt
            ? HttpHeaderValues.ApplicationVcJwt
            : HttpHeaderValues.ApplicationVcJson,
      },
    });
    return readCredentialResponse(response, format);
  }

  return {
    buildOrganizationCredentialRetrieveUrl(input) {
      return buildRetrieveUrl(input, ActivationCredentialTypes.OrganizationCredential);
    },
    buildLegalRepresentativeCredentialRetrieveUrl(input) {
      return buildRetrieveUrl(input, ActivationCredentialTypes.LegalRepresentativeCredential);
    },
    retrieveOrganizationCredential(input) {
      return retrieveByType(input, ActivationCredentialTypes.OrganizationCredential);
    },
    retrieveLegalRepresentativeCredential(input) {
      return retrieveByType(input, ActivationCredentialTypes.LegalRepresentativeCredential);
    },
    async retrieveControllerCredentials(input) {
      const [organizationCredential, legalRepresentativeCredential] = await Promise.all([
        retrieveByType(input, ActivationCredentialTypes.OrganizationCredential),
        retrieveByType(input, ActivationCredentialTypes.LegalRepresentativeCredential),
      ]);
      return {
        organizationCredential,
        legalRepresentativeCredential,
      };
    },
  };
}
