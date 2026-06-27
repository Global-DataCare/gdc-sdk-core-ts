import test from 'node:test';
import assert from 'node:assert/strict';

import { getUserProfileSelectionNumber } from '../dist/index.js';

test('user profile index derives the selection number from array order', () => {
  const profiles = [
    {
      profileId: 'profile-ana',
      actorKind: 'individual-controller',
      subjectId: 'subject-ana',
      pinRequired: true,
    },
    {
      profileId: 'profile-carlos',
      actorKind: 'individual-member',
      subjectId: 'subject-carlos',
      pinRequired: true,
    },
  ];

  assert.equal(getUserProfileSelectionNumber(profiles, 'profile-ana'), 1);
  assert.equal(getUserProfileSelectionNumber(profiles, 'profile-carlos'), 2);
});

test('user profile index selection number changes automatically after reorder', () => {
  const profiles = [
    {
      profileId: 'profile-ana',
      actorKind: 'individual-controller',
      subjectId: 'subject-ana',
      pinRequired: true,
    },
    {
      profileId: 'profile-carlos',
      actorKind: 'individual-member',
      subjectId: 'subject-carlos',
      pinRequired: true,
    },
  ];

  const reordered = [profiles[1], profiles[0]];

  assert.equal(getUserProfileSelectionNumber(reordered, 'profile-carlos'), 1);
  assert.equal(getUserProfileSelectionNumber(reordered, 'profile-ana'), 2);
});

test('user profile index rejects unknown profile ids', () => {
  assert.throws(
    () => getUserProfileSelectionNumber([], 'missing-profile'),
    /user profile not found in ordered list: missing-profile/,
  );
});

test('user profile index lookup keys never expose raw phone or email values', async () => {
  const { lookup } = {
    lookup: [
      {
        kind: 'phone',
        algorithm: 'sha256-salted',
        value: '4f5e89c6d770e36d26eb7f6afce0c0845e66e448bf3d92a488e6452d2cf5d5fb',
      },
      {
        kind: 'email',
        algorithm: 'sha256-salted',
        value: '82696f1fb37d3b23618f3779e67182fdd9ef17f05b3948acec0c7fdd19cf8574',
      },
    ],
  };

  assert.deepEqual(
    lookup.map((item) => item.algorithm),
    ['sha256-salted', 'sha256-salted'],
  );
});

