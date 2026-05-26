// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.
// Always create JSDoc, do not use strings inline in keys nor values, use types instead, and reuse the data test examples.

import {
  ClaimsServiceSchemaorg,
} from 'gdc-common-utils-ts/constants/schemaorg';
import {
  serializeServiceCapabilityTokens,
  ServiceCapability,
  type ServiceCapabilityValue,
  type ServiceCapabilityTokenValue,
} from 'gdc-common-utils-ts/constants/service-capabilities';
import { ActorIdentityState } from './identity-model.js';

export { ServiceCapability };
export type { ServiceCapabilityValue, ServiceCapabilityTokenValue };

/**
 * Validation issue emitted by canonical activation/bootstrap validation.
 */
export type BootstrapValidationIssue = {
  severity: 'error' | 'warning';
  code: string;
  message: string;
};

/**
 * Runtime-neutral canonical `_activate` payload shape.
 *
 * Contract priority:
 * - `vp_token` is canonical proof
 * - `controller.*` is explicit key binding
 * - legacy credential side-fields are compatibility only
 */
export type OrganizationActivationPayload = {
  vp_token?: string;
  controller?: {
    did?: string;
    sameAs?: string;
    publicKeyJwk?: unknown;
    jwks?: { keys: Array<unknown> };
  };
  organization?: {
    did?: string;
    url?: string;
    publicKeyJwk?: unknown;
    jwks?: { keys: Array<unknown> };
  };
  organizationCredential?: unknown;
  representativeCredential?: unknown;
  data?: Array<Record<string, unknown>>;
};

/**
 * Declarative service capabilities persisted through
 * `org.schema.Service.*` activation claims.
 */
export type OrganizationActivationServiceOptions = {
  url?: string;
  capabilities?: ReadonlyArray<ServiceCapabilityValue | ServiceCapabilityTokenValue | string>;
  additionalClaims?: Record<string, unknown>;
};

/**
 * Public activation input used by SDK runtimes when submitting a legal
 * organization activation backed by an ICA proof.
 *
 * Service capabilities are mandatory in the teaching contract even if legacy
 * compatibility paths still allow omitting them at runtime.
 */
export type OrganizationActivationInput = {
  vpToken: string;
  controller?: OrganizationActivationPayload['controller'];
  organization?: OrganizationActivationPayload['organization'];
  data?: Array<Record<string, unknown>>;
  organizationCredential?: unknown;
  representativeCredential?: unknown;
  service?: OrganizationActivationServiceOptions;
  additionalClaims?: Record<string, unknown>;
};

export interface OrganizationActivationDraft {
  addServiceCapability(capability: ServiceCapabilityValue | ServiceCapabilityTokenValue | string): OrganizationActivationDraft;
  addServiceCapabilities(capabilities: ReadonlyArray<ServiceCapabilityValue | ServiceCapabilityTokenValue | string>): OrganizationActivationDraft;
  setServiceUrl(url: string): OrganizationActivationDraft;
  mergeAdditionalClaims(claims: Record<string, unknown>): OrganizationActivationDraft;
  buildServiceClaims(): Record<string, unknown>;
  build(): OrganizationActivationPayload;
}

/**
 * Runtime-neutral bootstrap facade.
 *
 * Implemented here:
 * - payload builders
 * - controller identity binding helper
 * - canonical-vs-legacy validation
 *
 * Still pending in higher runtimes:
 * - remote submission to GW/ICA
 * - persistence side effects
 * - DID publication orchestration
 */
