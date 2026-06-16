import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createLicenseControllerFacade,
} from '../dist/index.js';
import {
  DeviceAppTypes,
  DeviceUserClasses,
  EXAMPLE_EMAIL_CONTROLLER_ORG,
  EXAMPLE_HEALTHCARE_ACTOR_ROLE_GENERALIST_MEDICAL_PRACTITIONER,
  EXAMPLE_LICENSE_ACTIVE_RECORD,
  EXAMPLE_LICENSE_INVOICE_ID,
  EXAMPLE_LICENSE_LIST_RESPONSE_BODY,
  EXAMPLE_LICENSE_OFFER_ID,
  EXAMPLE_LICENSE_OFFER_LIST_RESPONSE_BODY,
  EXAMPLE_LICENSE_ORDER_LIST_RESPONSE_BODY,
  LicenseEntryOperations,
  LicenseEntryTypes,
  LicenseCommercialSearchEntryType,
  LicenseStatuses,
} from '../../gdc-common-utils-ts/dist/index.js';

test('license controller facade stays thin over shared search editor and list readers', () => {
  const facade = createLicenseControllerFacade();

  const editor = facade
    .prepareSearchLicenseList()
    .setSerialNumbers([EXAMPLE_LICENSE_ACTIVE_RECORD.id])
    .setUserClass(DeviceUserClasses.Employee)
    .setAppType(DeviceAppTypes.Mobile)
    .setEmail(EXAMPLE_EMAIL_CONTROLLER_ORG)
    .setRole(EXAMPLE_HEALTHCARE_ACTOR_ROLE_GENERALIST_MEDICAL_PRACTITIONER)
    .setActive(true);

  const entry = editor.buildSearchEntry();

  assert.equal(entry.type, LicenseEntryTypes.Search);
  assert.equal(entry.meta.claims['@type'], LicenseEntryOperations.Search);
  assert.equal(entry.meta.status, LicenseStatuses.Active);

  const records = facade.readListRecords(EXAMPLE_LICENSE_LIST_RESPONSE_BODY);
  const summary = facade.readListSummary(EXAMPLE_LICENSE_LIST_RESPONSE_BODY);

  assert.equal(records.length, 2);
  assert.equal(records[0].email, EXAMPLE_EMAIL_CONTROLLER_ORG);
  assert.deepEqual(summary, {
    contracted: 2,
    free: 1,
    used: 1,
    available: 1,
    issued: 0,
    active: 1,
    inactive: 0,
  });

  const offerEntry = facade
    .prepareSearchLicenseOffer()
    .setOfferId(EXAMPLE_LICENSE_OFFER_ID)
    .buildSearchEntry();
  const orderEntry = facade
    .prepareSearchLicenseOrder()
    .setAcceptedOfferId(EXAMPLE_LICENSE_OFFER_ID)
    .setInvoiceId(EXAMPLE_LICENSE_INVOICE_ID)
    .buildSearchEntry();

  assert.equal(offerEntry.type, LicenseCommercialSearchEntryType.Offer);
  assert.equal(orderEntry.type, LicenseCommercialSearchEntryType.Order);
  assert.equal(facade.readOfferRecords(EXAMPLE_LICENSE_OFFER_LIST_RESPONSE_BODY)[0].offer.offerId, EXAMPLE_LICENSE_OFFER_ID);
  assert.equal(facade.readOrderRecords(EXAMPLE_LICENSE_ORDER_LIST_RESPONSE_BODY)[0].order.invoiceId, EXAMPLE_LICENSE_INVOICE_ID);
  assert.deepEqual(facade.readOfferSummary(EXAMPLE_LICENSE_OFFER_LIST_RESPONSE_BODY), { total: 1 });
  assert.deepEqual(facade.readOrderSummary(EXAMPLE_LICENSE_ORDER_LIST_RESPONSE_BODY), { total: 1 });
});
