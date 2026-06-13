// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import {
  LicenseListSearchEditor,
  type LicenseListSearchDraft,
  type LicenseListRecord,
  type LicenseListSummary,
  readLicenseListRecords,
  summarizeLicenseListRecords,
} from 'gdc-common-utils-ts/utils/license-list-search';
import {
  LicenseOfferSearchEditor,
  LicenseOrderSearchEditor,
  type LicenseOfferSearchDraft,
  type LicenseOrderSearchDraft,
  type LicenseOfferRecord,
  type LicenseOrderRecord,
  readLicenseOfferRecords,
  readLicenseOrderRecords,
  summarizeLicenseOfferRecords,
  summarizeLicenseOrderRecords,
} from 'gdc-common-utils-ts/utils/license-commercial-search';

export type LicenseControllerQueryInput = Partial<LicenseListSearchDraft>;
export type LicenseOfferControllerQueryInput = Partial<LicenseOfferSearchDraft>;
export type LicenseOrderControllerQueryInput = Partial<LicenseOrderSearchDraft>;

/**
 * Runtime-neutral high-level surface for license table filters and list
 * readback.
 */
export interface LicenseControllerFacade {
  /**
   * Starts one semantic search editor for frontend/BFF code.
   */
  newSearchEditorLicenseList(initial?: LicenseControllerQueryInput): LicenseListSearchEditor;
  /**
   * Starts one semantic commercial-offer search editor for portal/BFF list
   * screens.
   */
  newSearchEditorLicenseOffer(initial?: LicenseOfferControllerQueryInput): LicenseOfferSearchEditor;
  /**
   * Starts one semantic commercial-order search editor for portal/BFF list
   * screens.
   */
  newSearchEditorLicenseOrder(initial?: LicenseOrderControllerQueryInput): LicenseOrderSearchEditor;
  /**
   * @deprecated Prefer `newSearchEditorLicenseList(...)`.
   */
  createSearchEditor(initial?: LicenseControllerQueryInput): LicenseListSearchEditor;
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
    newSearchEditorLicenseList(initial = {}) {
      return new LicenseListSearchEditor(initial);
    },
    newSearchEditorLicenseOffer(initial = {}) {
      return new LicenseOfferSearchEditor(initial);
    },
    newSearchEditorLicenseOrder(initial = {}) {
      return new LicenseOrderSearchEditor(initial);
    },
    createSearchEditor(initial = {}) {
      return new LicenseListSearchEditor(initial);
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
