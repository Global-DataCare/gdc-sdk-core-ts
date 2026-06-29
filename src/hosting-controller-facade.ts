// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { LifecycleRequestType } from 'gdc-common-utils-ts/constants/lifecycle';
import { OrganizationLifecycleEditor } from 'gdc-common-utils-ts/utils/organization-lifecycle';
import type { PollOptions, SubmitAndPollResult, SubmitPayload } from './polling-model.js';
import { resolvePollOptionsFromSeconds } from './polling-model.js';

/**
 * Current host-registry route context for existing host endpoints.
 *
 * This is a routing object for host registry calls. It is not the same thing as
 * a host discovery descriptor.
 *
 * Step by step:
 * - host routes always start with `/host/cds-{jurisdiction}/v1/{host-network}`
 * - tenant routes start with `/{tenantId}/cds-{jurisdiction}/v1/{tenant-sector}`
 * - some older callers reused the name `sector` for the host path segment
 * - that naming is ambiguous because, for host routes, the segment represents
 *   the host network/runtime scope, not the tenant business sector
 *
 * Use `hostNetworkOrTenantSector` as the didactic compatibility input when the
 * caller only knows the raw path segment and wants the SDK to route it to the
 * correct host slot. Prefer `hostNetwork` in new code.
 */
export type HostRouteContext = {
  jurisdiction: string;
  /**
   * Didactic compatibility alias for the raw `{segment}` used after
   * `/host/cds-{jurisdiction}/v1/`.
   *
   * For host routes this means `hostNetwork`.
   * For tenant routes the analogous segment is usually called `sector`.
   */
  hostNetworkOrTenantSector?: string;
  hostNetwork?: string;
  /** @deprecated Use `hostNetwork`. */
  sector?: string;
  controllerDid?: string;
  hostDid?: string;
};

/**
 * Input for legal-organization order confirmation in the host registry.
 */
export type LegalOrganizationOrderInput = {
  offerId: string;
  jurisdiction?: string;
  /**
   * Didactic compatibility alias for callers that only know the raw path
   * segment shared by:
   * - host routes: `hostNetwork`
   * - tenant routes: `sector`
   */
  hostNetworkOrTenantSector?: string;
  hostNetwork?: string;
  /** @deprecated Use `hostNetwork`. */
  sector?: string;
  dataType?: string;
  additionalClaims?: Record<string, unknown>;
  timeoutSeconds?: number;
  intervalSeconds?: number;
};

/**
 * Input for host-registry tenant disable/purge operations.
 *
 * The host registry identifies the tenant to clean through the canonical
 * organization identifier claims already used by GW CORE today.
 */
export type HostedTenantLifecycleInput = {
  organizationClaims?: Record<string, unknown>;
  organizationEditor?: OrganizationLifecycleEditor;
  dataType?: string;
  additionalClaims?: Record<string, unknown>;
  timeoutSeconds?: number;
  intervalSeconds?: number;
};

/**
 * Input for host lifecycle operations over the canonical host registration.
 *
 * GW CORE currently models the host record with the same organization-shaped
 * lifecycle payload used by hosted tenants. The distinguishing claim is the
 * host `identifier.value`, typically coming from `HOST_ID_VALUE`.
 */
export type HostLifecycleInput = HostedTenantLifecycleInput;

/**
 * Neutral facade contract that every runtime should expose for host-registry
 * lifecycle operations.
 *
 * Node, browser, or mobile runtimes may differ in HTTP and crypto adapters,
 * but the orchestration surface should remain stable.
 */
export interface HostingControllerFacade {
  /**
   * Confirms the commercial Offer returned by a legal organization onboarding
   * flow that actually minted one.
   *
   * Use this only after:
   * - host `_transaction`, or
   * - legacy legal `_activate`
   *
   * Do not call this after `_issue`, because `_issue` is an existing-tenant
   * controller reissue flow and is not expected to mint a new Offer.
   *
   * Shared reference:
   * - `gdc-common-utils-ts/utils/gw-core-commercial-contract`
   * - `GwCoreCommercialFlow.LegalOrganizationTransaction`
   * - `GwCoreCommercialFlow.LegalOrganizationActivateLegacy`
   * - `GwCoreCommercialFlow.LegalOrganizationIssueReissue`
   */
  confirmLegalOrganizationOrder(
    hostCtx: HostRouteContext,
    input: LegalOrganizationOrderInput,
    pollOptions?: PollOptions,
  ): Promise<SubmitAndPollResult>;
  disableHost(
    hostCtx: HostRouteContext,
    input: HostLifecycleInput,
    pollOptions?: PollOptions,
  ): Promise<SubmitAndPollResult>;
  purgeHost(
    hostCtx: HostRouteContext,
    input: HostLifecycleInput,
    pollOptions?: PollOptions,
  ): Promise<SubmitAndPollResult>;
}

