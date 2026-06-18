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
  /**
   * DIDComm/runtime communication keys owned by the active device profile,
   * confidential application, or backend transport.
   *
   * These keys protect transport envelopes and runtime sessions. They are not
   * the same thing as the controller business/operation-signing key and must
   * not be projected into controller-binding outputs such as
   * `credentialSubject.hasCredential.material`.
   */
  jwks?: { keys: Array<Record<string, unknown>> };
  signingKid?: string;
  encryptionKid?: string;
};

export type ActorIdentityState = {
  did: string;
  kind?: string;
  sameAs?: string;
  didDocument?: DidDocumentLike;
  /**
   * Optional auxiliary controller key set.
   *
   * This is controller-owned material. It is distinct from transport/profile
   * DIDComm keys, which belong in `TransportIdentityState`.
   */
  jwks?: { keys: Array<Record<string, unknown>> };
  /**
   * Primary public business/operation-signing key of the controller.
   *
   * This is the controller key that downstream onboarding or verification
   * flows may publish, bind, or project into credential continuity material.
   * It must stay distinct from transport/runtime communication keys.
   */
  publicKeyJwk?: Record<string, unknown>;
};

export type ProviderIdentityState = {
  did: string;
  didDocument?: DidDocumentLike;
  jwks?: { keys: Array<Record<string, unknown>> };
  smartTokenEndpoint?: string;
};
