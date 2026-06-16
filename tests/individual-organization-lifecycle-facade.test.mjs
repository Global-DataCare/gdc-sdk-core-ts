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
  EXAMPLE_INDIVIDUAL_DISABLE_MESSAGE,
  EXAMPLE_INDIVIDUAL_ORGANIZATION_DISABLE_REQUEST_TYPE,
  EXAMPLE_INDIVIDUAL_ORGANIZATION_PURGE_REQUEST_TYPE,
  EXAMPLE_LIFECYCLE_PLACEHOLDERS,
} from '../../gdc-common-utils-ts/dist/examples/index.js';

test('individual organization lifecycle facade stays thin over shared editor and result readers', () => {
  const facade = createIndividualOrganizationLifecycleFacade();

  const disableEditor = facade
    .prepareLifecycleIndividualOrganizationDisable()
    .setRequestType(EXAMPLE_INDIVIDUAL_ORGANIZATION_DISABLE_REQUEST_TYPE);

  facade.setIdentifier(disableEditor, 'urn:uuid:individual-organization-1');
  facade.setAlternateName(
    disableEditor,
    String(EXAMPLE_INDIVIDUAL_DISABLE_MESSAGE.claims[ClaimsOrganizationSchemaorg.alternateName]),
  );
  facade.setOwnerEmail(disableEditor, EXAMPLE_EMAIL_CONTROLLER_INDIVIDUAL);
  facade.setResourceId(disableEditor, EXAMPLE_LIFECYCLE_PLACEHOLDERS.individualIdentifier);

  const disablePayload = disableEditor.buildCurrentGwPayload();

  assert.equal(disableEditor.getState().operation, IndividualOrganizationLifecycleOperations.Disable);
  assert.equal(facade.getIdentifier(disableEditor), 'urn:uuid:individual-organization-1');
  assert.equal(
    facade.getAlternateName(disableEditor),
    EXAMPLE_INDIVIDUAL_DISABLE_MESSAGE.claims[ClaimsOrganizationSchemaorg.alternateName],
  );
  assert.equal(facade.getOwnerEmail(disableEditor), EXAMPLE_EMAIL_CONTROLLER_INDIVIDUAL);
  assert.equal(disablePayload.body.data[0].type, EXAMPLE_INDIVIDUAL_ORGANIZATION_DISABLE_REQUEST_TYPE);
  assert.equal(
    disablePayload.body.data[0].resource.meta.claims[ClaimsOrganizationSchemaorg.identifier],
    'urn:uuid:individual-organization-1',
  );
  assert.equal(
    disablePayload.body.data[0].resource.meta.claims[ClaimsOrganizationSchemaorg.ownerEmail],
    EXAMPLE_EMAIL_CONTROLLER_INDIVIDUAL,
  );

  const purgeEditor = facade
    .prepareLifecycleIndividualOrganizationPurge()
    .setRequestType(EXAMPLE_INDIVIDUAL_ORGANIZATION_PURGE_REQUEST_TYPE);

  facade.mergeClaims(purgeEditor, {
    [ClaimsOrganizationSchemaorg.identifier]: 'urn:uuid:individual-organization-2',
  });

  assert.equal(purgeEditor.getState().operation, IndividualOrganizationLifecycleOperations.Purge);

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
