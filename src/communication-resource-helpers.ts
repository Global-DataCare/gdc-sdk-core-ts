// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import {
  FhirCodeSystems,
} from 'gdc-common-utils-ts/constants/fhir-code-systems';
import {
  DocumentReferenceClaim,
} from 'gdc-common-utils-ts/models/interoperable-claims/document-reference-claims';
import {
  ResourceTypesFhirR4,
} from 'gdc-common-utils-ts/constants/fhir-resource-types';
import {
  FhirVersions,
} from 'gdc-common-utils-ts/constants/fhir-versions';

export type FhirResourceLike = Record<string, unknown>;

export type CommunicationResourceLike = FhirResourceLike & {
  resourceType: typeof ResourceTypesFhirR4.Communication;
  payload?: Array<Record<string, unknown>>;
  note?: Array<Record<string, unknown>>;
};

export type AttachmentEncodingInput = Readonly<{
  contentType?: string;
  title?: string;
  dataBase64?: string;
  url?: string;
}>;

export type CommunicationCreationOptions = Readonly<{
  subject: string;
  sender?: string;
  recipient?: string | string[];
  sent?: string;
  status?: string;
  category?: ReadonlyArray<{ system?: string; code: string }> | string[];
  /** Optional note text. In FHIR `Communication.note[].text`, markdown is allowed. */
  noteText?: string;
  claims?: Record<string, unknown>;
}>;

export type ResourceAttachmentOptions = Readonly<{
  /** Optional note text. In FHIR `Communication.note[].text`, markdown is allowed. */
  noteText?: string;
  asDocumentReference?: boolean;
  documentReferenceIdentifier?: string;
  attachmentTitle?: string;
  attachmentContentType?: string;
  documentDescription?: string;
  documentDate?: string;
  documentSubject?: string;
}>;

export type CommunicationPayloadResolution = Readonly<{
  payloadIndex: number;
  payloadType: 'attachment' | 'reference';
  documentReference?: FhirResourceLike;
  bundle?: FhirResourceLike;
  resource?: FhirResourceLike;
  noteText?: string;
}>;

export type ObservationCodeFilter = Readonly<{
  code?: string;
  codes?: string[];
}>;

export type CommunicationBatchMessageOptions = Readonly<{
  thid?: string;
  jti?: string;
  iss?: string;
  aud?: string;
  requestUrl?: string;
  entryType?: string;
  messageType?: string;
  fhirVersion?: typeof FhirVersions[keyof typeof FhirVersions];
}>;

type FhirCodingLike = Readonly<{
  system?: string;
  code: string;
}>;

function cloneRecord<T extends Record<string, unknown>>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? [...value] : [value];
}

function encodeBase64Utf8(value: string): string {
  const anyGlobal = globalThis as typeof globalThis & {
    Buffer?: { from(input: string, encoding: string): { toString(encoding: string): string } };
    btoa?: (input: string) => string;
  };
  if (anyGlobal.Buffer) {
    return anyGlobal.Buffer.from(value, 'utf8').toString('base64');
  }
  if (typeof anyGlobal.btoa === 'function') {
    const utf8 = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)));
    return anyGlobal.btoa(utf8);
  }
  throw new Error('No base64 encoder available in this runtime.');
}

function decodeBase64Utf8(value: string): string {
  const anyGlobal = globalThis as typeof globalThis & {
    Buffer?: { from(input: string, encoding: string): { toString(encoding: string): string } };
    atob?: (input: string) => string;
  };
  if (anyGlobal.Buffer) {
    return anyGlobal.Buffer.from(value, 'base64').toString('utf8');
  }
  if (typeof anyGlobal.atob === 'function') {
    const decoded = anyGlobal.atob(value);
    const percentEncoded = decoded
      .split('')
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join('');
    return decodeURIComponent(percentEncoded);
  }
  throw new Error('No base64 decoder available in this runtime.');
}

function extractCodingToken(coding: Record<string, unknown> | undefined): string | undefined {
  if (!coding) return undefined;
  const system = typeof coding.system === 'string' ? coding.system.trim() : '';
  const code = typeof coding.code === 'string' ? coding.code.trim() : '';
  if (system && code) return `${system}|${code}`;
  return code || undefined;
}