export interface BootstrapFacade {
  /**
   * Builds the canonical organization activation payload.
   */
  buildOrganizationActivationRequest(input: {
    vpToken: string;
    controller?: OrganizationActivationPayload['controller'];
    organization?: OrganizationActivationPayload['organization'];
    data?: Array<Record<string, unknown>>;
    organizationCredential?: unknown;
    representativeCredential?: unknown;
  }): OrganizationActivationPayload;
  /**
   * Builds the canonical `org.schema.Service.*` claims block for activation.
   */
  buildOrganizationActivationServiceClaims(input: OrganizationActivationServiceOptions): Record<string, unknown>;
  /**
   * Creates an activation draft builder that can be enriched incrementally
   * before serializing the final `_activate` payload.
   */
  createOrganizationActivationDraft(input: {
    vpToken: string;
    controller?: OrganizationActivationPayload['controller'];
    organization?: OrganizationActivationPayload['organization'];
    data?: Array<Record<string, unknown>>;
    organizationCredential?: unknown;
    representativeCredential?: unknown;
    service?: OrganizationActivationServiceOptions;
    additionalClaims?: Record<string, unknown>;
  }): OrganizationActivationDraft;
  /**
   * Preferred public alias for the activation builder.
   *
   * Keep `createOrganizationActivationDraft(...)` for compatibility while new
   * documentation and SDK onboarding examples teach this clearer name.
   */
  createOrganizationActivation(input: OrganizationActivationInput): OrganizationActivationDraft;
  /**
   * Builds the canonical individual activation/bootstrap payload.
   */
  buildIndividualActivationRequest(input: {
    vpToken: string;
    controller?: OrganizationActivationPayload['controller'];
    data?: Array<Record<string, unknown>>;
  }): OrganizationActivationPayload;
  /**
   * Normalizes explicit controller binding input into actor identity state.
   */
  bindControllerIdentity(input: {
    did: string;
    sameAs?: string;
    publicKeyJwk?: unknown;
    jwks?: { keys: Array<unknown> };
  }): ActorIdentityState;
  /**
   * Validates canonical activation payload priority and reports warnings for
   * deprecated compatibility fields.
   */
  validateActivationRequest(payload: OrganizationActivationPayload): {
    ok: boolean;
    errors: BootstrapValidationIssue[];
    warnings: BootstrapValidationIssue[];
  };
}

/**
 * Factory for the runtime-neutral bootstrap facade.
 *
 * Naming contract:
 * - SDK builder API: `serviceCapabilities`
 * - persisted claim: `org.schema.Service.serviceType`
 * - frontend UX/runtime facets remain a separate layer and must not be treated
 *   as the persisted activation claim vocabulary
 */
