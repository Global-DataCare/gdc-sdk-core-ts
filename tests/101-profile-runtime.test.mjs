import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Repo convention reminder:
 * read `ARCHITECTURE.md` and `CONTRIBUTING.md` before reshaping this test.
 *
 * Non-negotiable here:
 * - no ad hoc literals when one shared fixture/type already exists
 * - prefer reusable examples from `gdc-common-utils-ts`
 * - keep the flow step by step and didactic
 */
import {
  EXAMPLE_DEVICE_CLIENT_ID,
  EXAMPLE_ORGANIZATION_CONTROLLER_ROLE,
  EXAMPLE_OTP_CODE,
  EXAMPLE_PROFILE_APP_TYPE_FAMILY,
  EXAMPLE_PROFILE_CONNECTION_PIN_PASSWORD,
  EXAMPLE_PROFILE_CONNECTION_SECRET_KIND_PIN_PASSWORD,
  EXAMPLE_PROFILE_EMAIL,
  EXAMPLE_PROFILE_ID,
  EXAMPLE_PROFILE_KEY_ACCESS_MODE_SERVER,
  EXAMPLE_PROFILE_LOCAL_PIN_PASSWORD_BACKEND,
  EXAMPLE_PROFILE_PROVIDER_DID,
  EXAMPLE_PROFILE_RUNTIME_CLASS_SERVER,
  EXAMPLE_PROFILE_RUNTIME_JOB_ID,
  EXAMPLE_SUBJECT_DID,
} from 'gdc-common-utils-ts';
import {
  ActorCapabilities,
  ActorKinds,
  buildActorSessionDescriptorFromActorFlags,
  expandActorSessionDescriptorToFacades,
  prepareConnectToSubjectIndex,
  prepareGetSubjectIndexComposition,
  prepareLoadedActorProfile,
  prepareLoadProfile,
  prepareRegisterTrustedDevice,
} from '../dist/index.js';

/**
 * Teaching goal:
 * show the v2 `sdk-core` shape for:
 * 1. loading one actor profile,
 * 2. registering one trusted device,
 * 3. connecting that actor to one subject index, and
 * 4. reading the subject index composition,
 * before any frontend or node runtime implementation exists.
 */
