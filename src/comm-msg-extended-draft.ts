// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import type { CommMsgExtended, DataEntry } from 'gdc-common-utils-ts/models/comm';
import { CommunicationClaim } from 'gdc-common-utils-ts/models/interoperable-claims/communication-claims';
import { transformCommunicationClaimsToResourceFhirR4 } from 'gdc-common-utils-ts/utils/communication-fhir-r4';
import { CommunicationOutboxStatuses } from './communication-draft.js';
import type { CommunicationOutboxStatus } from './communication-draft.js';

export type CommMsgExtendedDraftCreationOptions = Readonly<{
  draftId?: string;
  messageId?: string;
  thid?: string;
  createdAt?: string;
  subject: string;
  sender?: string;
  recipient?: string | string[];
  sent?: string;
  status?: string;
  category?: string;
  noteText?: string;
  claims?: Record<string, unknown>;
}>;

export type CommMsgExtendedDraft = Readonly<{
  id: string;
  message: CommMsgExtended;
  createdAt: string;
  updatedAt: string;
}>;

export type CommMsgExtendedAttachmentOptions = Readonly<{
  noteText?: string;
  attachmentTitle?: string;
  attachmentContentType?: string;
  /** Exact clinical section for a section-scoped batch/collection attachment. */
  section?: string;
}>;

export type CommMsgExtendedSectionBundleAttachmentOptions =
  CommMsgExtendedAttachmentOptions & Readonly<{ section: string }>;

export type CommMsgExtendedCommunicationOutboxJob = Readonly<{
  id: string;
  draftId: string;
  thid: string;
  createdAt: string;
  updatedAt: string;
  status: CommunicationOutboxStatus;
  payload: CommMsgExtended;
  response?: Record<string, unknown>;
  errorMessage?: string;
}>;

export type CommMsgExtendedOutboxJobOptions = Readonly<{
  jobId?: string;
  createdAt?: string;
  status?: CommunicationOutboxStatus;
}>;

export type ClinicalUpdateCommunicationInput = Readonly<{
  /** DID of the individual whose clinical index is being updated. */
  subject: string;
  /**
   * Operational DID returned by the authenticated profile as `actorDid`.
   * Direct clinical-summary calls also project this value to DIDComm
   * `from`/`iss`; never substitute a stable multibase URN or a portal alias.
   */
  sender?: string;
  /**
   * Real DID of the provider tenant inside its hosting host, not a portal
   * alias and not the DID of the host itself.
   */
  recipient?: string | string[];
  bundle: Record<string, unknown>;
  thid?: string;
  sent?: string;
  noteText?: string;
  attachmentTitle?: string;
}>;

export type ClinicalSectionUpdateCommunicationInput =
  ClinicalUpdateCommunicationInput & Readonly<{ section: string }>;

export type CommunicationClinicalFormatRenderer = (
  message: CommMsgExtended,
) => Record<string, unknown>;

export type CommunicationClinicalFormatRenderers = Readonly<
  Record<string, CommunicationClinicalFormatRenderer>
>;

function runtimeUuid(prefix: string): string {
  const value = globalThis.crypto?.randomUUID?.();
  return value || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function encodeBase64Utf8(value: string): string {
  const runtime = globalThis as typeof globalThis & {
    Buffer?: { from(input: string, encoding: string): { toString(encoding: string): string } };
    btoa?: (input: string) => string;
  };
  if (runtime.Buffer) return runtime.Buffer.from(value, 'utf8').toString('base64');
  if (runtime.btoa) {
    const bytes = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)));
    return runtime.btoa(bytes);
  }
  throw new Error('No base64 encoder is available for the Communication attachment.');
}