export function createBootstrapFacade(): BootstrapFacade {
  function buildOrganizationActivationPayload(input: {
    vpToken: string;
    controller?: OrganizationActivationPayload['controller'];
    organization?: OrganizationActivationPayload['organization'];
    data?: Array<Record<string, unknown>>;
    organizationCredential?: unknown;
    representativeCredential?: unknown;
  }): OrganizationActivationPayload {
    return {
      vp_token: input.vpToken,
      ...(input.controller ? { controller: input.controller } : {}),
      ...(input.organization ? { organization: input.organization } : {}),
      ...(input.data ? { data: input.data } : {}),
      ...(input.organizationCredential !== undefined ? { organizationCredential: input.organizationCredential } : {}),
      ...(input.representativeCredential !== undefined ? { representativeCredential: input.representativeCredential } : {}),
    };
  }

  function buildOrganizationActivationServiceClaims(input: OrganizationActivationServiceOptions): Record<string, unknown> {
    const claims: Record<string, unknown> = {
      ...(input.additionalClaims || {}),
    };
    if (String(input.url || '').trim()) {
      claims[ClaimsServiceSchemaorg.url] = String(input.url).trim();
    }
    const serializedCapabilities = serializeServiceCapabilityTokens(input.capabilities || []);
    if (serializedCapabilities) {
      claims[ClaimsServiceSchemaorg.serviceType] = serializedCapabilities;
    }
    return claims;
  }

  function validateActivationRequest(payload: OrganizationActivationPayload) {
    const issues: BootstrapValidationIssue[] = [];
    if (!String(payload.vp_token || '').trim()) {
      issues.push({
        severity: 'error',
        code: 'missing-vp-token',
        message: 'Canonical activation proof must be carried in vp_token.',
      });
    }
    if (payload.organizationCredential !== undefined) {
      issues.push({
        severity: 'warning',
        code: 'deprecated-organization-credential',
        message: 'organizationCredential is deprecated compatibility input.',
      });
    }
    if (payload.representativeCredential !== undefined) {
      issues.push({
        severity: 'warning',
        code: 'deprecated-representative-credential',
        message: 'representativeCredential is deprecated compatibility input.',
      });
    }
    const controller = payload.controller;
    if (controller && (controller.did || controller.sameAs) && !(controller.publicKeyJwk || controller.jwks?.keys?.length)) {
      issues.push({
        severity: 'error',
        code: 'incomplete-controller-binding',
        message: 'controller.did/controller.sameAs requires public key material.',
      });
    }
    return {
      ok: !issues.some((issue) => issue.severity === 'error'),
      errors: issues.filter((issue) => issue.severity === 'error'),
      warnings: issues.filter((issue) => issue.severity === 'warning'),
    };
  }

  function createOrganizationActivationDraft(input: OrganizationActivationInput): OrganizationActivationDraft {
    const state: {
      serviceUrl?: string;
      capabilities: string[];
      additionalClaims: Record<string, unknown>;
    } = {
      serviceUrl: input.service?.url,
      capabilities: [...(input.service?.capabilities || [])].map((item) => String(item).trim()).filter(Boolean),
      additionalClaims: {
        ...(input.additionalClaims || {}),
        ...(input.service?.additionalClaims || {}),
      },
    };

    const builder: OrganizationActivationDraft = {
      addServiceCapability(capability) {
        const normalized = String(capability || '').trim();
        if (normalized && !state.capabilities.includes(normalized)) {
          state.capabilities.push(normalized);
        }
        return builder;
      },
      addServiceCapabilities(capabilities) {
        for (const capability of capabilities) {
          builder.addServiceCapability(capability);
        }
        return builder;
      },
      setServiceUrl(url) {
        state.serviceUrl = String(url || '').trim() || undefined;
        return builder;
      },
      mergeAdditionalClaims(claims) {
        state.additionalClaims = {
          ...state.additionalClaims,
          ...(claims || {}),
        };
        return builder;
      },
      buildServiceClaims() {
        return buildOrganizationActivationServiceClaims({
          url: state.serviceUrl,
          capabilities: state.capabilities,
          additionalClaims: state.additionalClaims,
        });
      },
      build() {
        const serviceClaims = builder.buildServiceClaims();
        const data = Array.isArray(input.data) && input.data.length
          ? input.data.map((entry) => {
            const currentMetaClaims = (entry as any)?.meta?.claims || {};
            const currentResourceClaims = (entry as any)?.resource?.meta?.claims || {};
            return {
              ...entry,
              meta: {
                ...((entry as any)?.meta || {}),
                claims: {
                  ...currentMetaClaims,
                  ...serviceClaims,
                },
              },
              resource: {
                ...((entry as any)?.resource || {}),
                meta: {
                  ...((entry as any)?.resource?.meta || {}),
                  claims: {
                    ...currentResourceClaims,
                    ...serviceClaims,
                  },
                },
              },
            };
          })
          : undefined;
        return buildOrganizationActivationPayload({
          vpToken: input.vpToken,
          controller: input.controller,
          organization: input.organization,
          data,
          organizationCredential: input.organizationCredential,
          representativeCredential: input.representativeCredential,
        });
      },
    };

    return builder;
  }

  return {
    buildOrganizationActivationServiceClaims,
    createOrganizationActivationDraft,
    createOrganizationActivation(input) {
      return createOrganizationActivationDraft(input);
    },
    buildOrganizationActivationRequest(input) {
      return buildOrganizationActivationPayload(input);
    },
    buildIndividualActivationRequest(input) {
      return {
        vp_token: input.vpToken,
        ...(input.controller ? { controller: input.controller } : {}),
        ...(input.data ? { data: input.data } : {}),
      };
    },
    bindControllerIdentity(input) {
      const normalizedPublicKeyJwk =
        input.publicKeyJwk && typeof input.publicKeyJwk === 'object'
          ? input.publicKeyJwk as Record<string, unknown>
          : undefined;
      const normalizedJwks =
        input.jwks?.keys?.length
          ? { keys: input.jwks.keys.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') }
          : undefined;
      return {
        did: input.did,
        kind: 'organization_controller',
        ...(input.sameAs ? { sameAs: input.sameAs } : {}),
        ...(normalizedPublicKeyJwk ? { publicKeyJwk: normalizedPublicKeyJwk } : {}),
        ...(normalizedJwks ? { jwks: normalizedJwks } : {}),
      };
    },
    validateActivationRequest,
  };
}
