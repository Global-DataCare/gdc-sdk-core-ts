// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import type {
  RelationshipChannelInvitationInput,
  RelationshipChannelInvitationSummary,
  RelationshipChannelOtpChallengeSummary,
  RelationshipChannelOtpConfirmInput,
  RelationshipChannelOtpStartInput,
  RelationshipLocalKeyEnvelope,
  RelationshipPinPolicy,
  RelationshipPinSetInput,
  RelationshipPinVerifyInput,
  RelationshipSubjectKind,
} from 'gdc-common-utils-ts/models/relationship-access';

function normalizeOptionalToken(value: unknown): string | undefined {
  const normalized = String(value || '').trim();
  return normalized || undefined;
}

function normalizeDigits(value: unknown): string {
  return String(value || '').replace(/\s+/g, '').trim();
}

function normalizeSubjectKind(value: RelationshipSubjectKind | undefined): RelationshipSubjectKind {
  return value === 'animal' ? 'animal' : 'person';
}

/**
 * Normalizes a relationship invitation payload shared by portal, app, and IVR.
 */
export function createRelationshipChannelInvitationInput(
  input: RelationshipChannelInvitationInput,
): RelationshipChannelInvitationInput {
  return {
    tenantId: String(input.tenantId || '').trim(),
    jurisdiction: String(input.jurisdiction || '').trim().toUpperCase(),
    sector: String(input.sector || '').trim(),
    subjectId: String(input.subjectId || '').trim(),
    subjectKind: normalizeSubjectKind(input.subjectKind),
    actorKind: input.actorKind,
    actorIdentifier: String(input.actorIdentifier || '').trim(),
    actorRole: normalizeOptionalToken(input.actorRole),
    deliveryChannel: input.deliveryChannel,
    deliveryTarget: String(input.deliveryTarget || '').trim(),
    purpose: normalizeOptionalToken(input.purpose),
    relationshipLabel: normalizeOptionalToken(input.relationshipLabel),
    expiresAt: normalizeOptionalToken(input.expiresAt),
    phonePinOptional: input.phonePinOptional === true,
  };
}

/**
 * Normalizes the runtime summary returned for a relationship invitation.
 */
export function createRelationshipChannelInvitationSummary(
  input: RelationshipChannelInvitationSummary,
): RelationshipChannelInvitationSummary {
  return {
    invitationId: String(input.invitationId || '').trim(),
    tenantId: String(input.tenantId || '').trim(),
    subjectId: String(input.subjectId || '').trim(),
    subjectKind: normalizeSubjectKind(input.subjectKind),
    actorKind: input.actorKind,
    actorIdentifier: String(input.actorIdentifier || '').trim(),
    actorRole: normalizeOptionalToken(input.actorRole),
    deliveryChannel: input.deliveryChannel,
    deliveryTargetMasked: normalizeOptionalToken(input.deliveryTargetMasked),
    status: input.status,
    purpose: normalizeOptionalToken(input.purpose),
    relationshipLabel: normalizeOptionalToken(input.relationshipLabel),
    expiresAt: normalizeOptionalToken(input.expiresAt),
    phonePinOptional: input.phonePinOptional === true,
  };
}

/**
 * Normalizes an OTP start request for phone, email, or app enrollment.
 */
export function createRelationshipChannelOtpStartInput(
  input: RelationshipChannelOtpStartInput,
): RelationshipChannelOtpStartInput {
  return {
    invitationId: String(input.invitationId || '').trim(),
    deliveryChannel: input.deliveryChannel,
    locale: normalizeOptionalToken(input.locale),
  };
}

/**
 * Normalizes an OTP confirmation request for a previously issued challenge.
 */
export function createRelationshipChannelOtpConfirmInput(
  input: RelationshipChannelOtpConfirmInput,
): RelationshipChannelOtpConfirmInput {
  return {
    invitationId: String(input.invitationId || '').trim(),
    challengeId: String(input.challengeId || '').trim(),
    code: normalizeDigits(input.code),
  };
}

/**
 * Normalizes a runtime-neutral OTP challenge summary.
 */
