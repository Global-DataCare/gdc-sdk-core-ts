// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

/**
 * Ordered local profile index used by voice, web, or app channels before a
 * profile is unlocked.
 *
 * This contract is runtime-neutral and intentionally limited to profile lookup
 * and selection. It does not contain seeds, private keys, or decrypted profile
 * data.
 *
 * Security rule:
 * - lookup keys must never store raw phone or raw email values
 * - even protected local storage can be misconfigured or projected incorrectly
 * - only hashed lookup tokens are allowed in this shared contract
 *
 * Selection rule:
 * - do not persist a separate `profileNumber`
 * - the selection number is always derived from array position + 1
 * - reordering the array changes the selection number automatically
 */
export interface UserProfileIndex {
  /**
   * Hashed lookup keys that can recover this local profile list.
   *
   * Typical runtimes resolve these from normalized phone/email values and a
   * local salt or local secret before touching storage.
   */
  lookup: UserProfileLookupKey[];

  /**
   * Profiles currently available in user-facing menu order.
   *
   * The position in this array is semantically significant because callers and
   * app users select profiles by array order, not by a persisted ordinal.
   */
  profiles: UserProfileIndexEntry[];

  /**
   * Timestamp of the last change applied to this ordered list.
   *
   * The update may come from backend synchronization, portal reordering, voice
   * onboarding, or local repair.
   */
  updatedAt?: string;
}

/**
 * One hashed lookup key for the local user-profile index.
 *
 * Raw contact values are intentionally forbidden here. The shared SDK contract
 * only models hashed lookup tokens so downstream runtimes cannot accidentally
 * persist clear-text phone/email values by following this API literally.
 */
export interface UserProfileLookupKey {
  /**
   * Semantic source of the normalized contact value before hashing.
   */
  kind: 'phone' | 'email';

  /**
   * Hashing scheme used to derive the lookup token.
   *
   * `sha256-salted` means the runtime must hash normalized input together with
   * a local salt or local secret so the token is not directly reusable across
   * unrelated devices or installations.
   */
  algorithm: 'sha256-salted';

  /**
   * Stored hashed lookup token.
   *
   * This value is derived from the normalized contact value and a local salt or
   * local secret. It is never the original phone/email.
   */
  value: string;
}

/**
 * One selectable local profile before unlock.
 *
 * Unlock rule:
 * - `profileId` must point to the same local profile record later passed to
 *   wallet/profile-manager unlock
 * - the index locates a profile; wallet/profile runtime unlocks it
 * - this aligns the index with flows such as `unlockProfile(profile, pin)`
 *
 * Selection rule:
 * - do not store `profileNumber`
 * - compute the selection number as `profiles.indexOf(entry) + 1`
 */
export interface UserProfileIndexEntry {
  /**
   * Stable local profile identifier.
   *
   * This should match the concrete local profile object identifier later loaded
   * and unlocked with a PIN or another local factor.
   */
  profileId: string;

  /**
   * Actor scope that this profile unlocks after local verification.
   */
  actorKind:
    | 'individual-controller'
    | 'individual-member'
    | 'professional'
    | 'organization-controller'
    | 'healthcare-administrative';

  /**
   * Canonical subject identifier resolved after the profile is unlocked.
   */
  subjectId: string;

  /**
   * Optional human-readable label shown in web/app portals.
   */
  displayLabel?: string;

  /**
   * Optional recording reference for a short spoken label.
   *
   * This is an accessibility aid for disambiguation, never the primary
   * selector.
   */
  voiceLabelRef?: string;

  /**
   * Whether this profile requires PIN-based local unlock before use.
   */
  pinRequired: boolean;

  /**
   * Optional hint describing how the entry was discovered or created.
   */
  source?: 'portal' | 'backend-sync' | 'voice-created' | 'manual-import';
}

/**
 * Returns the number that the caller or user must hear, see, or dial for the
 * given profile entry.
 *
 * The local profile index must not persist a dedicated `profileNumber`.
 * Instead, the selection number is always derived from the current list order.
 *
 * @param profiles Ordered local profile list.
 * @param profileId Stable identifier of the profile to announce or render.
 * @returns The 1-based selection number for the current array order.
 * @throws When the profile is not present in the provided array.
 */
export function getUserProfileSelectionNumber(
  profiles: UserProfileIndexEntry[],
  profileId: string,
): number {
  const index = profiles.findIndex((profile) => profile.profileId === profileId);
  if (index === -1) {
    throw new Error(`user profile not found in ordered list: ${profileId}`);
  }
  return index + 1;
}

