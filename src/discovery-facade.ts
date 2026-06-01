// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { DidDocumentLike, ProviderIdentityState } from './identity-model.js';

/**
 * Runtime-neutral normalized discovery result shape shared by ICA/operator/
 * provider discovery methods.
 */
export type DiscoveryResolutionResult = {
  did: string;
  didDocument?: DidDocumentLike;
  jwksUri?: string;
  jwks?: { keys: Array<Record<string, unknown>> };
  serviceEndpoints?: Array<{ id: string; type: string; serviceEndpoint: string; capability?: string }>;
  metadata?: Record<string, unknown>;
};

/**
 * Runtime-neutral discovery contract.
 *
 * Implemented here:
 * - contract only
 * - static in-memory reference implementation
 *
 * Still pending in node/frontend runtimes:
 * - real did:web HTTP resolution
 * - DSP `/.well-known/dspace-version` fetch
 * - DSP catalog artifact consumption
 * - cache freshness/retry policy
 */
export interface DiscoveryFacade {
  /**
   * Resolves a DID document for a given DID.
   */
  resolveDidDocument(did: string): Promise<DidDocumentLike | undefined>;
  /**
   * Resolves a public JWKS from either a DID or a concrete `jwks_uri`.
   */
  resolveJwks(input: { did?: string; jwksUri?: string }): Promise<{ keys: Array<Record<string, unknown>> } | undefined>;
  /**
   * Discovers ICA metadata entries.
   */
  discoverFromIca(input: { did?: string; url?: string }): Promise<DiscoveryResolutionResult[]>;
  /**
   * Discovers node operator metadata entries.
   */
  discoverNodeOperators(input: { did?: string; url?: string }): Promise<DiscoveryResolutionResult[]>;
  /**
   * Discovers provider/service-provider entries relevant to the current subject,
   * tenant, or route.
   */
  discoverServiceProviders(input: { did?: string; url?: string; subjectDid?: string }): Promise<ProviderIdentityState[]>;
}

/**
 * Test/demo helper that returns already-seeded discovery results without
 * performing any network I/O.
 */
export function createStaticDiscoveryFacade(seed: {
  didDocuments?: Record<string, DidDocumentLike>;
  jwks?: Record<string, { keys: Array<Record<string, unknown>> }>;
  icas?: DiscoveryResolutionResult[];
  operators?: DiscoveryResolutionResult[];
  providers?: ProviderIdentityState[];
}): DiscoveryFacade {
  return {
    async resolveDidDocument(did: string) {
      return seed.didDocuments?.[did];
    },
    async resolveJwks(input: { did?: string; jwksUri?: string }) {
      return seed.jwks?.[String(input.did || input.jwksUri || '')];
    },
    async discoverFromIca() {
      return seed.icas || [];
    },
    async discoverNodeOperators() {
      return seed.operators || [];
    },
    async discoverServiceProviders() {
      return seed.providers || [];
    },
  };
}
