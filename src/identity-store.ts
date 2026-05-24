// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { ActorIdentityState, DidDocumentLike, ProviderIdentityState, TransportIdentityState } from './identity-model.js';

/**
 * Minimal runtime-neutral DID document cache contract.
 *
 * Implemented in this package:
 * - in-memory reference store
 *
 * Still pending in higher runtimes:
 * - secure local persistence
 * - remote/shared persistence
 * - cache invalidation policy
 */
export interface DidDocumentStore {
  /**
   * Reads a previously cached DID document by DID.
   */
  getDidDocument(did: string): Promise<DidDocumentLike | undefined>;
  /**
   * Persists a DID document by DID.
   */
  setDidDocument(did: string, didDocument: DidDocumentLike): Promise<void>;
}

/**
 * Composite identity/session store separating:
 * - transport identity
 * - human actor identity
 * - provider identity
 * - raw DID documents
 */
export interface IdentityStore extends DidDocumentStore {
  /**
   * Returns the technical device/app/portal identity for the current session.
   */
  getTransportIdentity(): Promise<TransportIdentityState | undefined>;
  /**
   * Persists the technical device/app/portal identity for the current session.
   */
  setTransportIdentity(identity: TransportIdentityState): Promise<void>;
  /**
   * Returns the active human/controller/professional/member identity.
   */
  getActorIdentity(): Promise<ActorIdentityState | undefined>;
  /**
   * Persists the active human/controller/professional/member identity.
   */
  setActorIdentity(identity: ActorIdentityState): Promise<void>;
  /**
   * Returns the provider/organization identity currently associated with the
   * target subject or route context.
   */
  getProviderIdentity(): Promise<ProviderIdentityState | undefined>;
  /**
   * Persists the provider/organization identity currently associated with the
   * target subject or route context.
   */
  setProviderIdentity(identity: ProviderIdentityState): Promise<void>;
}

/**
 * In-memory reference implementation used by tests, local demos, and runtimes
 * that do not yet want durable persistence.
 */
export class MemoryIdentityStore implements IdentityStore {
  private readonly didDocuments = new Map<string, DidDocumentLike>();
  private transportIdentity?: TransportIdentityState;
  private actorIdentity?: ActorIdentityState;
  private providerIdentity?: ProviderIdentityState;

  /** @inheritdoc */
  async getDidDocument(did: string): Promise<DidDocumentLike | undefined> {
    return this.didDocuments.get(String(did || '').trim());
  }

  /** @inheritdoc */
  async setDidDocument(did: string, didDocument: DidDocumentLike): Promise<void> {
    this.didDocuments.set(String(did || '').trim(), didDocument);
  }

  /** @inheritdoc */
  async getTransportIdentity(): Promise<TransportIdentityState | undefined> {
    return this.transportIdentity;
  }

  /** @inheritdoc */
  async setTransportIdentity(identity: TransportIdentityState): Promise<void> {
    this.transportIdentity = identity;
    if (identity.didDocument?.id) {
      await this.setDidDocument(identity.didDocument.id, identity.didDocument);
    }
  }

  /** @inheritdoc */
  async getActorIdentity(): Promise<ActorIdentityState | undefined> {
    return this.actorIdentity;
  }

  /** @inheritdoc */
  async setActorIdentity(identity: ActorIdentityState): Promise<void> {
    this.actorIdentity = identity;
    if (identity.didDocument?.id) {
      await this.setDidDocument(identity.didDocument.id, identity.didDocument);
    }
  }

  /** @inheritdoc */
  async getProviderIdentity(): Promise<ProviderIdentityState | undefined> {
    return this.providerIdentity;
  }

  /** @inheritdoc */
  async setProviderIdentity(identity: ProviderIdentityState): Promise<void> {
    this.providerIdentity = identity;
    if (identity.didDocument?.id) {
      await this.setDidDocument(identity.didDocument.id, identity.didDocument);
    }
  }
}
