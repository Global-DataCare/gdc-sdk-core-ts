/**
 * 101 note:
 * - `gdc-common-utils-ts` owns the canonical communication/search authoring editors/readers.
 * - This file starts after that shared authoring step and teaches the highest-level runtime-neutral `sdk-core` outbox surface.
 * - Do not make concrete wallet/profile transport or submit/poll runtime the main path here.
 * - Read `docs/101-README.md` for the ordered path, then continue upward into `gdc-sdk-node-ts` or `gdc-sdk-front-ts`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ResourceTypesFhirR4,
} from '../../gdc-common-utils-ts/dist/constants/fhir-resource-types.js';
import { CommunicationClaim } from '../../gdc-common-utils-ts/dist/models/interoperable-claims/communication-claims.js';
import {
  communication,
  createSummaryOperationRequestParameters,
  createSummaryOperationRequestParametersResource,
  createSummaryOperationRequestReferencePath,
  createSummaryOperationRequestReferenceUrl,
} from '../../gdc-common-utils-ts/dist/utils/communication-bundle-document-request.js';
import {
  EXAMPLE_INDEX_PROVIDER_SECTOR_DID_WEB,
  EXAMPLE_IPS_BUNDLE_REFERENCE_ABSOLUTE_URL,
  EXAMPLE_IPS_BUNDLE_REFERENCE_URL,
  EXAMPLE_PROFESSIONAL_DID,
  EXAMPLE_SUBJECT_DID,
} from '../../gdc-common-utils-ts/dist/examples/shared.js';
import {
  CommunicationOutboxStatuses,
  addClaimsResourceToDraft,
  createCommunicationDraft,
  createOutboxJobFromDraft,
  isCommunicationDraftReady,
} from '../dist/index.js';

test('101: IPS search Communication becomes a draft and outbox job', () => {
  // Canonical boundary:
  // - health-document authoring itself is taught in common-utils:
  //   `101-communication-medication-document.test.ts`
  // - DIDComm/plain readback is taught in:
  //   `101-communication-profile-wallet-e2e.test.ts`
  // - this file starts later, once one business Communication already exists
  //   and must be staged into one runtime-neutral draft/outbox job.

  // Step 1.
  // The requester already knows which individual summary is being requested.
  const summaryOperationRequestParameters =
    createSummaryOperationRequestParameters(EXAMPLE_SUBJECT_DID);

  // Step 2.
  // common-utils first defines the semantic IPS request parameters.
  // Those parameters are the source of truth, regardless of how the request
  // will later travel.
  const summaryOperationRequestParametersResource =
    createSummaryOperationRequestParametersResource(summaryOperationRequestParameters);

  // Step 3.
  // current Communication flows keep the search reference separate from the
  // document bundle story. The relative path later lives in
  // Communication.content-reference, while the search semantics stay in the
  // FHIR search-param story.
  const summaryOperationRequestReferencePath =
    createSummaryOperationRequestReferencePath(summaryOperationRequestParameters);

  // Step 4.
  // Runtime/backend may also need the absolute GW CORE URL that will receive
  // the request, but that URL is not the main thing the frontend edits.
  const summaryOperationRequestReferenceUrl =
    createSummaryOperationRequestReferenceUrl({
      providerSectorDidWeb: EXAMPLE_INDEX_PROVIDER_SECTOR_DID_WEB,
      summaryOperationRequestReferencePath,
    });

  // Step 5.
  // common-utils builds the auditable Communication claims that carry the IPS
  // request envelope.
  const communicationClaims = communication.newIpsSummarySearchCommunication({
    subjectId: EXAMPLE_SUBJECT_DID,
    requesterId: EXAMPLE_PROFESSIONAL_DID,
  });

  // Step 6.
  // sdk-core receives that already-built Communication and stages it in a
  // draft for transport/runtime layers.
  const draft = addClaimsResourceToDraft(
    createCommunicationDraft({
      subject: EXAMPLE_SUBJECT_DID,
      sender: EXAMPLE_PROFESSIONAL_DID,
      recipient: EXAMPLE_INDEX_PROVIDER_SECTOR_DID_WEB,
    }),
    ResourceTypesFhirR4.Communication,
    communicationClaims,
  );

  // Step 7.
  // sdk-core freezes the draft into the outbox job that runtime layers will
  // actually send.
  const job = createOutboxJobFromDraft(draft);

  // Step 8.
  // Assertions:
  // - the semantic request can be rendered as FHIR Parameters
  // - the current Communication flow still carries a relative `_search?...`
  //   reference
  // - sdk-core preserves that request envelope unchanged in the outbox
  assert.equal(summaryOperationRequestReferencePath, EXAMPLE_IPS_BUNDLE_REFERENCE_URL);
  assert.equal(summaryOperationRequestReferenceUrl, EXAMPLE_IPS_BUNDLE_REFERENCE_ABSOLUTE_URL);
  assert.equal(summaryOperationRequestParametersResource.resourceType, 'Parameters');
  assert.equal(
    communicationClaims[CommunicationClaim.ContentReference],
    EXAMPLE_IPS_BUNDLE_REFERENCE_URL,
  );
  assert.equal(isCommunicationDraftReady(draft), true);
  assert.equal(job.status, CommunicationOutboxStatuses.Ready);
  assert.equal(job.payload.resourceType, ResourceTypesFhirR4.Communication);
  assert.equal(
    typeof job.payload.payload?.[0]?.contentAttachment?.data === 'string',
    true,
  );
  assert.equal(
    job.envelope?.body?.entry?.[0]?.request?.url,
    `individual/org.hl7.fhir.r4/${ResourceTypesFhirR4.Communication}`,
  );
});