function normalizedRecipients(value: string | string[] | undefined): string[] | undefined {
  const recipients = (Array.isArray(value) ? value : value ? [value] : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  return recipients.length ? recipients : undefined;
}

function firstCommunicationEntry(message: CommMsgExtended): DataEntry {
  const entry = message.body.data[0];
  if (!entry?.resource || typeof entry.resource !== 'object') {
    throw new Error('CommMsgExtended draft requires body.data[0].resource.');
  }
  return entry;
}

function claimsFromEntry(entry: DataEntry): Record<string, unknown> {
  const resourceMeta = entry.resource.meta;
  const claims = resourceMeta && typeof resourceMeta === 'object'
    ? (resourceMeta as Record<string, unknown>).claims
    : undefined;
  if (!claims || typeof claims !== 'object' || Array.isArray(claims)) {
    throw new Error('CommMsgExtended Communication entry requires resource.meta.claims.');
  }
  return claims as Record<string, unknown>;
}

/** Creates a local claims-first Communication draft backed by `CommMsgExtended`. */
export function createCommMsgExtendedDraft(
  options: CommMsgExtendedDraftCreationOptions,
): CommMsgExtendedDraft {
  const createdAt = options.createdAt || new Date().toISOString();
  const messageId = options.messageId || runtimeUuid('communication-message');
  const claims: Record<string, unknown> = {
    ...clone(options.claims || {}),
    '@context': 'org.hl7.fhir.api',
    [CommunicationClaim.Subject]: options.subject,
    [CommunicationClaim.Status]: options.status || 'completed',
    ...(options.sender ? { [CommunicationClaim.Sender]: options.sender } : {}),
    ...(options.recipient
      ? { [CommunicationClaim.Recipient]: normalizedRecipients(options.recipient)?.join(',') }
      : {}),
    ...(options.sent ? { [CommunicationClaim.Sent]: options.sent } : {}),
    ...(options.category ? { [CommunicationClaim.Category]: options.category } : {}),
    ...(options.noteText
      ? {
          [CommunicationClaim.NoteText]: options.noteText,
          [CommunicationClaim.Text]: options.noteText,
        }
      : {}),
  };
  const message: CommMsgExtended = {
    id: messageId,
    type: 'https://didcomm.org/v2/communication',
    thid: options.thid || runtimeUuid('communication-thread'),
    ...(options.sender ? { from: options.sender } : {}),
    ...(normalizedRecipients(options.recipient) ? { to: normalizedRecipients(options.recipient) } : {}),
    body: {
      data: [{
        id: messageId,
        type: 'Communication',
        resource: {
          resourceType: 'Communication',
          meta: { claims },
        },
      }],
    },
  };
  return Object.freeze({
    id: options.draftId || runtimeUuid('communication-draft'),
    message,
    createdAt,
    updatedAt: createdAt,
  });
}

/**
 * Serializes one FHIR resource and stores it explicitly as the canonical
 * Communication attachment claims on `resource.meta.claims`.
 */
export function attachFhirResourceAsAttachmentToCommMsgExtendedDraft(
  draft: CommMsgExtendedDraft,
  resource: Record<string, unknown>,
  options: CommMsgExtendedAttachmentOptions = {},
): CommMsgExtendedDraft {
  if (!resource || typeof resource !== 'object' || Array.isArray(resource)) {
    throw new TypeError('FHIR Communication attachment must be a resource object.');
  }
  const message = clone(draft.message);
  const emptyEntry = message.body.data.find((candidate) => {
    try {
      const candidateClaims = claimsFromEntry(candidate);
      return !candidateClaims[CommunicationClaim.ContentAttachmentData]
        && !candidateClaims[CommunicationClaim.ContentReference]
        && !candidateClaims[CommunicationClaim.ContentCode];
    } catch {
      return false;
    }
  });
  let entry = emptyEntry;
  if (!entry) {
    const baseEntry = firstCommunicationEntry(message);
    const baseClaims = clone(claimsFromEntry(baseEntry));
    delete baseClaims[CommunicationClaim.ContentAttachmentData];
    delete baseClaims[CommunicationClaim.ContentAttachmentType];
    delete baseClaims[CommunicationClaim.ContentAttachmentTitle];
    delete baseClaims[CommunicationClaim.ContentAttachmentUrl];
    delete baseClaims[CommunicationClaim.ContentReference];
    delete baseClaims[CommunicationClaim.ContentCode];
    entry = {
      id: runtimeUuid('communication-entry'),
      type: baseEntry.type,
      resource: { resourceType: 'Communication', meta: { claims: baseClaims } },
    };
    message.body.data.push(entry);
  }
  const claims = claimsFromEntry(entry);
  claims[CommunicationClaim.ContentAttachmentData] = encodeBase64Utf8(JSON.stringify(resource));
  claims[CommunicationClaim.ContentAttachmentType] = options.attachmentContentType || 'application/fhir+json';
  claims[CommunicationClaim.ContentAttachmentTitle] = options.attachmentTitle
    || `${String(resource.resourceType || 'resource').toLowerCase()}.json`;
  if (options.section !== undefined) {
    const section = String(options.section).trim();
    if (!section || section.includes(',')) {
      throw new TypeError('Section-scoped Communication attachment requires exactly one section.');
    }
    claims[CommunicationClaim.Topic] = section;
  }
  if (options.noteText) {
    claims[CommunicationClaim.NoteText] = options.noteText;
    claims[CommunicationClaim.Text] = options.noteText;
  }
  return Object.freeze({ ...draft, message, updatedAt: new Date().toISOString() });
}

/**
 * Attaches one completed Bundle as the single semantic payload of a delivery
 * Communication draft.
 *
 * The Bundle may contain one immediate edit or several edits committed
 * together. Its internal entries are not expanded into separate
 * Communications. Clinical projection and transport are selected only after
 * the draft is frozen into an outbox job.
 */
export function attachBundleToCommMsgExtendedDraft(
  draft: CommMsgExtendedDraft,
  bundle: Record<string, unknown>,
  options: CommMsgExtendedAttachmentOptions = {},
): CommMsgExtendedDraft {
  if (bundle?.resourceType !== 'Bundle') {
    throw new TypeError('Communication Bundle attachment requires resourceType=Bundle.');
  }
  return attachFhirResourceAsAttachmentToCommMsgExtendedDraft(draft, bundle, options);
}

/**
 * Attaches a complete clinical document.
 *
 * Clinical history writes use `Bundle.type=document`, with `Composition` as
 * the first entry and its `section[].entry[]` references identifying every
 * resource updated by the document.
 */
export function attachClinicalDocumentToCommMsgExtendedDraft(
  draft: CommMsgExtendedDraft,
  bundle: Record<string, unknown>,
  options: Omit<CommMsgExtendedAttachmentOptions, 'section'> = {},
): CommMsgExtendedDraft {
  const entries = Array.isArray(bundle?.entry) ? bundle.entry as Array<Record<string, unknown>> : [];
  const firstResource = entries[0]?.resource as Record<string, unknown> | undefined;
  if (
    bundle?.resourceType !== 'Bundle'
    || bundle?.type !== 'document'
    || firstResource?.resourceType !== 'Composition'
  ) {
    throw new TypeError(
      'Clinical document attachment requires Bundle.type=document with Composition as entry[0].',
    );
  }
  return attachFhirResourceAsAttachmentToCommMsgExtendedDraft(draft, bundle, options);
}

/**
 * Attaches one non-document clinical batch/collection scoped to one section.
 *
 * This is the dedicated measurement/update flow used by vital signs. It is not
 * a replacement for a Composition-first multi-section clinical document.
 */
export function attachSectionBundleToCommMsgExtendedDraft(
  draft: CommMsgExtendedDraft,
  bundle: Record<string, unknown>,
  options: CommMsgExtendedSectionBundleAttachmentOptions,
): CommMsgExtendedDraft {
  const bundleType = String(bundle?.type || '').trim();
  const entries = Array.isArray(bundle?.data)
    ? bundle.data
    : Array.isArray(bundle?.entry) ? bundle.entry : [];
  if (
    bundle?.resourceType !== 'Bundle'
    || !['batch', 'collection'].includes(bundleType)
    || entries.length === 0
  ) {
    throw new TypeError(
      'Section-scoped Communication attachment requires a non-empty Bundle.type=batch or collection.',
    );
  }
  return attachFhirResourceAsAttachmentToCommMsgExtendedDraft(draft, bundle, options);
}

/** Builds one outbox job that updates several clinical sections as one document. */
export function createClinicalSummaryUpdateOutboxJob(
  input: ClinicalUpdateCommunicationInput,
): CommMsgExtendedCommunicationOutboxJob {
  const draft = createCommMsgExtendedDraft({
    subject: input.subject,
    sender: input.sender,
    recipient: input.recipient,
    thid: input.thid,
    sent: input.sent,
    noteText: input.noteText,
  });
  return createCommunicationOutboxJobFromCommMsgExtendedDraft(
    attachClinicalDocumentToCommMsgExtendedDraft(draft, input.bundle, {
      attachmentTitle: input.attachmentTitle || 'clinical-summary-document.json',
      noteText: input.noteText,
    }),
  );
}

/** Builds one outbox job restricted to exactly one clinical section. */
export function createClinicalSectionUpdateOutboxJob(
  input: ClinicalSectionUpdateCommunicationInput,
): CommMsgExtendedCommunicationOutboxJob {
  const draft = createCommMsgExtendedDraft({
    subject: input.subject,
    sender: input.sender,
    recipient: input.recipient,
    thid: input.thid,
    sent: input.sent,
    noteText: input.noteText,
  });
  return createCommunicationOutboxJobFromCommMsgExtendedDraft(
    attachSectionBundleToCommMsgExtendedDraft(draft, input.bundle, {
      section: input.section,
      attachmentTitle: input.attachmentTitle || 'clinical-section-update.json',
      noteText: input.noteText,
    }),
  );
}

/** Freezes one canonical `CommMsgExtended` draft into a local outbox job. */
export function createCommunicationOutboxJobFromCommMsgExtendedDraft(
  draft: CommMsgExtendedDraft,
  options: CommMsgExtendedOutboxJobOptions = {},
): CommMsgExtendedCommunicationOutboxJob {
  const createdAt = options.createdAt || new Date().toISOString();
  const hasClaims = draft.message.body.data.some((entry) => {
    try {
      return Boolean(claimsFromEntry(entry)[CommunicationClaim.ContentAttachmentData]
        || claimsFromEntry(entry)[CommunicationClaim.ContentReference]
        || claimsFromEntry(entry)[CommunicationClaim.ContentCode]);
    } catch {
      return false;
    }
  });
  return Object.freeze({
    id: options.jobId || runtimeUuid('communication-job'),
    draftId: draft.id,
    thid: String(draft.message.thid || draft.message.id),
    createdAt,
    updatedAt: createdAt,
    status: options.status || (hasClaims
      ? CommunicationOutboxStatuses.Ready
      : CommunicationOutboxStatuses.Draft),
    payload: clone(draft.message),
  });
}

/** Returns true when an outbox payload is the canonical claims-first message. */
export function isCommMsgExtendedCommunicationOutboxJob(
  value: unknown,
): value is CommMsgExtendedCommunicationOutboxJob {
  if (!value || typeof value !== 'object') return false;
  const payload = (value as { payload?: unknown }).payload;
  if (!payload || typeof payload !== 'object') return false;
  return Array.isArray((payload as CommMsgExtended).body?.data);
}

/** Renders the canonical API `data[]` body without a DIDComm envelope. */
export function renderCommMsgExtendedApiBody(message: CommMsgExtended): Record<string, unknown> {
  return { data: clone(message.body.data) };
}

/** Projects canonical Communication claims into a FHIR R4 batch Bundle. */
export function renderCommMsgExtendedFhirR4Body(message: CommMsgExtended): Record<string, unknown> {
  const entries = message.body.data.map((entry) => {
    const claims = claimsFromEntry(entry);
    const transformed = transformCommunicationClaimsToResourceFhirR4([claims], { mode: 'strict' });
    return {
      request: { method: 'POST', url: 'individual/org.hl7.fhir.r4/Communication' },
      type: entry.type || 'Communication-ingestion-request-v1.0',
      resource: transformed.resources[0],
    };
  });
  return { resourceType: 'Bundle', type: 'batch', entry: entries };
}

/** Resolves built-in API/R4 rendering or delegates a sector-specific format. */
export function renderCommMsgExtendedClinicalBody(
  message: CommMsgExtended,
  clinicalFormat: string,
  formatRenderers: CommunicationClinicalFormatRenderers = {},
): Record<string, unknown> {
  const format = String(clinicalFormat || '').trim().toLowerCase();
  if (!format || format === 'api' || format === 'org.hl7.fhir.api') {
    return renderCommMsgExtendedApiBody(message);
  }
  if (format === 'r4' || format === 'fhir.r4' || format === 'org.hl7.fhir.r4') {
    return renderCommMsgExtendedFhirR4Body(message);
  }
  const extensionRenderer = formatRenderers[format];
  if (extensionRenderer) return extensionRenderer(clone(message));
  throw new Error(`Unsupported Communication clinical format '${clinicalFormat}'.`);
}