type ConfirmLegalOrganizationOrderDeps = {
  input: LegalOrganizationOrderInput;
  hostCtx: HostRouteContext;
  defaultTimeoutMs?: number;
  defaultIntervalMs?: number;
  hostRegistryOrderBatchPath: (ctx: HostRouteContext) => string;
  hostRegistryOrderPollPath: (ctx: HostRouteContext) => string;
  submitAndPoll: (
    submitPath: string,
    pollPath: string,
    payload: SubmitPayload,
    options?: PollOptions,
  ) => Promise<SubmitAndPollResult>;
};

/**
 * Builds the canonical legal-organization order-confirmation payload for the
 * host registry and submits it through the provided runtime transport hooks.
 *
 * Programming rule:
 * - `offerId` here must come from a prior response that exposed
 *   `meta.claims['org.schema.Offer.identifier']`
 * - if the previous flow did not mint that claim, this helper must not be used
 */
export async function confirmLegalOrganizationOrderWithDeps(
  deps: ConfirmLegalOrganizationOrderDeps,
): Promise<SubmitAndPollResult> {
  const offerId = String(deps.input.offerId || '').trim();
  if (!offerId) {
    throw new Error('confirmLegalOrganizationOrder requires offerId.');
  }

  const claims: Record<string, unknown> = {
    '@context': 'org.schema',
    'Order.acceptedOffer.identifier': offerId,
    ...(deps.input.additionalClaims || {}),
  };

  const payload: SubmitPayload = {
    jti: `jti-${createRuntimeUuid()}`,
    iss: String(deps.hostCtx.controllerDid || '').trim() || undefined,
    aud: String(deps.hostCtx.hostDid || '').trim() || undefined,
    type: 'application/didcomm-plain+json',
    thid: `order-${createRuntimeUuid()}`,
    body: {
      data: [{
        type: deps.input.dataType || 'Organization-order-request-v1.0',
        meta: { claims },
        resource: { meta: { claims } },
      }],
    },
  };

  const pollOptions = resolvePollOptionsFromSeconds(
    deps.input.timeoutSeconds,
    deps.input.intervalSeconds,
    {
      timeoutMs: deps.defaultTimeoutMs,
      intervalMs: deps.defaultIntervalMs,
    },
  );

  return deps.submitAndPoll(
    deps.hostRegistryOrderBatchPath(deps.hostCtx),
    deps.hostRegistryOrderPollPath(deps.hostCtx),
    payload,
    pollOptions,
  );
}

function createRuntimeUuid(): string {
  const fromCrypto = globalThis.crypto?.randomUUID?.();
  if (fromCrypto) {
    return fromCrypto;
  }
  return `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type SubmitHostedTenantLifecycleDeps = {
  hostCtx: HostRouteContext;
  input: HostedTenantLifecycleInput;
  defaultTimeoutMs?: number;
  defaultIntervalMs?: number;
  requestType: string;
  submitPath: (ctx: HostRouteContext) => string;
  pollPath: (ctx: HostRouteContext) => string;
  thidPrefix: string;
  submitAndPoll: (
    submitPath: string,
    pollPath: string,
    payload: SubmitPayload,
    options?: PollOptions,
  ) => Promise<SubmitAndPollResult>;
};

/**
 * Shared host-registry lifecycle submit/poll wrapper reused by runtime
 * adapters for host and hosted-tenant operations.
 */
export async function submitHostedTenantLifecycleWithDeps(
  deps: SubmitHostedTenantLifecycleDeps,
): Promise<SubmitAndPollResult> {
  const editor = deps.input.organizationEditor
    ? new OrganizationLifecycleEditor(deps.input.organizationEditor.getState())
    : new OrganizationLifecycleEditor().setClaims(deps.input.organizationClaims || {});
  if (deps.input.additionalClaims) {
    editor.mergeClaims(deps.input.additionalClaims);
  }
  editor.setRequestType(deps.input.dataType || deps.requestType);
  const payload: SubmitPayload = {
    jti: `jti-${createRuntimeUuid()}`,
    iss: String(deps.hostCtx.controllerDid || '').trim() || undefined,
    aud: String(deps.hostCtx.hostDid || '').trim() || undefined,
    type: 'application/didcomm-plain+json',
    thid: `${deps.thidPrefix}-${createRuntimeUuid()}`,
    body: {
      data: [editor.buildCurrentGwDataEntry()],
    },
  };
  const pollOptions = resolvePollOptionsFromSeconds(
    deps.input.timeoutSeconds,
    deps.input.intervalSeconds,
    {
      timeoutMs: deps.defaultTimeoutMs,
      intervalMs: deps.defaultIntervalMs,
    },
  );
  return deps.submitAndPoll(
    deps.submitPath(deps.hostCtx),
    deps.pollPath(deps.hostCtx),
    payload,
    pollOptions,
  );
}

export const HostedTenantLifecycleRequestType = Object.freeze({
  Disable: LifecycleRequestType.TenantDisable,
  Purge: LifecycleRequestType.TenantPurge,
} as const);

/**
 * Host lifecycle requests reuse the same GW CORE request envelope as tenant
 * lifecycle operations because the host registry persists both records as
 * `Organization` resources.
 */
export const HostLifecycleRequestType = HostedTenantLifecycleRequestType;
