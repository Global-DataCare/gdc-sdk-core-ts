// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.
// File: gdc-sdk-core-ts/src/wallet-contract.ts

import type { JWK, JwkSet } from 'gdc-common-utils-ts/models/jwk';

/**
 * Supported actor categories for a wallet-owning profile.
 */
export type WalletActorType =
  | 'individual'
  | 'professional'
  | 'organization'
  | 'controller'
  | 'device'
  | 'service';

/**
 * Supported runtime categories for a technical communication channel.
 */
export type WalletRuntimeType =
  | 'expo-app'
  | 'web-app'
  | 'web-bff'
  | 'backend-service';

/**
 * Identifies the local profile that owns user/domain signing keys.
 *
 * This is the local cryptographic owner inside the current runtime. It is not
 * the GW/Core target tenant route and it is not automatically the employer or
 * hosting organization identifier.
 */
export type WalletProfileRef = {
  /**
   * Stable local profile identifier that owns the keyring.
   *
   * Examples:
   * - `individual-profile:primary`
   * - `professional-profile:dr-smith`
   * - `controller-profile:main`
   */
  profileId: string;
  /**
   * Optional descriptive actor category associated with this profile.
   */
  actorType?: WalletActorType;
  /**
   * Optional domain actor identifier such as a DID or employee identifier.
   *
   * This identifies the domain actor, not the local wallet container.
   */
  actorId?: string;
};

/**
 * Identifies the technical runtime that owns channel/service keys.
 *
 * This is the technical communication owner used for transport wrapping or
 * service-side signing. It is separate from the human/domain actor profile.
 */
export type WalletRuntimeRef = {
  /**
   * Stable technical runtime identifier that owns the channel keyring.
   *
   * Examples:
   * - `device-runtime:iphone-main`
   * - `portal-runtime:globaldatacare-bff`
   */
  runtimeId: string;
  /**
   * Optional descriptive runtime category.
   */
  runtimeType?: WalletRuntimeType;
};

/**
 * Target GW/Core route context for outbound operations.
 *
 * This is destination routing metadata, not wallet identity. A wallet may
 * exist and sign locally without any route context.
 */
export type WalletRouteContext = {
  /**
   * Canonical target tenant identifier used in GW/Core route templates.
   */
  tenantId?: string;
  /**
   * Target legal jurisdiction used in GW/Core route templates.
   */
  jurisdiction?: string;
  /**
   * Target functional sector path segment used in GW/Core route templates.
   */
  sector?: string;
};

/**
 * Optional execution-time context for wallet operations.
 *
 * Keep local wallet ownership (`profile` / `runtime`) separate from outbound
 * GW/Core destination routing (`route`).
 */
export type WalletExecutionContext = {
  /**
   * Local profile that owns actor/domain keys.
   */
  profile?: WalletProfileRef;
  /**
   * Technical runtime that owns channel/service keys.
   */
  runtime?: WalletRuntimeRef;
  /**
   * Optional GW/Core destination route.
   */
  route?: WalletRouteContext;
  /**
   * Optional logical sub-wallet inside the same owner.
   *
   * Most app and BFF flows should leave this undefined.
   */
  walletId?: string;
};

/**
 * Distinguishes whether a key belongs to the actor/domain profile or to the
 * technical runtime/channel.
 */
export type WalletKeyOwnerScope = 'profile' | 'runtime';

/**
 * Canonical key purposes supported by the shared wallet contract.
 */
export type WalletKeyPurpose =
  | 'actor-signing'
  | 'openid-id-token-signing'
  | 'vp-token-signing'
  | 'vc-signing'
  | 'comm-signing'
  | 'comm-encryption'
  | 'document-at-rest';

/**
 * JOSE-style public key use.
 */
export type WalletKeyUse = 'sig' | 'enc';

/**
 * Supported signature and encryption algorithms exposed through the shared
 * wallet contract.
 */
export type WalletAlgorithm =
  | 'ES384'
  | 'ES256K'
  | 'RS256'
  | 'ML-DSA-44'
  | 'ML-DSA-65'
  | 'ML-DSA-87'
  | 'ML-KEM-768'
  | 'ML-KEM-1024'
  | 'RSA-OAEP-256';

/**
 * Public description of one managed key in the wallet keyring.
 */
export type WalletKeyDescriptor = {
  /**
   * Stable key identifier, typically a JWK thumbprint or equivalent.
   */
  kid: string;
  /**
   * Whether the key belongs to the actor/domain profile or to the technical runtime.
   */
  ownerScope: WalletKeyOwnerScope;
  /**
   * Canonical purpose used for key selection and policy.
   */
  purpose: WalletKeyPurpose;
  /**
   * JOSE-style key use.
   */
  use: WalletKeyUse;
  /**
   * Canonical algorithm label for this key.
   */
  alg: WalletAlgorithm;
  /**
   * Public JWK material exposed to callers.
   */
  publicJwk: JWK;
  /**
   * Whether this key is the current default for its purpose.
   */
  defaultForPurpose?: boolean;
  /**
   * Whether the key exists for backward compatibility with legacy flows.
   */
  legacy?: boolean;
};

