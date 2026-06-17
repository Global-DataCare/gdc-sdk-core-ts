// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import type { ProfileAppType } from 'gdc-common-utils-ts/constants/profile-runtime';

export type AppType = ProfileAppType;

/**
 * Host application identity required by GW CORE.
 *
 * `appId` is mandatory and should be stable for the app/runtime integrating the
 * SDK. It may be provided either as a reverse-DNS identifier
 * (`es.globaldatacare.portal`) or as a URL/domain
 * (`https://portal.globaldatacare.es/app`), in which case the SDK normalizes it
 * to reverse-DNS using the hostname.
 *
 * `appVersion` is optional on input. SDK runtimes resolve it to `v1.0` when it
 * is omitted.
 *
 * @example
 * ```ts
 * const appInfo: AppInfo = {
 *   appId: 'https://portal.globaldatacare.es/app',
 *   appType: 'Family',
 *   sector: 'health-care',
 * };
 * ```
 */
export type AppInfo = {
  appId: string;
  appVersion?: string;
  appType: AppType;
  sector: string;
};

/**
 * Trust level declared for the device/runtime where the SDK is running.
 *
 * - `confidential`: managed or private device where encrypted local persistence is acceptable
 * - `shared`: kiosk/library/shared workstation where sensitive local persistence should be avoided
 * - `ephemeral`: transient runtime where memory-only handling is preferred
 */
export type DeviceTrustLevel = 'confidential' | 'shared' | 'ephemeral';

/**
 * Persistence strategy selected for wallet, drafts, and outbox state.
 *
 * - `memory`: process-only, cleared on restart
 * - `local-secure`: device-local protected storage such as secure storage or encrypted SQLite
 * - `local-durable`: local persistence without a confidential-storage guarantee
 * - `server-remote`: server/database-backed persistence
 */
export type PersistenceMode = 'memory' | 'local-secure' | 'local-durable' | 'server-remote';

/**
 * Runtime-neutral policy telling the SDK whether it may persist sensitive
 * state locally and which persistence tier should be used for each subsystem.
 */
export type DataPersistencePolicy = {
  deviceTrustLevel: DeviceTrustLevel;
  allowLocalPersistence: boolean;
  walletPersistence: PersistenceMode;
  draftsPersistence: PersistenceMode;
  outboxPersistence: PersistenceMode;
};

export type InitializeSessionParams = {
  profileId: string;
  email: string;
  role: string;
  providerDid: string;
  appType: AppType;
};

export type Profile = {
  id: string;
  email: string;
  role: string;
  providerDid: string;
  appType: AppType;
  deviceIdentity?: {
    did?: string;
    signingKid?: string;
    encryptionKid?: string;
  };
  actorIdentity?: {
    did: string;
    kind?: string;
  };
  providerIdentity?: {
    did: string;
    smartTokenEndpoint?: string;
  };
  createdAt: string;
};

export type ProfileRegistryEntry = {
  id: string;
  email: string;
  role: string;
  providerDid: string;
};

export type VaultQueryCondition =
  | { attribute: string; equals: unknown }
  | { attribute: string; in: unknown[] };

export type VaultQuery = {
  where?: VaultQueryCondition[];
  orderBy?: { attribute: string; direction: 'asc' | 'desc' };
  offset?: number;
  limit?: number;
};

export interface IVaultRepository {
  initialize(): Promise<void>;
  put<T extends { id: string }>(collectionName: string, containers: T | T[]): Promise<boolean>;
  get<T extends { id: string }>(collectionName: string, containerId: string): Promise<T | undefined>;
  query<T extends { id: string }>(collectionName: string, query: VaultQuery): Promise<T[]>;
  delete(collectionName: string, containerId: string): Promise<boolean>;
}

export interface IApiConfig {
  operationMode: 'DEMO' | 'FAPI';
  legacyFhirEnabled: boolean;
  getRetryPolicy: () => { retries: number; delayMs: number };
}

export interface INetwork {
  isConnected(): Promise<boolean>;
}

export interface IVerifier {
  verifyCredential(...args: unknown[]): Promise<boolean>;
  verifyPresentation(...args: unknown[]): Promise<boolean>;
}
