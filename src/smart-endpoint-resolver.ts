// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { DiscoveryFacade } from './discovery-facade.js';
import { IdentityStore } from './identity-store.js';
import { resolveProviderIdentityForSubject } from './did-resolution-session.js';

/**
 * Resolves the SMART token endpoint from provider discovery/DID metadata rather
 * than reconstructing URLs by string concatenation.
 *
 * Implemented here:
 * - provider DID derivation from subject DID
 * - provider identity lookup via discovery facade
 * - endpoint extraction from provider DID `service[]`
 *
 * Still pending in node/frontend runtimes:
 * - live remote discovery
 * - stale-cache policy
 */
export async function resolveSmartTokenEndpointForSubject(
  subjectDid: string,
  deps: { discovery: DiscoveryFacade; store?: IdentityStore },
): Promise<string | undefined> {
  const provider = await resolveProviderIdentityForSubject(subjectDid, deps);
  return provider.smartTokenEndpoint;
}
