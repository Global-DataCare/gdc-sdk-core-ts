// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import {
  createLifecycleResultReader,
  type LifecycleResultReader,
} from 'gdc-common-utils-ts/utils/lifecycle-result-reader';
import {
  type IndividualOrganizationLifecycleClaims,
  IndividualOrganizationLifecycleEditor,
  IndividualOrganizationLifecycleOperations,
  type IndividualOrganizationLifecycleEditorState,
} from 'gdc-common-utils-ts/utils/individual-organization-lifecycle';

export {
  IndividualOrganizationLifecycleOperations,
};

export type IndividualOrganizationLifecycleEditorInput =
  Partial<IndividualOrganizationLifecycleEditorState>;

export interface IndividualOrganizationLifecycleFacade {
  prepareLifecycleIndividualOrganization(initial?: IndividualOrganizationLifecycleEditorInput): IndividualOrganizationLifecycleEditor;
  prepareLifecycleIndividualOrganizationDisable(initial?: Omit<IndividualOrganizationLifecycleEditorInput, 'operation'>): IndividualOrganizationLifecycleEditor;
  prepareLifecycleIndividualOrganizationPurge(initial?: Omit<IndividualOrganizationLifecycleEditorInput, 'operation'>): IndividualOrganizationLifecycleEditor;
  setIdentifier(
    editor: IndividualOrganizationLifecycleEditor,
    identifier: string,
  ): IndividualOrganizationLifecycleEditor;
  getIdentifier(
    editor: IndividualOrganizationLifecycleEditor,
  ): string | undefined;
  setAlternateName(
    editor: IndividualOrganizationLifecycleEditor,
    alternateName: string,
  ): IndividualOrganizationLifecycleEditor;
  getAlternateName(
    editor: IndividualOrganizationLifecycleEditor,
  ): string | undefined;
  setOwnerEmail(
    editor: IndividualOrganizationLifecycleEditor,
    email: string,
  ): IndividualOrganizationLifecycleEditor;
  getOwnerEmail(
    editor: IndividualOrganizationLifecycleEditor,
  ): string | undefined;
  setResourceId(
    editor: IndividualOrganizationLifecycleEditor,
    resourceId?: string,
  ): IndividualOrganizationLifecycleEditor;
  mergeClaims(
    editor: IndividualOrganizationLifecycleEditor,
    claims: IndividualOrganizationLifecycleClaims,
  ): IndividualOrganizationLifecycleEditor;
  readLifecycleResult(result: Record<string, unknown>): LifecycleResultReader;
}

/**
 * Thin neutral facade over the shared individual-organization lifecycle editor.
 *
 * Intent:
 * - keep `sdk-core` as the canonical public place where runtime packages
 *   discover lifecycle surface
 * - reuse the shared chainable editor from `gdc-common-utils-ts`
 * - expose one explicit readback entry point for lifecycle operation results
 */
export function createIndividualOrganizationLifecycleFacade():
IndividualOrganizationLifecycleFacade {
  return {
    prepareLifecycleIndividualOrganization(initial = {}) {
      return new IndividualOrganizationLifecycleEditor(initial);
    },
    prepareLifecycleIndividualOrganizationDisable(initial = {}) {
      return new IndividualOrganizationLifecycleEditor({
        ...initial,
        operation: IndividualOrganizationLifecycleOperations.Disable,
      });
    },
    prepareLifecycleIndividualOrganizationPurge(initial = {}) {
      return new IndividualOrganizationLifecycleEditor({
        ...initial,
        operation: IndividualOrganizationLifecycleOperations.Purge,
      });
    },
    setIdentifier(editor, identifier) {
      return editor.setIdentifier(identifier);
    },
    getIdentifier(editor) {
      return editor.getIdentifier();
    },
    setAlternateName(editor, alternateName) {
      return editor.setAlternateName(alternateName);
    },
    getAlternateName(editor) {
      return editor.getAlternateName();
    },
    setOwnerEmail(editor, email) {
      return editor.setOwnerEmail(email);
    },
    getOwnerEmail(editor) {
      return editor.getOwnerEmail();
    },
    setResourceId(editor, resourceId) {
      return editor.setResourceId(resourceId);
    },
    mergeClaims(editor, claims) {
      return editor.mergeClaims(claims);
    },
    readLifecycleResult(result) {
      return createLifecycleResultReader(result);
    },
  };
}