test('101: profile runtime contract stays actor-aware and runtime-neutral', async () => {
  // Step 1. Prepare the generic local profile load request.
  const loadRequest = prepareLoadProfile({
    actorKind: ActorKinds.IndividualController,
    providerDid: EXAMPLE_PROFILE_PROVIDER_DID,
    runtimeClass: EXAMPLE_PROFILE_RUNTIME_CLASS_SERVER,
    keyAccessMode: EXAMPLE_PROFILE_KEY_ACCESS_MODE_SERVER,
    actorRole: EXAMPLE_ORGANIZATION_CONTROLLER_ROLE,
    profileId: EXAMPLE_PROFILE_ID,
    profileDid: EXAMPLE_PROFILE_PROVIDER_DID,
    subjectDid: EXAMPLE_SUBJECT_DID,
    email: EXAMPLE_PROFILE_EMAIL,
    appType: EXAMPLE_PROFILE_APP_TYPE_FAMILY,
    localPinPassword: EXAMPLE_PROFILE_LOCAL_PIN_PASSWORD_BACKEND,
  });

  assert.equal(loadRequest.actorKind, ActorKinds.IndividualController);
  assert.equal(loadRequest.keyAccessMode, EXAMPLE_PROFILE_KEY_ACCESS_MODE_SERVER);
  assert.equal(loadRequest.localPinPassword, EXAMPLE_PROFILE_LOCAL_PIN_PASSWORD_BACKEND);

  const session = buildActorSessionDescriptorFromActorFlags({
    appType: loadRequest.appType,
    profileId: loadRequest.profileId,
    profileDid: loadRequest.profileDid,
    role: loadRequest.actorRole,
    actorFlags: {
      individualController: true,
    },
  });

  const facades = expandActorSessionDescriptorToFacades(session);

  // Step 2. Prepare the trusted-device registration request.
  const trustedDeviceRequest = prepareRegisterTrustedDevice({
    userId: loadRequest.profileDid,
    userRoleCode: loadRequest.actorRole,
    deviceDid: EXAMPLE_DEVICE_CLIENT_ID,
    providerDid: loadRequest.providerDid,
    otpCode: EXAMPLE_OTP_CODE,
  });

  assert.equal(trustedDeviceRequest.userId, loadRequest.profileDid);
  assert.equal(trustedDeviceRequest.otpCode, EXAMPLE_OTP_CODE);

  // Step 3. Prepare the subject-index connection request.
  const subjectIndexConnection = prepareConnectToSubjectIndex({
    subjectId: loadRequest.subjectDid,
    userId: loadRequest.profileDid,
    userRoleCode: loadRequest.actorRole,
    secretKind: EXAMPLE_PROFILE_CONNECTION_SECRET_KIND_PIN_PASSWORD,
    connectionPinPassword: EXAMPLE_PROFILE_CONNECTION_PIN_PASSWORD,
  });

  assert.equal(subjectIndexConnection.secretKind, EXAMPLE_PROFILE_CONNECTION_SECRET_KIND_PIN_PASSWORD);
  assert.equal(subjectIndexConnection.connectionPinPassword, EXAMPLE_PROFILE_CONNECTION_PIN_PASSWORD);
  assert.notEqual(
    subjectIndexConnection.connectionPinPassword,
    loadRequest.localPinPassword,
  );

  // Step 4. Prepare the composition-read request after the connection exists.
  const compositionRequest = prepareGetSubjectIndexComposition({
    subjectId: loadRequest.subjectDid,
    userId: loadRequest.profileDid,
    userRoleCode: loadRequest.actorRole,
  });

  assert.equal(compositionRequest.subjectId, loadRequest.subjectDid);

  const callLog = [];
  const jobManager = {
    descriptor: {
      profileId: session.profileId,
      actorKind: ActorKinds.IndividualController,
      actorRole: session.role,
      providerDid: EXAMPLE_PROFILE_PROVIDER_DID,
      runtimeClass: EXAMPLE_PROFILE_RUNTIME_CLASS_SERVER,
      profileDid: session.profileDid,
      subjectDid: EXAMPLE_SUBJECT_DID,
      email: EXAMPLE_PROFILE_EMAIL,
      appType: session.appType,
    },
    isInitialized: false,
    async initialize() {
      this.isInitialized = true;
      callLog.push('initialize');
    },
    shutdown() {
      callLog.push('shutdown');
      this.isInitialized = false;
    },
    setListener(listener) {
      callLog.push('setListener');
      listener();
    },
    async createJob(content, selector) {
      callLog.push(['createJob', content.type, selector.sector]);
      return {
        id: 'job-1',
        thid: 'thread-1',
        status: 'DRAFT',
        sequence: 1,
        createdAtTimestamp: 1,
        providerDid: this.descriptor.providerDid,
      };
    },
    async findDraftJobByFormType(formType) {
      callLog.push(['findDraftJobByFormType', formType]);
      return null;
    },
    async createOrUpdateDraftJob(content, selector) {
      callLog.push(['createOrUpdateDraftJob', content.type, selector.sector]);
      return {
        id: 'job-2',
        thid: 'thread-2',
        status: 'DRAFT',
        sequence: 2,
        createdAtTimestamp: 2,
        providerDid: this.descriptor.providerDid,
      };
    },
    async sync(accessToken) {
      callLog.push(['sync', accessToken]);
    },
    async queryJobs(query) {
      callLog.push(['queryJobs', query.where?.length || 0]);
      return [];
    },
    async submitJob(job) {
      callLog.push(['submitJob', job.id]);
    },
    async sealJobWithToken(job, accessToken) {
      callLog.push(['sealJobWithToken', job.id, accessToken]);
      return job;
    },
    async getJobResponseByThid(thid) {
      callLog.push(['getJobResponseByThid', thid]);
      return { resourceType: 'Bundle', id: thid };
    },
    generateId() {
      callLog.push('generateId');
      return EXAMPLE_PROFILE_RUNTIME_JOB_ID;
    },
  };

  const loadedProfile = prepareLoadedActorProfile({
    descriptor: jobManager.descriptor,
    session,
    facades,
    jobManager,
  });

  assert.equal(loadedProfile.descriptor.actorKind, ActorKinds.IndividualController);
  assert.equal(loadedProfile.descriptor.runtimeClass, EXAMPLE_PROFILE_RUNTIME_CLASS_SERVER);
  assert.equal(loadedProfile.descriptor.subjectDid, loadRequest.subjectDid);
  assert.equal(loadedProfile.session.profileId, EXAMPLE_PROFILE_ID);
  assert.ok(loadedProfile.session.capabilities.includes(ActorCapabilities.IndividualImportIps));
  assert.equal(loadedProfile.facades.length, 1);
  assert.equal(loadedProfile.facades[0].actorKind, ActorKinds.IndividualController);

  await loadedProfile.jobManager.initialize();
  const response = await loadedProfile.jobManager.getJobResponseByThid('thread-1');
  loadedProfile.jobManager.shutdown();

  assert.deepEqual(response, { resourceType: 'Bundle', id: 'thread-1' });
  assert.deepEqual(callLog, [
    'initialize',
    ['getJobResponseByThid', 'thread-1'],
    'shutdown',
  ]);
});