function getFirstCodingToken(value: unknown): string | undefined {
  const coding = (Array.isArray(value) ? value : [])
    .flatMap((item) => (isPlainObject(item) && Array.isArray(item.coding) ? item.coding : []))
    .find(isPlainObject);
  return extractCodingToken(coding);
}

function getCanonicalDate(resource: FhirResourceLike): string | undefined {
  const candidates = [
    resource.effectiveDateTime,
    resource.issued,
    resource.authoredOn,
    resource.performedDateTime,
    resource.recordedDate,
    resource.date,
    resource.sent,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return undefined;
}

function buildAttachmentFromResource(
  resource: FhirResourceLike,
  options: AttachmentEncodingInput = {},
): Record<string, unknown> {
  const attachment: Record<string, unknown> = {
    contentType: options.contentType || 'application/fhir+json',
  };
  if (options.title) attachment.title = options.title;
  if (options.url) attachment.url = options.url;
  if (options.dataBase64) {
    attachment.data = options.dataBase64;
  } else {
    attachment.data = encodeBase64Utf8(JSON.stringify(resource));
  }
  return attachment;
}

function parseAttachmentResource(attachment: Record<string, unknown> | undefined): FhirResourceLike | undefined {
  if (!attachment) return undefined;
  if (typeof attachment.data !== 'string' || !attachment.data.trim()) return undefined;
  try {
    const parsed = JSON.parse(decodeBase64Utf8(attachment.data));
    return isPlainObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function getPayloadAttachment(payload: Record<string, unknown>): Record<string, unknown> | undefined {
  const contentAttachment = payload.contentAttachment;
  return isPlainObject(contentAttachment) ? contentAttachment : undefined;
}

function getPayloadReference(payload: Record<string, unknown>): string | undefined {
  const contentReference = payload.contentReference;
  if (!isPlainObject(contentReference)) return undefined;
  return typeof contentReference.reference === 'string' ? contentReference.reference : undefined;
}

function getCommunicationNoteTexts(communication: CommunicationResourceLike): string[] {
  return Array.isArray(communication.note)
    ? communication.note
      .map((item) => (isPlainObject(item) && typeof item.text === 'string' ? item.text.trim() : ''))
      .filter(Boolean)
    : [];
}

function ensureCommunicationResource(communication: FhirResourceLike): CommunicationResourceLike {
  if (communication.resourceType !== ResourceTypesFhirR4.Communication) {
    throw new TypeError('Expected a FHIR Communication resource.');
  }
  return communication as CommunicationResourceLike;
}

function buildCategory(category: CommunicationCreationOptions['category']): Array<Record<string, unknown>> | undefined {
  if (!category || category.length === 0) return undefined;
  const categoryItems: Array<string | { system?: string; code: string }> = [...category];
  const codings = categoryItems
    .map((item): FhirCodingLike | undefined => {
      if (typeof item === 'string') {
        const [system, code] = item.includes('|') ? item.split('|', 2) : ['', item];
        return code ? { system: system || undefined, code } : undefined;
      }
      if (item && typeof item.code === 'string' && item.code.trim()) {
        return { system: item.system, code: item.code };
      }
      return undefined;
    })
    .filter((item): item is FhirCodingLike => Boolean(item));

  return codings.length ? [{ coding: codings }] : undefined;
}

function resolveNoteText(
  options: Readonly<{ noteText?: string }>,
): string | undefined {
  const value = typeof options.noteText === 'string' ? options.noteText.trim() : '';
  return value || undefined;
}

function appendNoteText(
  communication: CommunicationResourceLike,
  noteText: string | undefined,
): CommunicationResourceLike {
  if (!noteText || !noteText.trim()) return communication;
  const next = cloneRecord(communication);
  const notes = Array.isArray(next.note) ? [...next.note] : [];
  notes.push({ text: noteText.trim() });
  next.note = notes;
  return next;
}

function appendPayload(
  communication: CommunicationResourceLike,
  payloadEntry: Record<string, unknown>,
): CommunicationResourceLike {
  const next = cloneRecord(communication);
  const payload = Array.isArray(next.payload) ? [...next.payload] : [];
  payload.push(payloadEntry);
  next.payload = payload;
  return next;
}

/**
 * Creates a minimal FHIR `Communication` resource ready to receive payloads.
 *
 * @param options.subject Subject reference carried by `Communication.subject.reference`.
 * @param options.sender Optional sender reference.
 * @param options.recipient Optional recipient reference or references.
 * @param options.sent Optional sent timestamp.
 * @param options.status Optional FHIR communication status. Defaults to `completed`.
 * @param options.category Optional coding tokens or coding descriptors.
 * @param options.noteText Optional message note text. FHIR allows markdown here.
 * @param options.claims Optional `resource.meta.claims` payload to preserve.
 */
export function createCommunicationResource(
  options: CommunicationCreationOptions,
): CommunicationResourceLike {
  const communication: CommunicationResourceLike = {
    resourceType: ResourceTypesFhirR4.Communication,
    status: options.status || 'completed',
    subject: { reference: options.subject },
  };

  if (options.sender) communication.sender = { reference: options.sender };
  if (options.recipient) {
    communication.recipient = toArray(options.recipient).map((reference) => ({ reference }));
  }
  if (options.sent) communication.sent = options.sent;
  const category = buildCategory(options.category);
  if (category) communication.category = category;
  const noteText = resolveNoteText(options);
  if (noteText) {
    communication.note = [{ text: noteText }];
  }
  if (options.claims) {
    communication.meta = { claims: cloneRecord(options.claims) };
  }
  return communication;
}

/**
 * Wraps a FHIR `Communication` into a batch message payload suitable for
 * the legacy/FHIR ingestion routes used by the GW.
 *
 * @param communication FHIR `Communication` resource to submit.
 * @param options.thid Optional thread id for the envelope.
 * @param options.jti Optional envelope id.
 * @param options.iss Optional issuer DID.
 * @param options.aud Optional audience DID.
 * @param options.requestUrl Optional FHIR batch request URL.
 * @param options.entryType Optional business type for the batch entry.
 * @param options.messageType Optional outer message MIME type.
 * @param options.fhirVersion Optional FHIR version parameter used in the MIME type.
 */
export function buildCommunicationBatchMessage(
  communication: FhirResourceLike,
  options: CommunicationBatchMessageOptions = {},
): Record<string, unknown> {
  const communicationResource = ensureCommunicationResource(communication);
  const thid = options.thid || `communication-${Date.now()}`;
  const fhirVersion = options.fhirVersion || FhirVersions.R4;

  return {
    ...(options.jti ? { jti: options.jti } : {}),
    ...(options.iss ? { iss: options.iss } : {}),
    ...(options.aud ? { aud: options.aud } : {}),
    thid,
    type: options.messageType || `application/fhir+json; fhirVersion=${fhirVersion}`,
    body: {
      resourceType: ResourceTypesFhirR4.Bundle,
      type: 'batch',
      entry: [
        {
          request: {
            method: 'POST',
            url: options.requestUrl || `individual/org.hl7.fhir.r4/${ResourceTypesFhirR4.Communication}`,
          },
          type: options.entryType || 'Communication-ingestion-request-v1.0',
          resource: cloneRecord(communicationResource),
        },
      ],
    },
  };
}

/**
 * Adds a FHIR resource as a `Communication.payload` attachment.
 *
 * When `options.asDocumentReference` is enabled, the resource is first
 * wrapped into a FHIR `DocumentReference` whose `content.attachment`
 * contains the serialized resource.
 *
 * @param communication Target FHIR `Communication` resource.
 * @param resource FHIR resource to attach.
 * @param options.noteText Optional note text appended to `Communication.note`. FHIR allows markdown here.
 * @param options.asDocumentReference Whether to wrap the resource into `DocumentReference`.
 * @param options.documentReferenceIdentifier Optional `DocumentReference.identifier`.
 * @param options.attachmentTitle Optional attachment filename/title.
 * @param options.attachmentContentType Optional attachment MIME type.
 * @param options.documentDescription Optional `DocumentReference.description`.
 * @param options.documentDate Optional `DocumentReference.date`.
 * @param options.documentSubject Optional `DocumentReference.subject.reference`.
 */
export function addFhirResourceToCommunication(
  communication: FhirResourceLike,
  resource: FhirResourceLike,
  options: ResourceAttachmentOptions = {},
): CommunicationResourceLike {
  const nextCommunication = ensureCommunicationResource(communication);
  const subjectReference =
    options.documentSubject
    || (typeof (nextCommunication.subject as Record<string, unknown> | undefined)?.reference === 'string'
      ? String((nextCommunication.subject as Record<string, unknown>).reference)
      : undefined);

  let payloadEntry: Record<string, unknown>;
  if (options.asDocumentReference) {
    const documentReference: FhirResourceLike = {
      resourceType: ResourceTypesFhirR4.DocumentReference,
      content: [{
        attachment: buildAttachmentFromResource(resource, {
          contentType: options.attachmentContentType || 'application/fhir+json',
          title: options.attachmentTitle || `${String(resource.resourceType || 'resource').toLowerCase()}.json`,
        }),
      }],
    };
    if (subjectReference) documentReference.subject = { reference: subjectReference };
    if (options.documentDate || getCanonicalDate(resource)) {
      documentReference.date = options.documentDate || getCanonicalDate(resource);
    }
    if (options.documentDescription) documentReference.description = options.documentDescription;
    if (options.documentReferenceIdentifier) {
      documentReference.identifier = [{ value: options.documentReferenceIdentifier }];
    }
    payloadEntry = {
      contentAttachment: buildAttachmentFromResource(documentReference, {
        contentType: 'application/fhir+json',
        title: options.attachmentTitle || 'document-reference.json',
      }),
    };
  } else {
    payloadEntry = {
      contentAttachment: buildAttachmentFromResource(resource, {
        contentType: options.attachmentContentType || 'application/fhir+json',
        title: options.attachmentTitle || `${String(resource.resourceType || 'resource').toLowerCase()}.json`,
      }),
    };
  }

  return appendNoteText(appendPayload(nextCommunication, payloadEntry), resolveNoteText(options));
}

/**
 * Adds a claims-only pseudo-resource into `Communication.payload`.
 *
 * The resource is created with `resourceType` plus `resource.meta.claims`
 * and then attached using the same logic as `addFhirResourceToCommunication(...)`.
 *
 * @param communication Target FHIR `Communication` resource.
 * @param resourceType FHIR `resourceType` name to materialize.
 * @param claims Canonical interoperable claims to place under `meta.claims`.
 * @param options Attachment/document wrapping options.
 */
export function addClaimsResourceToCommunication(
  communication: FhirResourceLike,
  resourceType: string,
  claims: Record<string, unknown>,
  options: ResourceAttachmentOptions = {},
): CommunicationResourceLike {
  const resource: FhirResourceLike = {
    resourceType,
    meta: {
      claims: cloneRecord(claims),
    },
  };
  return addFhirResourceToCommunication(communication, resource, options);
}

/**
 * Resolves every `Communication.payload[]` entry into a normalized shape.
 *
 * The resolver abstracts:
 * - direct resource attachment
 * - embedded `DocumentReference`
 * - embedded `Bundle document`
 * - best-effort note text associated to the payload slot
 *
 * @param communication FHIR `Communication` resource to inspect.
 */
export function resolveCommunicationPayloads(
  communication: FhirResourceLike,
): CommunicationPayloadResolution[] {
  const communicationResource = ensureCommunicationResource(communication);
  const payload = Array.isArray(communicationResource.payload) ? communicationResource.payload : [];
  const noteTexts = getCommunicationNoteTexts(communicationResource);

  return payload.map((item, index) => {
    const payloadEntry = isPlainObject(item) ? item : {};
    const attachment = getPayloadAttachment(payloadEntry);
    const directResource = parseAttachmentResource(attachment);

    if (directResource?.resourceType === ResourceTypesFhirR4.DocumentReference) {
      const documentReference = directResource as FhirResourceLike & { content?: unknown[] };
      const contentEntries = Array.isArray(documentReference.content)
        ? documentReference.content
        : [];
      const innerAttachment = contentEntries.length
        ? contentEntries
          .map((contentItem) => (isPlainObject(contentItem) ? contentItem.attachment : undefined))
          .find(isPlainObject)
        : undefined;
      const innerResource = parseAttachmentResource(innerAttachment);
      return {
        payloadIndex: index,
        payloadType: attachment ? 'attachment' : 'reference',
        documentReference,
        bundle: innerResource?.resourceType === ResourceTypesFhirR4.Bundle ? innerResource : undefined,
        resource: innerResource,
        noteText: noteTexts[index] || noteTexts[0],
      };
    }

    return {
      payloadIndex: index,
      payloadType: attachment ? 'attachment' : 'reference',
      bundle: directResource?.resourceType === ResourceTypesFhirR4.Bundle ? directResource : undefined,
      resource: directResource,
      noteText: noteTexts[index] || noteTexts[0],
      ...(getPayloadReference(payloadEntry) ? { documentReference: { reference: getPayloadReference(payloadEntry) } } : {}),
    };
  });
}

/**
 * Returns the first FHIR `Bundle document` reachable from a `Communication`.
 *
 * It transparently supports direct bundle attachments and bundles wrapped
 * inside `DocumentReference.content.attachment`.
 *
 * @param communication FHIR `Communication` resource to inspect.
 */
export function getFirstBundleDocumentFromCommunication(
  communication: FhirResourceLike,
): FhirResourceLike | undefined {
  return resolveCommunicationPayloads(communication).find((entry) => entry.bundle)?.bundle;
}

/**
 * Extracts concrete FHIR resources from a `Bundle.entry[].resource` list.
 *
 * @param bundle FHIR `Bundle` document.
 */
export function getBundleDocumentEntries(
  bundle: FhirResourceLike | undefined,
): FhirResourceLike[] {
  if (!bundle || bundle.resourceType !== ResourceTypesFhirR4.Bundle || !Array.isArray(bundle.entry)) return [];
  return bundle.entry
    .map((entry) => (isPlainObject(entry) && isPlainObject(entry.resource) ? entry.resource : undefined))
    .filter((resource): resource is FhirResourceLike => Boolean(resource));
}

/**
 * Returns bundle resources filtered by `resourceType`.
 *
 * @param bundle FHIR `Bundle` document.
 * @param resourceType FHIR `resourceType` name to keep.
 */
export function getBundleDocumentResourcesByType(
  bundle: FhirResourceLike | undefined,
  resourceType: string,
): FhirResourceLike[] {
  return getBundleDocumentEntries(bundle).filter((resource) => resource.resourceType === resourceType);
}

/**
 * Extracts `MedicationStatement.meta.claims` rows from the first document
 * bundle found inside a `Communication`.
 *
 * @param communication FHIR `Communication` resource to inspect.
 */
export function getMedicationClaimsFromCommunicationDocument(
  communication: FhirResourceLike,
): Record<string, unknown>[] {
  const bundle = getFirstBundleDocumentFromCommunication(communication);
  return getBundleDocumentResourcesByType(bundle, ResourceTypesFhirR4.MedicationStatement)
    .map((resource) => (isPlainObject(resource.meta) && isPlainObject(resource.meta.claims)
      ? cloneRecord(resource.meta.claims)
      : {}))
    .filter((claims) => Object.keys(claims).length > 0);
}

/**
 * Extracts `DocumentReference.meta.claims` rows from the first document
 * bundle found inside a `Communication`.
 *
 * Falls back to a minimal structural projection when `meta.claims` is absent.
 *
 * @param communication FHIR `Communication` resource to inspect.
 */
export function getDocumentReferenceClaimsFromCommunicationDocument(
  communication: FhirResourceLike,
): Record<string, unknown>[] {
  const bundle = getFirstBundleDocumentFromCommunication(communication);
  return getBundleDocumentResourcesByType(bundle, ResourceTypesFhirR4.DocumentReference)
    .map((resource) => {
      if (isPlainObject(resource.meta) && isPlainObject(resource.meta.claims)) {
        return cloneRecord(resource.meta.claims);
      }
      return extractDocumentReferenceClaims(resource);
    })
    .filter((claims) => Object.keys(claims).length > 0);
}

/**
 * Returns `DocumentReference` claims rows filtered by logical identifier.
 *
 * @param communication FHIR `Communication` resource to inspect.
 * @param identifiers One or more `DocumentReference.identifier` values.
 */
export function getDocumentReferenceClaimsByIdentifiersFromCommunicationDocument(
  communication: FhirResourceLike,
  identifiers: string | string[],
): Record<string, unknown>[] {
  const accepted = new Set(
    toArray(identifiers)
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  );
  if (!accepted.size) {
    return [];
  }
  return getDocumentReferenceClaimsFromCommunicationDocument(communication)
    .filter((claims) => accepted.has(String(claims[DocumentReferenceClaim.Identifier] || '').trim()));
}

/**
 * TODO(ips-next):
 * Add `getDiagnosticReportClaimsFromCommunicationDocument(...)` after
 * `common-utils` exposes the finalized DiagnosticReport claim helpers and
 * bundle-editor upsert contract.
 *
 * Keep this aligned with shared claim keys from `gdc-common-utils-ts` and do
 * not invent repo-local literals for `presented-form-*` or
 * `contained-documents`.
 */

/**
 * Sorts FHIR resources by their first canonical clinical date descending.
 *
 * The helper inspects common date fields such as `effectiveDateTime`,
 * `issued`, `authoredOn`, `performedDateTime`, `recordedDate`, `date`, and `sent`.
 *
 * @param resources Resources to sort.
 */
export function sortFhirResourcesByDateDescending<T extends FhirResourceLike>(resources: T[]): T[] {
  return [...resources].sort((left, right) => {
    const leftDate = getCanonicalDate(left) || '';
    const rightDate = getCanonicalDate(right) || '';
    return rightDate.localeCompare(leftDate);
  });
}

/**
 * Returns `Observation` resources from a communication document filtered by code.
 *
 * Accepted filter values may be bare codes or `<system>|<code>` tokens.
 *
 * @param communication FHIR `Communication` resource to inspect.
 * @param filter.code Optional single code filter.
 * @param filter.codes Optional list of accepted codes.
 */
export function getObservationsByCodeFromCommunicationDocument(
  communication: FhirResourceLike,
  filter: ObservationCodeFilter,
): FhirResourceLike[] {
  const accepted = new Set(
    [filter.code, ...(filter.codes || [])]
      .filter((value): value is string => Boolean(value && value.trim()))
      .map((value) => value.trim()),
  );
  const bundle = getFirstBundleDocumentFromCommunication(communication);
  const observations = getBundleDocumentResourcesByType(bundle, ResourceTypesFhirR4.Observation);
  if (!accepted.size) return observations;

  return observations.filter((resource) => {
    const codeToken = getFirstCodingToken((resource.code as Record<string, unknown> | undefined)?.coding ? [{ coding: (resource.code as Record<string, unknown>).coding }] : []);
    const categoryToken = getFirstCodingToken(resource.category);
    return Boolean(
      (codeToken && accepted.has(codeToken))
      || (codeToken && accepted.has(codeToken.split('|').pop() || ''))
      || (categoryToken && accepted.has(categoryToken)),
    );
  });
}

function extractDocumentReferenceClaims(resource: FhirResourceLike): Record<string, unknown> {
  const attachment = Array.isArray(resource.content)
    ? resource.content
      .map((item) => (isPlainObject(item) && isPlainObject(item.attachment) ? item.attachment : undefined))
      .find(isPlainObject)
    : undefined;

  const identifier = Array.isArray(resource.identifier) && isPlainObject(resource.identifier[0])
    ? resource.identifier[0].value
    : undefined;
  const subject = isPlainObject(resource.subject) ? resource.subject.reference : undefined;

  return {
    [DocumentReferenceClaim.Identifier]: typeof identifier === 'string' ? identifier : undefined,
    [DocumentReferenceClaim.Subject]: typeof subject === 'string' ? subject : undefined,
    [DocumentReferenceClaim.Description]: typeof resource.description === 'string' ? resource.description : undefined,
    [DocumentReferenceClaim.Date]: typeof resource.date === 'string' ? resource.date : undefined,
    [DocumentReferenceClaim.ContentType]: typeof attachment?.contentType === 'string' ? attachment.contentType : undefined,
    [DocumentReferenceClaim.ContentData]: typeof attachment?.data === 'string' ? attachment.data : undefined,
    [DocumentReferenceClaim.Location]: typeof attachment?.url === 'string' ? attachment.url : undefined,
    [DocumentReferenceClaim.ContentHash]: typeof attachment?.hash === 'string' ? attachment.hash : undefined,
    [DocumentReferenceClaim.Language]: typeof attachment?.language === 'string' ? attachment.language : undefined,
  };
}