/**
 * Selection criteria used to resolve one managed key when several keys exist.
 */
export type WalletKeySelection = {
  /**
   * Explicit key id to use. When provided it takes precedence over purpose-based selection.
   */
  keyId?: string;
  /**
   * Requested owner scope.
   */
  ownerScope?: WalletKeyOwnerScope;
  /**
   * Requested key purpose.
   */
  purpose?: WalletKeyPurpose;
  /**
   * Requested algorithm.
   */
  alg?: WalletAlgorithm;
};

/**
 * Provisioning mode for newly created or deterministically derived keys.
 */
export type WalletProvisionMode = 'deterministic' | 'random';

/**
 * Request used by richer provisioning flows that need to create keys for a
 * specific owner scope and list of purposes.
 */
export type WalletProvisionRequest = {
  /**
   * Whether the provisioned keys belong to the local profile or to the technical runtime.
   */
  ownerScope: WalletKeyOwnerScope;
  /**
   * Canonical purposes to create or derive.
   */
  purposes: WalletKeyPurpose[];
  /**
   * Optional explicit seed material for deterministic provisioning.
   */
  seedMaterial?: string | Uint8Array;
  /**
   * Deterministic or random provisioning mode.
   */
  mode?: WalletProvisionMode;
};

/**
 * Options for high-level pack/envelope creation.
 */
export type WalletPackOptions = {
  /**
   * Execution context that identifies the local profile/runtime and optional route.
   */
  context: WalletExecutionContext;
  /**
   * Signing key selection for the outer envelope when the runtime signs the transport layer.
   */
  signingKey?: WalletKeySelection;
  /**
   * Encryption key selection for the outer envelope when the runtime encrypts for the recipient.
   */
  encryptionKey?: WalletKeySelection;
};

/**
 * Options for high-level unpack/decode flows.
 */
export type WalletUnpackOptions = {
  /**
   * Execution context that identifies the local profile/runtime and optional route.
   */
  context: WalletExecutionContext;
  /**
   * Optional explicit decryption key selection.
   */
  decryptionKey?: WalletKeySelection;
  /**
   * Optional explicit verification key selection.
   */
  verificationKey?: WalletKeySelection;
};

/**
 * Input used to build one compact JWS with a managed signing key.
 */
export type WalletCompactJwsRequest = {
  /**
   * Protected JOSE header to encode and sign.
   */
  header: Record<string, unknown>;
  /**
   * JSON claims to encode as the compact JWS payload.
   */
  claims: Record<string, unknown>;
  /**
   * Explicit signing-key selection.
   */
  key: WalletKeySelection;
};

/**
 * Input used to build one detached JWS with a managed signing key.
 */
export type WalletDetachedJwsRequest = {
  /**
   * Protected JOSE header to encode and sign.
   */
  header: Record<string, unknown>;
  /**
   * Detached payload bytes or UTF-8 string.
   */
  payload: Uint8Array | string;
  /**
   * Explicit signing-key selection.
   */
  key: WalletKeySelection;
};

/**
 * Input used to build one compact JWE with a managed local encryption key.
 */
export type WalletCompactJweRequest = {
  /**
   * Plaintext to encrypt. This may be a raw string, bytes, or one nested compact JWS.
   */
  plaintext: Uint8Array | string;
  /**
   * Recipient public JWK that will be able to decrypt the compact JWE.
   */
  recipientJwk: JWK;
  /**
   * Optional JOSE content type, for example `JWS` when wrapping a compact JWS.
   */
  contentType?: string;
  /**
   * Explicit local encryption-key selection.
   */
  key: WalletKeySelection;
};

/**
 * @interface IWallet
 * Defines the shared wallet contract used by app, browser, and backend runtimes.
 *
 * Compatibility contract:
 * - existing app-facing methods remain valid and preserve their original shapes
 * - richer overloads and optional helpers add backend/BFF capabilities without
 *   forcing existing implementations to adopt them immediately
 *
 * Modeling rules:
 * - `profile` identifies the local actor/domain key owner
 * - `runtime` identifies the local technical channel/service key owner
 * - `route` identifies the outbound GW/Core destination and must not be used as
 *   a substitute for local wallet identity
 * @sdk
 */
export interface IWallet {
  /**
   * Provisions or derives a key set for one logical entity/profile id.
   *
   * This legacy shape remains the primary entry point for existing app runtimes.
   */
  provisionKeys(entityId: string): Promise<JwkSet>;
  /**
   * Provisions or derives keys using the richer execution-context model.
   *
   * This optional method adds explicit support for actor/profile keys versus
   * runtime/channel keys without changing the legacy `provisionKeys(entityId)`
   * contract already used by existing apps.
   */
  provisionManagedKeys?(context: WalletExecutionContext, request: WalletProvisionRequest): Promise<JwkSet>;

