// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

export type DidServiceLike = {
  id: string;
  type: string;
  serviceEndpoint: string;
  [key: string]: unknown;
};

export type DidDocumentLike = {
  '@context'?: string | string[];
  id: string;
  service?: DidServiceLike[];
  [key: string]: unknown;
};

export type ResolvedServiceEndpointLike = {
  id: string;
  type: string;
  serviceEndpoint: string;
  capability?: string;
  raw: DidServiceLike;
};

export type TransportIdentityState = {
  did?: string;
  didDocument?: DidDocumentLike;
  jwks?: { keys: Array<Record<string, unknown>> };
  signingKid?: string;
  encryptionKid?: string;
};

export type ActorIdentityState = {
  did: string;
  kind?: string;
  sameAs?: string;
  didDocument?: DidDocumentLike;
  jwks?: { keys: Array<Record<string, unknown>> };
  publicKeyJwk?: Record<string, unknown>;
};

export type ProviderIdentityState = {
  did: string;
  didDocument?: DidDocumentLike;
  jwks?: { keys: Array<Record<string, unknown>> };
  smartTokenEndpoint?: string;
};
