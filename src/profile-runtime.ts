// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import type {
  ActorRuntimeClass,
  ConnectionSecretKind,
  KeyAccessMode,
} from 'gdc-common-utils-ts/constants/profile-runtime';
import type { IDecodedDidcommPayload } from 'gdc-common-utils-ts/models/confidential-message';
import type { JobRequest } from 'gdc-common-utils-ts/models/confidential-job';
import type { ServiceEndpointSelector } from 'gdc-common-utils-ts/models/did';

import type {
  ActorFacadeDescriptor,
  ActorKind,
  ActorSessionDescriptor,
} from './actor-model.js';
import type { Profile, VaultQuery } from './session-model.js';

export type {
  ActorRuntimeClass,
  ConnectionSecretKind,
  KeyAccessMode,
} from 'gdc-common-utils-ts/constants/profile-runtime';

/**
 * Runtime-neutral descriptor of one loaded actor profile.
 *
 * This is the stable identity and capability envelope that both `sdk-front`
 * and `sdk-node` should return after loading one actor profile.
 */
export type ActorProfileDescriptor = {
  profileId: string;
  actorKind: ActorKind;
  actorRole?: string;
  providerDid: string;
  runtimeClass: ActorRuntimeClass;
  profileDid?: string;
  subjectDid?: string;
  email?: string;
  phone?: string;
  deviceDid?: string;
  appType?: Profile['appType'];
};

/**
 * Input for loading or unlocking one local actor profile.
 *
 * This request is intentionally generic across controller, professional,
 * member, and other actor kinds. Its purpose is local profile loading, not
 * connecting that actor to one subject index.
 */
export type ProfileLoadRequest = {
  actorKind: ActorKind;
  providerDid: string;
  runtimeClass: ActorRuntimeClass;
  keyAccessMode: KeyAccessMode;
  actorRole?: string;
  profileId?: string;
  profileDid?: string;
  subjectDid?: string;
  email?: string;
  phone?: string;
  deviceDid?: string;
  appType?: Profile['appType'];
  localPinPassword?: string;
};

/**
 * Input for registering one trusted device/runtime after the actor profile is
 * already loaded.
 *
 * This is the place for OTP-style or bootstrap registration secrets tied to
 * device trust, not for the local profile unlock secret.
 */
export type TrustedDeviceRegistrationRequest = {
  userId: string;
  userRoleCode: string;
  deviceDid: string;
  providerDid: string;
  otpCode?: string;
};

/**
 * Input for connecting one loaded actor profile to one subject index.
 *
 * The secret here is relationship/channel-oriented. It is distinct from the
 * local profile unlock secret used by `ProfileLoadRequest`.
 */
export type SubjectIndexConnectionRequest = {
  subjectId: string;
  userId: string;
  userRoleCode: string;
  secretKind: ConnectionSecretKind;
  connectionPinPassword?: string;
  otpCode?: string;
};

/**
 * Input for reading one subject index composition after actor identity and
 * relationship/channel access are already established.
 */
export type SubjectIndexCompositionRequest = {
  subjectId: string;
  userId: string;
  userRoleCode: string;
};

/**
 * Runtime-neutral job-manager contract shared by frontend and node runtimes.
 *
 * This interface defines the semantic surface only. Scheduling policy,
 * polling loops, vault implementation, and transport runtime details stay in
 * `sdk-front` and `sdk-node`.
 */
export interface IJobManager {
  readonly descriptor: ActorProfileDescriptor;
  readonly isInitialized: boolean;
  initialize(): Promise<void>;
  shutdown(): void;
  setListener(listener: () => void): void;
  createJob(content: IDecodedDidcommPayload, selector: ServiceEndpointSelector): Promise<JobRequest>;
  findDraftJobByFormType(formType: string): Promise<JobRequest | null>;
  createOrUpdateDraftJob(
    content: IDecodedDidcommPayload,
    selector: ServiceEndpointSelector,
  ): Promise<JobRequest>;
  sync(accessToken: string): Promise<void>;
  queryJobs(query: VaultQuery): Promise<JobRequest[]>;
  submitJob(job: JobRequest): Promise<void>;
  sealJobWithToken(job: JobRequest, accessToken: string): Promise<JobRequest | null>;
  getJobResponseByThid(thid: string): Promise<unknown | null>;
  generateId(): string;
}

/**
 * Canonical loaded-profile shape returned by v2 actor-aware runtimes.
 */
export type LoadedActorProfile = {
  descriptor: ActorProfileDescriptor;
  session: ActorSessionDescriptor;
  facades: ActorFacadeDescriptor[];
  jobManager: IJobManager;
};

/**
 * Canonical helper for normalizing one `loadProfile(...)` request.
 *
 * This keeps the request actor-aware but runtime-neutral and makes the local
 * profile-unlock secret explicit through `localPinPassword`.
 */
export function prepareLoadProfile(input: ProfileLoadRequest): ProfileLoadRequest {
  return {
    ...input,
    actorRole: input.actorRole?.trim(),
    profileId: input.profileId?.trim(),
    profileDid: input.profileDid?.trim(),
    subjectDid: input.subjectDid?.trim(),
    email: input.email?.trim(),
    phone: input.phone?.trim(),
    deviceDid: input.deviceDid?.trim(),
    localPinPassword: input.localPinPassword?.trim(),
  };
}

/**
 * Canonical helper for normalizing one trusted-device registration request.
 */
export function prepareRegisterTrustedDevice(
  input: TrustedDeviceRegistrationRequest,
): TrustedDeviceRegistrationRequest {
  return {
    ...input,
    userId: input.userId.trim(),
    userRoleCode: input.userRoleCode.trim(),
    deviceDid: input.deviceDid.trim(),
    providerDid: input.providerDid.trim(),
    otpCode: input.otpCode?.trim(),
  };
}

/**
 * Canonical helper for normalizing one subject-index connection request.
 *
 * This deliberately keeps the connection secret separate from
 * `localPinPassword`, because local profile unlock and subject-channel
 * connection are different responsibilities.
 */
export function prepareConnectToSubjectIndex(
  input: SubjectIndexConnectionRequest,
): SubjectIndexConnectionRequest {
  return {
    ...input,
    subjectId: input.subjectId.trim(),
    userId: input.userId.trim(),
    userRoleCode: input.userRoleCode.trim(),
    connectionPinPassword: input.connectionPinPassword?.trim(),
    otpCode: input.otpCode?.trim(),
  };
}

/**
 * Canonical helper for normalizing one subject-index composition read request.
 */
export function prepareGetSubjectIndexComposition(
  input: SubjectIndexCompositionRequest,
): SubjectIndexCompositionRequest {
  return {
    ...input,
    subjectId: input.subjectId.trim(),
    userId: input.userId.trim(),
    userRoleCode: input.userRoleCode.trim(),
  };
}

/**
 * Canonical helper for v2 runtimes to normalize one loaded actor profile.
 *
 * `sdk-core` owns this shape so `sdk-front` and `sdk-node` can implement
 * different runtimes while returning one contract.
 */
export function prepareLoadedActorProfile(input: LoadedActorProfile): LoadedActorProfile {
  return {
    descriptor: { ...input.descriptor },
    session: {
      ...input.session,
      actorKinds: [...input.session.actorKinds],
      capabilities: [...input.session.capabilities],
    },
    facades: input.facades.map(facade => ({
      ...facade,
      capabilities: [...facade.capabilities],
    })),
    jobManager: input.jobManager,
  };
}
