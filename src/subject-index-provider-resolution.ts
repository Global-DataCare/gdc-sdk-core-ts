// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import type { SubjectIdentifierLedgerPayload } from 'gdc-common-utils-ts/models/subject-identifier-ledger';
import {
  buildSubjectIdentifierAssetId,
  readSubjectIdentifierLedgerPayload,
} from 'gdc-common-utils-ts/utils/subject-identity';

/** One governed identifier already known to the requesting application. */
export type SubjectIndexProviderLookupInput = Readonly<{
  codingSystem: string;
  jurisdiction: string;
  value: string;
}>;

/** Runtime port implemented by the transport that reads the public ledger. */
export interface SubjectIdentifierLedgerReader {
  readSubjectIdentifier(subjectLookupAssetId: string): Promise<SubjectIdentifierLedgerPayload | unknown>;
}

/** Public discovery result. It contains no subject/card or authorization data. */
export type SubjectIndexProviderResolution = Readonly<{
  subjectLookupAssetId: string;
  indexProviderDid: string;
}>;

/**
 * Resolves the provider that owns a subject's protected index.
 *
 * This is only the first discovery boundary. The caller resolves the returned
 * `did:web` and uses the provider's protected PDQm/FHIR facade to match
 * the known identifier. Authorization remains a separate operation.
 */
export async function resolveSubjectIndexProvider(
  input: SubjectIndexProviderLookupInput,
  dependencies: Readonly<{ ledger: SubjectIdentifierLedgerReader }>,
): Promise<SubjectIndexProviderResolution> {
  const subjectLookupAssetId = buildSubjectIdentifierAssetId({
    codingSystem: input.codingSystem,
    jurisdiction: input.jurisdiction,
    codeValue: input.value,
  });
  const payload = await dependencies.ledger.readSubjectIdentifier(subjectLookupAssetId);
  return {
    subjectLookupAssetId,
    indexProviderDid: readSubjectIdentifierLedgerPayload(payload),
  };
}
