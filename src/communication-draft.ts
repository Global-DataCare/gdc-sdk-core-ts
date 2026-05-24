// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import {
  addClaimsResourceToCommunication,
  addFhirResourceToCommunication,
  buildCommunicationBatchMessage,
  createCommunicationResource,
} from './communication-resource-helpers.js';
import type {
  CommunicationBatchMessageOptions,
  CommunicationCreationOptions,
  CommunicationResourceLike,
  FhirResourceLike,
  ResourceAttachmentOptions,
} from './communication-resource-helpers.js';

export const CommunicationOutboxStatuses = Object.freeze({
  Draft: 'draft',
  Ready: 'ready',
  Submitting: 'submitting',
  Sent: 'sent',
  Completed: 'completed',
  Failed: 'failed',
  ErrorRetryable: 'error-retryable',
} as const);

export type CommunicationOutboxStatus =
  typeof CommunicationOutboxStatuses[keyof typeof CommunicationOutboxStatuses];

export type CommunicationDraft = Readonly<{
  id: string;
  communication: CommunicationResourceLike;
  createdAt: string;
  updatedAt: string;
  noteText?: string;
}>;

export type CommunicationDraftCreationOptions = CommunicationCreationOptions & Readonly<{
  draftId?: string;
  createdAt?: string;
}>;

export type OutboxJob<
  TPayload = Record<string, unknown>,
  TStatus extends string = CommunicationOutboxStatus,
> = Readonly<{
  id: string;
  draftId: string;
  thid: string;
  createdAt: string;
  updatedAt: string;
  status: TStatus;
  payload: TPayload;
  envelope: Record<string, unknown>;
  response?: Record<string, unknown>;
  errorMessage?: string;
}>;

export type CommunicationOutboxJob = OutboxJob<CommunicationResourceLike, CommunicationOutboxStatus>;

export type CommunicationOutboxJobOptions = Readonly<{
  jobId?: string;
  createdAt?: string;
  status?: CommunicationOutboxStatus;
  batchOptions?: CommunicationBatchMessageOptions;
}>;

function runtimeUuid(): string {
  const cryptoLike = globalThis as typeof globalThis & {
    crypto?: { randomUUID?: () => string };
  };
  if (typeof cryptoLike.crypto?.randomUUID === 'function') {
    return cryptoLike.crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function resolveDraftNoteText(communication: CommunicationResourceLike): string | undefined {
  if (!Array.isArray(communication.note)) return undefined;
  return communication.note
    .map((item) => (item && typeof item.text === 'string' ? item.text.trim() : ''))
    .filter(Boolean)
    .join('\n\n') || undefined;
}

/**
 * Creates an in-memory `CommunicationDraft` ready to receive resources,
 * documents, notes, and attachments before submission.
 *
 * The draft is purely local. It does not imply persistence, network I/O,
 * queueing, or polling until converted into an outbox job.
 *
 * @param options Draft metadata plus the base `Communication` creation fields.
 */
export function createCommunicationDraft(
  options: CommunicationDraftCreationOptions,
): CommunicationDraft {
  const createdAt = options.createdAt || new Date().toISOString();
  const communication = createCommunicationResource(options);
  return Object.freeze({
    id: options.draftId || runtimeUuid(),
    communication,
    createdAt,
    updatedAt: createdAt,
    noteText: resolveDraftNoteText(communication),
  });
}

/**
 * Returns the FHIR `Communication` currently being edited inside the draft.
 *
 * @param draft Communication draft to inspect.
 */
export function getCommunicationFromDraft(draft: CommunicationDraft): CommunicationResourceLike {
  return clone(draft.communication);
}

/**
 * Returns `true` when the draft contains at least one `payload[]` entry and
 * can therefore be serialized into an outbox job for submission.
 *
 * @param draft Communication draft to validate.
 */
export function isCommunicationDraftReady(draft: CommunicationDraft): boolean {
  return Array.isArray(draft.communication.payload) && draft.communication.payload.length > 0;
}

/**
 * Appends a concrete FHIR resource to the draft `Communication.payload[]`.
 *
 * @param draft Communication draft being edited.
 * @param resource FHIR resource to attach.
 * @param options Attachment/document wrapping options.
 */
export function addFhirResourceToDraft(
  draft: CommunicationDraft,
  resource: FhirResourceLike,
  options: ResourceAttachmentOptions = {},
): CommunicationDraft {
  const communication = addFhirResourceToCommunication(draft.communication, resource, options);
  return Object.freeze({
    ...draft,
    communication,
    updatedAt: new Date().toISOString(),
    noteText: resolveDraftNoteText(communication),
  });
}

/**
 * Appends a claims-only pseudo-resource to the draft `Communication.payload[]`.
 *
 * @param draft Communication draft being edited.
 * @param resourceType FHIR `resourceType` name to materialize.
 * @param claims Canonical claims to place under `resource.meta.claims`.
 * @param options Attachment/document wrapping options.
 */
export function addClaimsResourceToDraft(
  draft: CommunicationDraft,
  resourceType: string,
  claims: Record<string, unknown>,
  options: ResourceAttachmentOptions = {},
): CommunicationDraft {
  const communication = addClaimsResourceToCommunication(draft.communication, resourceType, claims, options);
  return Object.freeze({
    ...draft,
    communication,
    updatedAt: new Date().toISOString(),
    noteText: resolveDraftNoteText(communication),
  });
}

/**
 * Freezes the current draft into a transport-oriented outbox job.
 *
 * The returned job contains the current `Communication` as `payload`, the prebuilt batch
 * message, a thread id, and a transport status. Submission and polling are
 * intentionally left to runtime packages.
 *
 * @param draft Draft to freeze.
 * @param options Optional job id, timestamps, initial status, and batch options.
 */
export function createOutboxJobFromDraft(
  draft: CommunicationDraft,
  options: CommunicationOutboxJobOptions = {},
): CommunicationOutboxJob {
  const createdAt = options.createdAt || new Date().toISOString();
  const batchMessage = buildCommunicationBatchMessage(draft.communication, options.batchOptions);
  const thid = typeof batchMessage.thid === 'string' ? batchMessage.thid : runtimeUuid();
  return Object.freeze({
    id: options.jobId || runtimeUuid(),
    draftId: draft.id,
    thid,
    createdAt,
    updatedAt: createdAt,
    status: options.status || (isCommunicationDraftReady(draft)
      ? CommunicationOutboxStatuses.Ready
      : CommunicationOutboxStatuses.Draft),
    payload: clone(draft.communication),
    envelope: batchMessage,
  });
}

/**
 * Returns a copy of the outbox job with a new status and optional transport
 * result metadata such as gateway responses or error messages.
 *
 * @param job Existing outbox job.
 * @param status Next transport status.
 * @param patch Optional response/error payload.
 */
export function updateOutboxJobStatus(
  job: CommunicationOutboxJob,
  status: CommunicationOutboxStatus,
  patch: Readonly<{
    response?: Record<string, unknown>;
    errorMessage?: string;
  }> = {},
): CommunicationOutboxJob {
  return Object.freeze({
    ...job,
    status,
    updatedAt: new Date().toISOString(),
    ...(patch.response ? { response: clone(patch.response) } : {}),
    ...(patch.errorMessage ? { errorMessage: patch.errorMessage } : {}),
  });
}
