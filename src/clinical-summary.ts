// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import {
  communication,
  type CreateSummaryOperationCommunicationInput,
} from 'gdc-common-utils-ts/utils/communication-bundle-document-request';
import {
  BundleReader,
  readFirstBundleResourceFromResponseBody,
} from 'gdc-common-utils-ts/utils/bundle-reader';
import type { TransportProfile } from './transport-profiles.js';
import type { SubmitAndPollResult } from './polling-model.js';
import {
  createCommMsgExtendedDraft,
  createCommunicationOutboxJobFromCommMsgExtendedDraft,
  type CommMsgExtendedCommunicationOutboxJob,
} from './comm-msg-extended-draft.js';
import {
  createCommunicationFacade,
  type FhirDocumentFacade,
} from './communication-document-facade.js';

/**
 * Semantic input for reading the clinical summary available to one subject.
 *
 * The request is represented by an auditable `Communication` whose
 * `content-reference` targets `Subject/$summary` and whose attachment is the
 * FHIR `Parameters` resource. It is not a clinical write or index-ingestion
 * input.
 */
export type ClinicalSummaryRequestInput = Omit<
  CreateSummaryOperationCommunicationInput,
  'subjectId' | 'requesterId'
> & Readonly<{
  subjectId: string;
  requesterId: string;
  /** Clinical representation used to render the outer Communication. */
  clinicalFormat?: string;
  /** Optional wire profile override for this read. */
  transportProfile?: TransportProfile;
  pollOptions?: { timeoutMs?: number; intervalMs?: number };
}>;

/**
 * Authoritative `$summary` operation result and two views over its same Bundle.
 *
 * - `reader` exposes generic bundle/section/reference navigation.
 * - `document` resolves native FHIR resources and combined section/type/date
 *   filters.
 * - `LifecycleResultReader` is intentionally absent because it reads command
 *   outcomes, not the contents of a clinical document.
 */
export type ClinicalSummaryReadResult = Readonly<{
  operation: SubmitAndPollResult;
  bundle: Record<string, unknown>;
  reader: BundleReader;
  document: FhirDocumentFacade;
}>;

/** Builds the transport-neutral Communication outbox job for one `$summary` read. */
export function buildClinicalSummaryCommunicationJob(
  input: ClinicalSummaryRequestInput,
): CommMsgExtendedCommunicationOutboxJob {
  const communicationClaims = communication.setRequestSummaryOperation({
    subjectId: input.subjectId,
    requesterId: input.requesterId,
    communicationIdentifier: input.communicationIdentifier,
    recipient: input.recipient,
    thid: input.thid,
    sent: input.sent,
    status: input.status,
    text: input.text,
    noteText: input.noteText,
    filterSections: input.filterSections,
    documentType: input.documentType,
    operationPath: input.operationPath,
  });
  const draft = createCommMsgExtendedDraft({
    thid: input.thid,
    subject: input.subjectId,
    sender: input.requesterId,
    recipient: input.recipient,
    sent: input.sent,
    status: input.status,
    noteText: input.noteText,
    claims: communicationClaims,
  });
  return createCommunicationOutboxJobFromCommMsgExtendedDraft(draft);
}

/**
 * Opens the authoritative FHIR document returned by a completed `$summary`
 * operation. Throws when the operation did not return a document Bundle so
 * callers cannot accidentally present an empty/local preview as GW data.
 */
export function readClinicalSummaryOperationResult(
  operation: SubmitAndPollResult,
): ClinicalSummaryReadResult {
  const bundle = readFirstBundleResourceFromResponseBody(operation.poll.body);
  if (bundle?.resourceType !== 'Bundle' || bundle.type !== 'document') {
    throw new Error('Subject/$summary did not return a FHIR document Bundle.');
  }
  return {
    operation,
    bundle,
    reader: new BundleReader(bundle),
    document: createCommunicationFacade().getFhirDocument(bundle),
  };
}
