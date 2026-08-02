// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

/**
 * Runtime-neutral SMART token request contract shared by frontend and backend
 * SDK packages.
 *
 * Keep only transport-portable fields here:
 * - `vpToken` for OpenID4VP / dataspace proof presentation
 * - `clientAssertion` for OAuth/OpenID client authentication
 * - actor/subject/scope routing semantics
 *
 * Node-only conveniences such as local key generation or JWT builders belong
 * in `gdc-sdk-node-ts`, not in this package.
 */
export type SmartTokenRequestContract = {
  /**
   * Upstream identity or subject token already available to the caller.
   */
  idToken: string;
  /**
   * Requested SMART/GW scopes.
   */
  scopes: string[];
  /**
   * Actor/profile DID requesting access.
   */
  actorDid?: string;
  /**
   * Subject DID whose data is being requested.
   */
  subjectDid?: string;
  /**
   * OAuth/OpenID `client_id`.
   */
  clientId?: string;
  /**
   * Request/JWT issuer.
   */
  issuer?: string;
  /**
   * Compatibility override for the request/JWT audience.
   *
   * High-level consumers should omit this value. The runtime should resolve the
   * provider SMART endpoint from the subject identity, or fall back to the
   * exact configured SMART token endpoint used for transport. This field
   * remains available for low-level integrations that already own endpoint
   * discovery.
   */
  audience?: string;
  /**
   * Optional OpenID4VP / dataspace proof used as `body.vp_token`.
   *
   * This is the proof carrier for authorization/presentation, distinct from
   * `clientAssertion`, which authenticates the client/device.
   */
  vpToken?: string;
  /**
   * Controls the legacy OpenID-SMART behavior that copied `idToken` into
   * `vp_token` when no presentation was supplied.
   *
   * New cross-provider clients should use `omit`: the requester `id_token`
   * remains an identity proof and `vp_token` is emitted only when an actual
   * relationship/role presentation exists. `id-token` preserves existing
   * deployments while they migrate.
   */
  vpTokenFallback?: 'id-token' | 'omit';
  /**
   * Optional pre-signed OAuth/OpenID `client_assertion`.
   */
  clientAssertion?: string;
  /**
   * Optional `client_assertion_type`, for example `private_key_jwt`.
   */
  clientAssertionType?: string;
  /**
   * Additional transport claims passed through by higher runtimes.
   */
  additionalClaims?: Record<string, unknown>;
};
