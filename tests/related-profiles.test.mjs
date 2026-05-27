// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.
/**
 * @fileoverview TDD coverage for related-profile shared helpers.
 *
 * @architecture 101
 * These tests lock the DTO normalization contract before node/front adapters use it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RELATED_PROFILE_SEARCH_PARAM_ACTOR_IDENTIFIER,
  createRelatedProfileSearchInput,
  createRelatedProfileSearchResult,
  extractRelatedProfileSearchResultFromSubmitPollBody,
  RELATED_PROFILE_SOURCE_RELATED_PERSON,
} from '../dist/index.js';

test('related profile helpers normalize search inputs and results', () => {
  const input = createRelatedProfileSearchInput({
    actorIdentifier: ' tel:+34600000111 ',
    subjectId: ' did:web:subject:001 ',
    relationship: ' controller ',
    includeInactive: true,
  });

  const result = createRelatedProfileSearchResult({
    actorIdentifier: ' tel:+34600000111 ',
    total: 1.8,
    data: [{
      relationshipId: ' rel-001 ',
      source: RELATED_PROFILE_SOURCE_RELATED_PERSON,
      subjectId: ' did:web:subject:001 ',
      actorIdentifier: ' tel:+34600000111 ',
      role: 'controller',
      isController: true,
      status: 'active',
      claims: {},
    }],
  });

  assert.equal(input.actorIdentifier, 'tel:+34600000111');
  assert.equal(input.subjectId, 'did:web:subject:001');
  assert.equal(result.total, 1);
  assert.equal(result.data[0].relationshipId, 'rel-001');
});

test('related profile helpers extract normalized search result from poll body', () => {
  const extracted = extractRelatedProfileSearchResultFromSubmitPollBody({
    data: [{
      resource: {
        [RELATED_PROFILE_SEARCH_PARAM_ACTOR_IDENTIFIER]: 'tel:+34600000111',
        total: 1,
        data: [{
          relationshipId: 'rel-001',
          source: RELATED_PROFILE_SOURCE_RELATED_PERSON,
          subjectId: 'did:web:subject:001',
          actorIdentifier: 'tel:+34600000111',
          role: 'controller',
          isController: true,
          status: 'active',
          claims: {},
        }],
      },
    }],
  });

  assert.equal(extracted?.actorIdentifier, 'tel:+34600000111');
  assert.equal(extracted?.data[0].subjectId, 'did:web:subject:001');
});
