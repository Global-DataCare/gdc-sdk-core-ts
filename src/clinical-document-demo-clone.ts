// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

export type DemoClinicalDocumentResourceIdContext = Readonly<{
  resourceType: string;
  originalId: string;
  entryIndex: number;
}>;

export type CloneImportedClinicalDocumentForDemoInput = Readonly<{
  bundle: Record<string, unknown>;
  /**
   * Operational `actorDid` returned by the authenticated SDK profile/session;
   * never a stable multibase URN or a DID/alias owned by a portal.
   */
  authenticatedActorDid: string;
  /** Optional deterministic factory for tests or a caller-owned demo namespace. */
  createResourceId?: (context: DemoClinicalDocumentResourceIdContext) => string;
}>;

function defaultResourceId(): string {
  const value = globalThis.crypto?.randomUUID?.();
  if (!value) {
    throw new Error('Demo clinical document cloning requires crypto.randomUUID or createResourceId.');
  }
  return value;
}

function cloneJson<T>(value: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;
}

function rewriteReferences(value: unknown, referenceMap: ReadonlyMap<string, string>): void {
  if (Array.isArray(value)) {
    value.forEach((entry) => rewriteReferences(entry, referenceMap));
    return;
  }
  if (!value || typeof value !== 'object') return;
  const record = value as Record<string, unknown>;
  if (typeof record.reference === 'string') {
    record.reference = referenceMap.get(record.reference) || record.reference;
  }
  Object.values(record).forEach((entry) => rewriteReferences(entry, referenceMap));
}

/**
 * Creates an editable demo copy of an imported FHIR document.
 *
 * The original Bundle is never mutated. Every resource receives a new logical
 * id, internal references are rewritten, and the cloned Composition is owned
 * by the authenticated local actor. Source business identifiers and clinical
 * content remain intact so the copy retains its imported provenance without
 * pretending that the local actor authored the source document. The helper
 * sets only the editable copy's `Composition.author`; direct update callers
 * separately pass the same profile `actorDid` as `sender` and the real hosted
 * provider-tenant DID as `recipient`.
 */
export function cloneImportedClinicalDocumentForDemo(
  input: CloneImportedClinicalDocumentForDemoInput,
): Record<string, any> {
  const bundle = input.bundle as Record<string, any>;
  const entries = Array.isArray(bundle?.entry) ? bundle.entry : [];
  if (
    bundle?.resourceType !== 'Bundle'
    || bundle?.type !== 'document'
    || entries[0]?.resource?.resourceType !== 'Composition'
  ) {
    throw new TypeError(
      'Demo clinical document cloning requires Bundle.type=document with Composition as entry[0].',
    );
  }

  const actorDid = String(input.authenticatedActorDid || '').trim();
  if (!actorDid.startsWith('did:web:')) {
    throw new TypeError('Demo clinical document cloning requires the authenticated actor did:web from the SDK profile.');
  }

  const cloned = cloneJson(bundle);
  const referenceMap = new Map<string, string>();
  const generatedIds = new Set<string>();

  cloned.entry.forEach((entry: Record<string, any>, entryIndex: number) => {
    const resource = entry?.resource;
    const resourceType = String(resource?.resourceType || '').trim();
    if (!resourceType) {
      throw new TypeError('Every demo clinical document entry requires resource.resourceType.');
    }
    const originalId = String(resource?.id || `${resourceType}-${entryIndex}`).trim();
    const generatedId = String(input.createResourceId?.({ resourceType, originalId, entryIndex })
      || defaultResourceId()).trim();
    if (!/^[A-Za-z0-9\-.]{1,64}$/.test(generatedId) || generatedIds.has(generatedId)) {
      throw new TypeError('Demo clinical document resource ids must be unique valid FHIR logical ids.');
    }
    generatedIds.add(generatedId);

    if (resource?.id) {
      referenceMap.set(`${resourceType}/${resource.id}`, `${resourceType}/${generatedId}`);
      referenceMap.set(`urn:uuid:${resource.id}`, `urn:uuid:${generatedId}`);
    }
    if (typeof entry.fullUrl === 'string' && entry.fullUrl.trim()) {
      const rewrittenFullUrl = `urn:uuid:${generatedId}`;
      referenceMap.set(entry.fullUrl, rewrittenFullUrl);
      entry.fullUrl = rewrittenFullUrl;
    }
    resource.id = generatedId;
  });

  rewriteReferences(cloned, referenceMap);
  cloned.entry[0].resource.author = [{ reference: actorDid }];
  return cloned;
}
