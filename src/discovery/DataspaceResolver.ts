// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import type {
  HostingOperatorMatch,
  PublishedProviderMatch,
  ResolveHostingOperatorsInput,
  ResolvePublishedProvidersInput,
} from './types.js';

/**
 * Runtime-neutral abstract resolver for dataspace discovery.
 *
 * Transport rule:
 * - implementations may use injected `fetch` or any equivalent HTTP client
 * - no Node-specific or browser-specific APIs should leak into this contract
 */
export abstract class DataspaceResolver {
  public abstract resolveHostingOperators(
    input: ResolveHostingOperatorsInput,
  ): Promise<HostingOperatorMatch[]>;

  public abstract resolvePublishedProviders(
    input: ResolvePublishedProvidersInput,
  ): Promise<PublishedProviderMatch[]>;
}
