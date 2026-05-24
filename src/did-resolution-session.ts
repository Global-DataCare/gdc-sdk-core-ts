// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { DiscoveryFacade } from './discovery-facade.js';
import { DidDocumentLike, ProviderIdentityState } from './identity-model.js';
import { IdentityStore } from './identity-store.js';

/**
 * Derives the provider/organization DID from a subject/member/employee DID
 * without inventing network URLs.
 */
export function getProviderDidFromSubjectDid(subjectDid: string): string {
  const markers = [':family:', ':employee:', ':member:'];
  for (const marker of markers) {
    const index = subjectDid.indexOf(marker);
    if (index > -1) {
      return subjectDid.slice(0, index);
    }
  }
  return subjectDid;
}

/**
 * Minimal runtime-neutral normalization of a DID document `service[]` array.
 *
 * Implemented today:
 * - preserves service ids/types/endpoints
 * - recognizes canonical SMART token endpoint id
 *
 * Still pending:
 * - richer capability inference once dependency direction between core and
 *   common-utils is finalized.
 */
export function resolveDidDocumentServices(didDocument?: DidDocumentLike): Array<{ id: string; type: string; serviceEndpoint: string; capability?: string }> {
  return (didDocument?.service || []).map((service) => ({
    id: service.id,
    type: service.type,
    serviceEndpoint: service.serviceEndpoint,
    capability: service.id === '#identity:openid:smart:token' ? 'smart-token' : undefined,
  }));
}

/**
 * Resolves the provider identity for a subject DID and optionally caches the
 * resulting DID document and resolved SMART endpoint in the supplied store.
 */
export async function resolveProviderIdentityForSubject(
  subjectDid: string,
  deps: { discovery: DiscoveryFacade; store?: IdentityStore },
): Promise<ProviderIdentityState> {
  const providerDid = getProviderDidFromSubjectDid(subjectDid);
  const cached = await deps.store?.getProviderIdentity();
  if (cached?.did === providerDid) {
    return cached;
  }
  const didDocument = await deps.discovery.resolveDidDocument(providerDid);
  const identity: ProviderIdentityState = {
    did: providerDid,
    ...(didDocument ? { didDocument } : {}),
    smartTokenEndpoint: resolveDidDocumentServices(didDocument).find((service) => service.id === '#identity:openid:smart:token')?.serviceEndpoint,
  };
  await deps.store?.setProviderIdentity(identity);
  if (didDocument) {
    await deps.store?.setDidDocument(providerDid, didDocument);
  }
  return identity;
}
