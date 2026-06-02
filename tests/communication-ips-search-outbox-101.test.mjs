import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ResourceTypesFhirR4,
} from '../../gdc-common-utils-ts/dist/constants/fhir-resource-types.js';
import { CommunicationClaim } from '../../gdc-common-utils-ts/dist/models/interoperable-claims/communication-claims.js';
import {
  communication,
  createSummaryOperationRequestParameters,
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
  getCommunicationFromDraft,
  isCommunicationDraftReady,
  resolveCommunicationPayloads,
} from '../dist/index.js';

test('101: IPS search Communication becomes a draft and outbox job', () => {
  const summaryOperationRequestParameters =
    createSummaryOperationRequestParameters(EXAMPLE_SUBJECT_DID);

  const summaryOperationRequestReferencePath =
    createSummaryOperationRequestReferencePath(summaryOperationRequestParameters);

  const summaryOperationRequestReferenceUrl =
    createSummaryOperationRequestReferenceUrl({
      providerSectorDidWeb: EXAMPLE_INDEX_PROVIDER_SECTOR_DID_WEB,
      summaryOperationRequestReferencePath,
    });

  const communicationClaims = communication.newIpsSummarySearchCommunication({
    subjectId: EXAMPLE_SUBJECT_DID,
    requesterId: EXAMPLE_PROFESSIONAL_DID,
  });

  const draft = addClaimsResourceToDraft(
    createCommunicationDraft({
      subject: EXAMPLE_SUBJECT_DID,
      sender: EXAMPLE_PROFESSIONAL_DID,
      recipient: EXAMPLE_INDEX_PROVIDER_SECTOR_DID_WEB,
    }),
    ResourceTypesFhirR4.Communication,
    communicationClaims,
  );

  const job = createOutboxJobFromDraft(draft);
  const draftCommunication = getCommunicationFromDraft(draft);
  const resolvedPayloads = resolveCommunicationPayloads(draftCommunication);
  const embeddedSearchCommunication = resolvedPayloads[0]?.resource;

  assert.equal(summaryOperationRequestReferencePath, EXAMPLE_IPS_BUNDLE_REFERENCE_URL);
  assert.equal(summaryOperationRequestReferenceUrl, EXAMPLE_IPS_BUNDLE_REFERENCE_ABSOLUTE_URL);
  assert.equal(
    communicationClaims[CommunicationClaim.ContentReference],
    EXAMPLE_IPS_BUNDLE_REFERENCE_URL,
  );
  assert.equal(isCommunicationDraftReady(draft), true);
  assert.equal(draftCommunication.resourceType, ResourceTypesFhirR4.Communication);
  assert.equal(Array.isArray(draftCommunication.payload), true);
  assert.equal(draftCommunication.recipient?.[0]?.reference, EXAMPLE_INDEX_PROVIDER_SECTOR_DID_WEB);
  assert.equal(embeddedSearchCommunication?.resourceType, ResourceTypesFhirR4.Communication);
  assert.equal(
    embeddedSearchCommunication?.meta?.claims?.[CommunicationClaim.ContentReference],
    EXAMPLE_IPS_BUNDLE_REFERENCE_URL,
  );
  assert.equal(job.status, CommunicationOutboxStatuses.Ready);
  assert.equal(job.payload.resourceType, ResourceTypesFhirR4.Communication);
  assert.equal(
    job.envelope?.body?.entry?.[0]?.request?.url,
    `individual/org.hl7.fhir.r4/${ResourceTypesFhirR4.Communication}`,
  );
});
