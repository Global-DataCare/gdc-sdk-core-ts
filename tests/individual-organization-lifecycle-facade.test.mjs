import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createIndividualOrganizationLifecycleFacade,
  IndividualOrganizationLifecycleOperations,
} from '../dist/index.js';
import {
  ClaimsOrganizationSchemaorg,
} from '../../gdc-common-utils-ts/dist/constants/schemaorg.js';
import {
  EXAMPLE_EMAIL_CONTROLLER_INDIVIDUAL,
  EXAMPLE_INDIVIDUAL_ORGANIZATION_DISABLE_REQUEST_TYPE,
  EXAMPLE_INDIVIDUAL_ORGANIZATION_PURGE_REQUEST_TYPE,
  EXAMPLE_LIFECYCLE_PLACEHOLDERS,
} from '../../gdc-common-utils-ts/dist/examples/index.js';

test('individual organization lifecycle facade stays thin over shared draft and result readers', () => {
  const facade = createIndividualOrganizationLifecycleFacade();

  const disableDraft = facade
    .createDisableDraft()
    .setRequestType(EXAMPLE_INDIVIDUAL_ORGANIZATION_DISABLE_REQUEST_TYPE);

  facade.setIdentifier(disableDraft, 'urn:uuid:individual-organization-1');
  facade.setOwnerEmail(disableDraft, EXAMPLE_EMAIL_CONTROLLER_INDIVIDUAL);
  facade.setResourceId(disableDraft, EXAMPLE_LIFECYCLE_PLACEHOLDERS.individualIdentifier);

  const disablePayload = disableDraft.buildCurrentGwPayload();

  assert.equal(disableDraft.getDraft().operation, IndividualOrganizationLifecycleOperations.Disable);
  assert.equal(disablePayload.body.data[0].type, EXAMPLE_INDIVIDUAL_ORGANIZATION_DISABLE_REQUEST_TYPE);
  assert.equal(
    disablePayload.body.data[0].resource.meta.claims[ClaimsOrganizationSchemaorg.identifier],
    'urn:uuid:individual-organization-1',
  );
  assert.equal(
    disablePayload.body.data[0].resource.meta.claims[ClaimsOrganizationSchemaorg.ownerEmail],
    EXAMPLE_EMAIL_CONTROLLER_INDIVIDUAL,
  );

  const purgeDraft = facade
    .createPurgeDraft()
    .setRequestType(EXAMPLE_INDIVIDUAL_ORGANIZATION_PURGE_REQUEST_TYPE);

  facade.mergeClaims(purgeDraft, {
    [ClaimsOrganizationSchemaorg.identifier]: 'urn:uuid:individual-organization-2',
  });

  assert.equal(purgeDraft.getDraft().operation, IndividualOrganizationLifecycleOperations.Purge);

  const lifecycleResult = facade.readLifecycleResult({
    body: {
      data: [
        {
          resource: {
            meta: {
              claims: {
                '@context': 'org.schema',
                [ClaimsOrganizationSchemaorg.identifier]: 'urn:uuid:individual-organization-2',
              },
            },
          },
          response: {
            status: '200',
          },
        },
      ],
    },
  });

  assert.deepEqual(lifecycleResult.getSuccessfulIdentifiers(), ['urn:uuid:individual-organization-2']);
  assert.equal(lifecycleResult.getFailedIdentifiers().length, 0);
});
