// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import {
  LicenseListSearchEditor,
  type LicenseListSearchState,
  type LicenseListRecord,
  type LicenseListSummary,
  readLicenseListRecords,
  summarizeLicenseListRecords,
} from 'gdc-common-utils-ts/utils/license-list-search';
import {
  LicenseOfferSearchEditor,
  LicenseOrderSearchEditor,
  type LicenseOfferSearchState,
  type LicenseOrderSearchState,
  type LicenseOfferRecord,
  type LicenseOrderRecord,
  readLicenseOfferRecords,
  readLicenseOrderRecords,
  summarizeLicenseOfferRecords,
  summarizeLicenseOrderRecords,
} from 'gdc-common-utils-ts/utils/license-commercial-search';

export type LicenseControllerQueryInput = Partial<LicenseListSearchState>;
export type LicenseOfferControllerQueryInput = Partial<LicenseOfferSearchState>;
export type LicenseOrderControllerQueryInput = Partial<LicenseOrderSearchState>;

/**
 * Runtime-neutral high-level surface for license table filters and list
 * readback.
 */
export interface LicenseControllerFacade {
  /**
   * Starts one semantic search editor for frontend/BFF code.
   */
  prepareSearchLicenseList(initial?: LicenseControllerQueryInput): LicenseListSearchEditor;
  /**
   * Starts one semantic commercial-offer search editor for portal/BFF list
   * screens.
   */
  prepareSearchLicenseOffer(initial?: LicenseOfferControllerQueryInput): LicenseOfferSearchEditor;
  /**
   * Starts one semantic commercial-order search editor for portal/BFF list
   * screens.
   */
  prepareSearchLicenseOrder(initial?: LicenseOrderControllerQueryInput): LicenseOrderSearchEditor;
  /**
   * Normalizes one raw runtime response into list rows safe for UI use.
   */
  readListRecords(body: unknown): LicenseListRecord[];
  /**
   * Derives table counters from the same shared normalized response contract.
   */
  readListSummary(body: unknown): LicenseListSummary;
  /**
   * Normalizes one raw offer search/list response into UI-safe rows.
   */
  readOfferRecords(body: unknown): LicenseOfferRecord[];
  /**
   * Normalizes one raw order/payment search/list response into UI-safe rows.
   */
  readOrderRecords(body: unknown): LicenseOrderRecord[];
  /**
   * Derives a tiny aggregate for offer result sets.
   */
  readOfferSummary(body: unknown): Readonly<{ total: number }>;
  /**
   * Derives a tiny aggregate for order result sets.
   */
  readOrderSummary(body: unknown): Readonly<{ total: number }>;
}

/**
 * Runtime-neutral facade for portal/backend license list/search preparation and
 * readback.
 *
 * This intentionally stops short of defining transport/runtime routes.
 * Current GW exposes the underlying `device-licenses` source internally, but a
 * converged public SDK/GW route for `licenses.list/search` is still pending.
 */
export function createLicenseControllerFacade(): LicenseControllerFacade {
  return {
    prepareSearchLicenseList(initial = {}) {
      return new LicenseListSearchEditor(initial);
    },
    prepareSearchLicenseOffer(initial = {}) {
      return new LicenseOfferSearchEditor(initial);
    },
    prepareSearchLicenseOrder(initial = {}) {
      return new LicenseOrderSearchEditor(initial);
    },
    readListRecords(body) {
      return readLicenseListRecords(body);
    },
    readListSummary(body) {
      return summarizeLicenseListRecords(body);
    },
    readOfferRecords(body) {
      return readLicenseOfferRecords(body);
    },
    readOrderRecords(body) {
      return readLicenseOrderRecords(body);
    },
    readOfferSummary(body) {
      return summarizeLicenseOfferRecords(body);
    },
    readOrderSummary(body) {
      return summarizeLicenseOrderRecords(body);
    },
  };
}
