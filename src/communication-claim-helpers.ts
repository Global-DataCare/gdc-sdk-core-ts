// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

/**
 * Re-export Communication claim helpers from common-utils so SDK CORE
 * consumers can build and edit canonical Communication flat claims from the
 * same entry point used for drafts/outbox orchestration.
 */
export {
  getCommunicationCategory,
  getCommunicationCategoryList,
  getCommunicationContentAttachmentData,
  getCommunicationContentAttachmentType,
  getCommunicationIdentifier,
  getCommunicationSubject,
  getCommunicationText,
  setCommunicationCategory,
  setCommunicationContentAttachmentData,
  setCommunicationContentAttachmentType,
  setCommunicationIdentifier,
  setCommunicationSubject,
  setCommunicationText,
  addCommunicationCategoryList,
  removeCommunicationCategoryList,
  type CommunicationInteroperableClaims,
} from 'gdc-common-utils-ts/utils/communication-claim-helpers';
