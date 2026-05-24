import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRelationshipChannelInvitationInput,
  createRelationshipChannelInvitationSummary,
  createRelationshipChannelOtpChallengeSummary,
  createRelationshipChannelOtpConfirmInput,
  createRelationshipChannelOtpStartInput,
  createRelationshipLocalKeyEnvelope,
  createRelationshipPinPolicy,
  createRelationshipPinSetInput,
  createRelationshipPinVerifyInput,
} from '../dist/index.js';

test('relationship access builders normalize shared invitation and OTP payloads', () => {
  const invitation = createRelationshipChannelInvitationInput({
    tenantId: ' acme ',
    jurisdiction: 'es',
    sector: 'health-care',
    subjectId: ' did:web:subject:001 ',
    actorKind: 'related-person',
    actorIdentifier: ' tel:+34600000111 ',
    deliveryChannel: 'phone',
    deliveryTarget: ' +34600000111 ',
    phonePinOptional: true,
  });

  const summary = createRelationshipChannelInvitationSummary({
    invitationId: ' inv-001 ',
    tenantId: 'acme',
    subjectId: 'did:web:subject:001',
    subjectKind: 'animal',
    actorKind: 'professional',
    actorIdentifier: ' did:web:vet:001 ',
    deliveryChannel: 'app',
    status: 'otp_pending',
  });

  const otpStart = createRelationshipChannelOtpStartInput({
    invitationId: ' inv-001 ',
    deliveryChannel: 'sms',
    locale: ' es-ES ',
  });

  const otpConfirm = createRelationshipChannelOtpConfirmInput({
    invitationId: ' inv-001 ',
    challengeId: ' ch-001 ',
    code: ' 12 34 56 ',
  });

  const otpSummary = createRelationshipChannelOtpChallengeSummary({
    invitationId: 'inv-001',
    challengeId: 'ch-001',
    deliveryChannel: 'sms',
    status: 'pending',
    attemptsRemaining: 3.7,
  });

  assert.equal(invitation.tenantId, 'acme');
  assert.equal(invitation.jurisdiction, 'ES');
  assert.equal(invitation.actorIdentifier, 'tel:+34600000111');
  assert.equal(summary.subjectKind, 'animal');
  assert.equal(otpStart.locale, 'es-ES');
  assert.equal(otpConfirm.code, '123456');
  assert.equal(otpSummary.attemptsRemaining, 3);
});

test('relationship access builders normalize PIN and local-key payloads', () => {
  const policy = createRelationshipPinPolicy({
    minLength: 6.9,
    maxAttempts: 5.2,
    numericOnly: true,
  });

  const pinSet = createRelationshipPinSetInput({
    invitationId: ' inv-002 ',
    challengeId: ' ch-002 ',
    channel: 'phone',
    pin: ' 48 39 20 ',
    pinConfirmation: ' 48 39 20 ',
    policy,
  });

  const pinVerify = createRelationshipPinVerifyInput({
    relationshipId: ' rel-001 ',
    channel: 'app',
    pin: ' 12 34 ',
  });

  const localKey = createRelationshipLocalKeyEnvelope({
    relationshipId: ' rel-001 ',
    actorIdentifier: ' did:web:actor:001 ',
    subjectId: ' did:web:subject:001 ',
    subjectKind: 'person',
    channel: 'app',
    wrappedLocalAccessKey: ' wrapped ',
    kdfSalt: ' salt ',
    kdf: 'argon2id',
    scope: 'relationship-local-cache',
  });

  assert.equal(policy.minLength, 6);
  assert.equal(policy.maxAttempts, 5);
  assert.equal(pinSet.pin, '483920');
  assert.equal(pinVerify.relationshipId, 'rel-001');
  assert.equal(localKey.wrappedLocalAccessKey, 'wrapped');
});
