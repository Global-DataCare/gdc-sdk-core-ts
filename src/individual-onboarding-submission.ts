// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import type { BundleJsonApi } from 'gdc-common-utils-ts/models/bundle';
import type {
  IndividualFormTemplateFields,
  IndividualOnboardingPdfTemplateInput,
  IndividualOrganizationKycPayload,
} from 'gdc-common-utils-ts/models/individual-onboarding';
import { getBaseUrlFromDidWeb } from 'gdc-common-utils-ts/utils/did';
import { ClaimsOrganizationSchemaorg } from 'gdc-common-utils-ts/constants/schemaorg';
import { ResourceTypesFhirR4 } from 'gdc-common-utils-ts/constants/fhir-resource-types';

export const IndividualOnboardingGatewayOperation = Object.freeze({
  PdfDraftCreate: 'pdf-draft-create',
  OrganizationRegister: 'organization-register',
} as const);

export type IndividualOnboardingGatewayOperation =
  typeof IndividualOnboardingGatewayOperation[keyof typeof IndividualOnboardingGatewayOperation];

export type IndividualOnboardingGatewayRouteInput = Readonly<{
  tenantId: string;
  jurisdiction: string;
  sector: string;
  operation: IndividualOnboardingGatewayOperation;
}>;

export type IndividualOnboardingGatewayTarget = Readonly<{
  providerDidWeb?: string;
  providerBaseUrl?: string;
}>;

export type IndividualOnboardingGatewaySubmission = Readonly<{
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

export type IndividualOnboardingPdfDraftGatewayRequestInput = Readonly<{
  subjectDid: string;
  template: IndividualOnboardingPdfTemplateInput;
  formFields: IndividualFormTemplateFields;
  claims?: Record<string, unknown>;
  kyc?: IndividualOrganizationKycPayload;
}>;

export type IndividualOrganizationRegistrationGatewayRequestInput = Readonly<{
  claims: Record<string, unknown>;
  attachments?: unknown[];
}>;

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

/**
 * Builds the canonical GW CORE path for the current individual onboarding flow.
 *
 * Current supported operations:
 * - onboarding PDF draft generation
 * - final individual organization registration
 */
export function resolveIndividualOnboardingGatewayPath(
  input: IndividualOnboardingGatewayRouteInput,
): string {
  const tenantId = normalizeText(input.tenantId);
  const jurisdiction = normalizeText(input.jurisdiction).toLowerCase();
  const sector = normalizeText(input.sector);
  if (!tenantId) throw new Error('resolveIndividualOnboardingGatewayPath requires tenantId.');
  if (!jurisdiction) throw new Error('resolveIndividualOnboardingGatewayPath requires jurisdiction.');
  if (!sector) throw new Error('resolveIndividualOnboardingGatewayPath requires sector.');

  const basePath = `/${tenantId}/cds-${jurisdiction}/v1/${sector}/individual`;
  if (input.operation === IndividualOnboardingGatewayOperation.PdfDraftCreate) {
    return `${basePath}/pdf/${ResourceTypesFhirR4.DocumentReference}/_create`;
  }
  return `${basePath}/org.schema/Organization/_transaction`;
}

/**
 * Resolves the absolute HTTPS target for the current individual onboarding
 * operation from either a provider `did:web` or an explicit base URL.
 */
export function resolveIndividualOnboardingGatewayUrl(
  target: IndividualOnboardingGatewayTarget,
  route: IndividualOnboardingGatewayRouteInput,
): string {
  const explicitBaseUrl = normalizeText(target.providerBaseUrl);
  const providerDidWeb = normalizeText(target.providerDidWeb);
  const baseUrl = explicitBaseUrl
    ? normalizeBaseUrl(explicitBaseUrl)
    : normalizeBaseUrl(getBaseUrlFromDidWeb(providerDidWeb));
  if (!baseUrl) {
    throw new Error('resolveIndividualOnboardingGatewayUrl requires providerBaseUrl or providerDidWeb.');
  }
  return `${baseUrl}${resolveIndividualOnboardingGatewayPath(route)}`;
}

/**
 * Builds the canonical request bundle for GW CORE onboarding PDF draft
 * generation.
 *
 * Production note:
 * - portal/backend code should ensure the controller email carried by the
 *   form/claims is consistent with the authenticated controller `id_token`
 * - this helper does not enforce that runtime identity policy
 */
export function buildIndividualOnboardingPdfDraftGatewayRequestBundle(
  input: IndividualOnboardingPdfDraftGatewayRequestInput,
): BundleJsonApi {
  const subjectDid = normalizeText(input.subjectDid);
  const claims = {
    ...(input.claims || {}),
    [ClaimsOrganizationSchemaorg.identifier]: subjectDid,
  };

  return {
    resourceType: 'Bundle',
    type: 'collection',
    total: 1,
    data: [{
      type: ResourceTypesFhirR4.DocumentReference,
      resource: {
        resourceType: ResourceTypesFhirR4.DocumentReference,
        meta: {
          claims,
          template: input.template,
          formFields: input.formFields,
          ...(input.kyc ? { kyc: input.kyc } : {}),
        },
      },
    }],
  };
}

/**
 * Builds the canonical request bundle for the final individual organization
 * registration call.
 *
 * Demo note:
 * - current demo/development flows may rely on OTP outside GW CORE and then
 *   submit the already-completed claim set here
 * - a real signed PDF attachment can still be added later through
 *   `attachments[]` when that evidence is available
 */
export function buildIndividualOrganizationRegistrationGatewayRequestBundle(
  input: IndividualOrganizationRegistrationGatewayRequestInput,
): BundleJsonApi {
  return {
    resourceType: 'Bundle',
    type: 'collection',
    total: 1,
    data: [{
      type: 'Family-registration-form-v1.0',
      meta: {
        claims: input.claims,
      },
    }],
    ...(Array.isArray(input.attachments) && input.attachments.length > 0
      ? { attachments: input.attachments }
      : {}),
  } as BundleJsonApi;
}

export function createIndividualOnboardingGatewaySubmission(input: Readonly<{
  target: IndividualOnboardingGatewayTarget;
  route: IndividualOnboardingGatewayRouteInput;
  idToken: string;
  body: BundleJsonApi;
}>): IndividualOnboardingGatewaySubmission {
  return {
    method: 'POST',
    endpointPath: resolveIndividualOnboardingGatewayPath(input.route),
    endpointUrl: resolveIndividualOnboardingGatewayUrl(input.target, input.route),
    authorization: {
      scheme: 'Bearer',
      tokenType: 'id_token',
      token: normalizeText(input.idToken),
    },
    contentType: 'application/json',
    body: input.body,
  };
}
