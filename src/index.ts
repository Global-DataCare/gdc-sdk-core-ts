// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.
/**
 * @fileoverview Public export surface for the runtime-neutral core SDK.
 *
 * @architecture 101
 * Keep this file as a thin barrel only. Business logic belongs in leaf modules.
 */

export * from './actor-model.js';
export * from './app-identity.js';
export * from './bootstrap-facade.js';
export * from './communication-bundle-contracts.js';
export * from './consent-access.js';
export * from './communication-draft.js';
export * from './communication-document-facade.js';
export * from './communication-outbox.js';
export * from './communication-resource-helpers.js';
export * from './did-resolution-session.js';
export * from './discovery-facade.js';
export * from './identity-model.js';
export * from './identity-store.js';
export * from './polling-model.js';
export * from './relationship-access.js';
export * from './related-profiles.js';
export * from './session-model.js';
export * from './smart-endpoint-resolver.js';
export * from './vital-signs.js';