export function createRelationshipChannelOtpChallengeSummary(
  input: RelationshipChannelOtpChallengeSummary,
): RelationshipChannelOtpChallengeSummary {
  return {
    invitationId: String(input.invitationId || '').trim(),
    challengeId: String(input.challengeId || '').trim(),
    deliveryChannel: input.deliveryChannel,
    status: input.status,
    expiresAt: normalizeOptionalToken(input.expiresAt),
    attemptsRemaining:
      Number.isFinite(input.attemptsRemaining) && Number(input.attemptsRemaining) >= 0
        ? Math.floor(Number(input.attemptsRemaining))
        : undefined,
  };
}

/**
 * Normalizes policy hints for relationship PIN setup.
 */
export function createRelationshipPinPolicy(
  input: RelationshipPinPolicy = {},
): RelationshipPinPolicy {
  return {
    minLength:
      Number.isFinite(input.minLength) && Number(input.minLength) > 0
        ? Math.floor(Number(input.minLength))
        : undefined,
    maxLength:
      Number.isFinite(input.maxLength) && Number(input.maxLength) > 0
        ? Math.floor(Number(input.maxLength))
        : undefined,
    maxAttempts:
      Number.isFinite(input.maxAttempts) && Number(input.maxAttempts) > 0
        ? Math.floor(Number(input.maxAttempts))
        : undefined,
    lockMinutes:
      Number.isFinite(input.lockMinutes) && Number(input.lockMinutes) >= 0
        ? Math.floor(Number(input.lockMinutes))
        : undefined,
    numericOnly: input.numericOnly !== false,
    optional: input.optional === true,
  };
}

/**
 * Normalizes a PIN setup payload for a verified relationship invitation.
 */
export function createRelationshipPinSetInput(
  input: RelationshipPinSetInput,
): RelationshipPinSetInput {
  return {
    invitationId: String(input.invitationId || '').trim(),
    challengeId: String(input.challengeId || '').trim(),
    channel: input.channel,
    pin: normalizeDigits(input.pin),
    pinConfirmation: normalizeOptionalToken(input.pinConfirmation),
    policy: input.policy ? createRelationshipPinPolicy(input.policy) : undefined,
  };
}

/**
 * Normalizes a PIN verification payload for an already active relationship.
 */
export function createRelationshipPinVerifyInput(
  input: RelationshipPinVerifyInput,
): RelationshipPinVerifyInput {
  return {
    relationshipId: String(input.relationshipId || '').trim(),
    channel: input.channel,
    pin: normalizeDigits(input.pin),
  };
}

/**
 * Normalizes the portable envelope used to persist a relationship-local key in
 * offline-first apps after the relationship PIN has been established.
 */
export function createRelationshipLocalKeyEnvelope(
  input: RelationshipLocalKeyEnvelope,
): RelationshipLocalKeyEnvelope {
  return {
    relationshipId: String(input.relationshipId || '').trim(),
    actorIdentifier: String(input.actorIdentifier || '').trim(),
    subjectId: String(input.subjectId || '').trim(),
    subjectKind: normalizeSubjectKind(input.subjectKind),
    channel: input.channel,
    wrappedLocalAccessKey: String(input.wrappedLocalAccessKey || '').trim(),
    kdfSalt: String(input.kdfSalt || '').trim(),
    kdf: input.kdf,
    scope: 'relationship-local-cache',
  };
}

export type {
  RelationshipEnrollmentChannel,
  RelationshipSubjectKind,
  RelationshipAccessActorKind,
  RelationshipInvitationStatus,
  RelationshipOtpDeliveryChannel,
  RelationshipPinKdf,
  RelationshipChannelInvitationInput,
  RelationshipChannelInvitationSummary,
  RelationshipChannelOtpStartInput,
  RelationshipChannelOtpConfirmInput,
  RelationshipChannelOtpChallengeSummary,
  RelationshipPinPolicy,
  RelationshipPinSetInput,
  RelationshipPinVerifyInput,
  RelationshipLocalKeyEnvelope,
} from 'gdc-common-utils-ts/models/relationship-access';

export {
  RelationshipEnrollmentChannels,
  RelationshipSubjectKinds,
  RelationshipAccessActorKinds,
  RelationshipOtpDeliveryChannels,
} from 'gdc-common-utils-ts/models/relationship-access';
