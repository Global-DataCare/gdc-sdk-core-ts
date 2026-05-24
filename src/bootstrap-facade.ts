// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { ActorIdentityState } from './identity-model.js';

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
    publicKeyJwk?: Record<string, unknown>;
    jwks?: { keys: Array<Record<string, unknown>> };
  };
  organization?: {
    did?: string;
    url?: string;
    publicKeyJwk?: Record<string, unknown>;
    jwks?: { keys: Array<Record<string, unknown>> };
  };
  organizationCredential?: unknown;
  representativeCredential?: unknown;
  data?: Array<Record<string, unknown>>;
};

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
    publicKeyJwk?: Record<string, unknown>;
    jwks?: { keys: Array<Record<string, unknown>> };
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
 */
export function createBootstrapFacade(): BootstrapFacade {
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

  return {
    buildOrganizationActivationRequest(input) {
      return {
        vp_token: input.vpToken,
        ...(input.controller ? { controller: input.controller } : {}),
        ...(input.organization ? { organization: input.organization } : {}),
        ...(input.data ? { data: input.data } : {}),
        ...(input.organizationCredential !== undefined ? { organizationCredential: input.organizationCredential } : {}),
        ...(input.representativeCredential !== undefined ? { representativeCredential: input.representativeCredential } : {}),
      };
    },
    buildIndividualActivationRequest(input) {
      return {
        vp_token: input.vpToken,
        ...(input.controller ? { controller: input.controller } : {}),
        ...(input.data ? { data: input.data } : {}),
      };
    },
    bindControllerIdentity(input) {
      return {
        did: input.did,
        kind: 'organization_controller',
        ...(input.sameAs ? { sameAs: input.sameAs } : {}),
        ...(input.publicKeyJwk ? { publicKeyJwk: input.publicKeyJwk } : {}),
        ...(input.jwks ? { jwks: input.jwks } : {}),
      };
    },
    validateActivationRequest,
  };
}