  /**
   * Creates a cryptographic digest (hash) of a string.
   * @param data The string to hash.
   * @param algorithm The digest algorithm to use.
   * @returns A Promise that resolves to the hex-encoded hash string.
   */
  digest(data: string, algorithm: any): Promise<string>;

  /**
   * Encrypts a document for secure, local storage (at-rest).
   * @param doc The document to protect, which must have a `.content` property.
   * @param entityId The ID of the entity whose keys should be used for encryption.
   * @returns A Promise that resolves to the protected document, where `.content` is replaced by `.jwe`.
   */
  protectConfidentialData(doc: any, entityId: string): Promise<any>;
  /**
   * Encrypts a document for secure local or server-side storage using the
   * richer execution-context model.
   */
  protectManagedConfidentialData?(doc: any, context: WalletExecutionContext, options?: { key?: WalletKeySelection }): Promise<any>;

  /**
   * Decrypts a document from secure storage.
   * @param doc The protected document containing the `.jwe` property.
   * @param entityId The ID of the entity whose keys should be used for decryption.
   * @returns A Promise that resolves to the document with the decrypted `.content`.
   */
  unprotectConfidentialData(doc: any, entityId: string): Promise<any>;
  /**
   * Decrypts a document from secure storage using the richer execution-context model.
   */
  unprotectManagedConfidentialData?(doc: any, context: WalletExecutionContext, options?: { key?: WalletKeySelection }): Promise<any>;

  /**
   * Returns public keys currently available in the wallet, optionally filtered
   * by owner scope, purpose, or algorithm.
   */
  getPublicJwks?(context?: WalletExecutionContext, filter?: WalletKeySelection): Promise<WalletKeyDescriptor[]>;

  /**
   * Signs an arbitrary payload using one selected managed key.
   *
   * The input may be raw bytes or a UTF-8 string such as the `header.payload`
   * signing input of a compact JWT/JWS.
   */
  sign?(payload: Uint8Array | string, context: WalletExecutionContext, options: WalletKeySelection): Promise<string>;

  /**
   * Verifies one arbitrary signature against the provided public JWK.
   */
  verify?(payload: Uint8Array | string, signature: string, jwk: JWK, options?: { alg?: WalletAlgorithm }): Promise<boolean>;

  /**
   * Encrypts arbitrary plaintext for one recipient.
   */
  encrypt?(
    plaintext: Uint8Array | string,
    recipientJwk: JWK,
    options?: { context?: WalletExecutionContext; key?: WalletKeySelection; contentType?: string },
  ): Promise<string>;

  /**
   * Decrypts one ciphertext using a selected local key.
   */
  decrypt?(ciphertext: string, context: WalletExecutionContext, options?: { key?: WalletKeySelection }): Promise<Uint8Array>;

  /**
   * Builds one compact JWS from JSON claims using a selected managed signing key.
   */
  signCompactJws?(context: WalletExecutionContext, request: WalletCompactJwsRequest): Promise<string>;

  /**
   * Builds one detached compact JWS using a selected managed signing key.
   */
  signDetachedJws?(context: WalletExecutionContext, request: WalletDetachedJwsRequest): Promise<string>;

  /**
   * Builds one compact JWE using a selected local encryption key and one recipient public key.
   */
  buildCompactJwe?(context: WalletExecutionContext, request: WalletCompactJweRequest): Promise<string>;

  /**
   * Decrypts one compact JWE using a selected local encryption key.
   */
  decryptCompactJwe?(jwe: string, context: WalletExecutionContext, options: { key: WalletKeySelection }): Promise<Uint8Array>;

  /**
   * (Optional) Packs a DIDComm message into a secure format (JWE/JARM) for a recipient.
   * This is required for FAPI-compliant flows.
   * @param content The DIDComm message content to pack.
   * @param recipientDid The DID of the recipient.
   * @returns A Promise that resolves to the packed, secure message string.
   */
  packForRecipient?(content: any, recipientDid: string): Promise<string>;
  /**
   * Packs one payload using explicit execution context and optional key-selection hints.
   *
   * The recipient may be identified either by DID or directly by a public JWK.
   * This richer variant is kept separate to preserve the legacy app-facing
   * `packForRecipient(content, recipientDid)` shape.
   */
  packForRecipientWithContext?(content: any, recipientDidOrJwk: string | JWK, options: WalletPackOptions): Promise<string>;

  /**
   * (Optional) Unpacks a secure message (JWE/JARM) received from a server.
   * This is the counterpart to `packForRecipient`.
   * @param packedMessage The secure message string (e.g., a compact JWE).
   * @returns A Promise that resolves to an object containing the plaintext `content` and any cryptographic `meta` data.
   */
  unpack?(packedMessage: string): Promise<{ content: any, meta: any }>;
  /**
   * Unpacks one secure message using explicit execution context and optional
   * key-selection hints.
   */
  unpackWithContext?(packedMessage: string, options: WalletUnpackOptions): Promise<{ content: any, meta: any }>;
}
