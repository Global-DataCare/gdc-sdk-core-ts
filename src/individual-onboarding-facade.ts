// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import type {
  IndividualFormTemplateFields,
  IndividualOnboardingDraftInput,
  IndividualOnboardingDraftResult,
  IndividualOnboardingPdfDocumentReferenceInput,
  IndividualOnboardingPdfDraftBundle,
  IndividualOnboardingPdfTemplateInput,
  IndividualOnboardingValidationIssue,
  IndividualOnboardingValidationResult,
  IndividualOrganizationKycPayload,
} from 'gdc-common-utils-ts/models/individual-onboarding';
import { normalizeKycGender } from 'gdc-common-utils-ts/utils/individual-organization-kyc';
import { mergeIndividualOrganizationClaims } from 'gdc-common-utils-ts/utils/individual-organization-claims';
import {
  buildIndividualOnboardingPdfDocumentReferenceEntry,
  buildIndividualOnboardingPdfDraftBundle,
  buildIndividualOnboardingPdfDraftRequestBundle,
} from 'gdc-common-utils-ts/utils/individual-onboarding-document-reference';

export type IndividualOnboardingKycFieldOptions = Readonly<{
  self?: boolean;
  controllerAlternateName?: string | null;
  subjectAlternateName?: string | null;
  controllerIdType?: string | null;
  subjectIdType?: string | null;
  consentDate?: string | null;
  serviceProviderDomain?: string | null;
}>;

export interface IndividualOnboardingEditor {
  setKyc(kyc: IndividualOrganizationKycPayload, options?: IndividualOnboardingKycFieldOptions): IndividualOnboardingEditor;
  setSelf(value: boolean): IndividualOnboardingEditor;
  setControllerAlternateName(value: string): IndividualOnboardingEditor;
  setControllerEmail(value: string): IndividualOnboardingEditor;
  setControllerPhone(value: string): IndividualOnboardingEditor;
  setControllerGivenName(value: string): IndividualOnboardingEditor;
  setControllerFamilyName(value: string): IndividualOnboardingEditor;
  setControllerIdentifier(input: Readonly<{ value: string; type?: string }>): IndividualOnboardingEditor;
  setControllerBirthDate(value: string): IndividualOnboardingEditor;
  setControllerGender(value: string): IndividualOnboardingEditor;
  setSubjectAlternateName(value: string): IndividualOnboardingEditor;
  setSubjectEmail(value: string): IndividualOnboardingEditor;
  setSubjectPhone(value: string): IndividualOnboardingEditor;
  setSubjectGivenName(value: string): IndividualOnboardingEditor;
  setSubjectFamilyName(value: string): IndividualOnboardingEditor;
  setSubjectIdentifier(input: Readonly<{ value: string; type?: string }>): IndividualOnboardingEditor;
  setSubjectBirthDate(value: string): IndividualOnboardingEditor;
  setSubjectGender(value: string): IndividualOnboardingEditor;
  setConsentDate(value: string): IndividualOnboardingEditor;
  setServiceProviderDomain(value: string): IndividualOnboardingEditor;
  setTemplate(template: IndividualOnboardingPdfTemplateInput): IndividualOnboardingEditor;
  setBaseClaims(claims: Record<string, unknown>): IndividualOnboardingEditor;
  setPdf(input: IndividualOnboardingPdfDocumentReferenceInput): IndividualOnboardingEditor;
  getFormFields(): IndividualFormTemplateFields;
  buildClaims(): Record<string, unknown>;
  validate(): IndividualOnboardingValidationResult;
  buildDraft(): IndividualOnboardingDraftResult;
}

export interface IndividualOnboardingFacade {
  createDraft(initial?: IndividualFormTemplateFields): IndividualFormTemplateFields;
  createEditor(initial?: IndividualFormTemplateFields): IndividualOnboardingEditor;
  getFormFieldsFromProfileKyc(
    kyc: IndividualOrganizationKycPayload,
    options?: IndividualOnboardingKycFieldOptions,
  ): IndividualFormTemplateFields;
  setSelf(fields: IndividualFormTemplateFields, value: boolean): IndividualFormTemplateFields;
  setControllerAlternateName(fields: IndividualFormTemplateFields, value: string): IndividualFormTemplateFields;
  setControllerEmail(fields: IndividualFormTemplateFields, value: string): IndividualFormTemplateFields;
  setControllerPhone(fields: IndividualFormTemplateFields, value: string): IndividualFormTemplateFields;
  setControllerGivenName(fields: IndividualFormTemplateFields, value: string): IndividualFormTemplateFields;
  setControllerFamilyName(fields: IndividualFormTemplateFields, value: string): IndividualFormTemplateFields;
  setControllerIdentifier(
    fields: IndividualFormTemplateFields,
    input: Readonly<{ value: string; type?: string }>,
  ): IndividualFormTemplateFields;
  setControllerBirthDate(fields: IndividualFormTemplateFields, value: string): IndividualFormTemplateFields;
  setControllerGender(fields: IndividualFormTemplateFields, value: string): IndividualFormTemplateFields;
  setSubjectAlternateName(fields: IndividualFormTemplateFields, value: string): IndividualFormTemplateFields;
  setSubjectEmail(fields: IndividualFormTemplateFields, value: string): IndividualFormTemplateFields;
  setSubjectPhone(fields: IndividualFormTemplateFields, value: string): IndividualFormTemplateFields;
  setSubjectGivenName(fields: IndividualFormTemplateFields, value: string): IndividualFormTemplateFields;
  setSubjectFamilyName(fields: IndividualFormTemplateFields, value: string): IndividualFormTemplateFields;
  setSubjectIdentifier(
    fields: IndividualFormTemplateFields,
    input: Readonly<{ value: string; type?: string }>,
  ): IndividualFormTemplateFields;
  setSubjectBirthDate(fields: IndividualFormTemplateFields, value: string): IndividualFormTemplateFields;
  setSubjectGender(fields: IndividualFormTemplateFields, value: string): IndividualFormTemplateFields;
  setConsentDate(fields: IndividualFormTemplateFields, value: string): IndividualFormTemplateFields;
  setServiceProviderDomain(fields: IndividualFormTemplateFields, value: string): IndividualFormTemplateFields;
  buildPdfDocumentReference(input: IndividualOnboardingPdfDocumentReferenceInput): IndividualOnboardingDraftResult['documentReference'];
  buildPdfDraftRequestBundle(input: IndividualOnboardingPdfDocumentReferenceInput): IndividualOnboardingPdfDraftBundle;
  buildDraft(input: IndividualOnboardingDraftInput): IndividualOnboardingDraftResult;
  validate(
    fields: IndividualFormTemplateFields,
    template?: IndividualOnboardingPdfTemplateInput,
  ): IndividualOnboardingValidationResult;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalText(value: unknown): string | undefined {
  const normalized = normalizeText(value);
  return normalized || undefined;
}

function normalizeOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return undefined;
}

function cloneFields(fields?: IndividualFormTemplateFields): IndividualFormTemplateFields {
  return { ...(fields || {}) };
}

function patchFields(
  fields: IndividualFormTemplateFields,
  patch: Partial<IndividualFormTemplateFields>,
): IndividualFormTemplateFields {
  return {
    ...cloneFields(fields),
    ...patch,
  };
}

function toValidationResult(issues: IndividualOnboardingValidationIssue[]): IndividualOnboardingValidationResult {
  return {
    ok: !issues.some((issue) => issue.severity === 'error'),
    errors: issues.filter((issue) => issue.severity === 'error'),
    warnings: issues.filter((issue) => issue.severity === 'warning'),
  };
}

function resolveSubjectAlternateName(fields: IndividualFormTemplateFields): string | undefined {
  return normalizeOptionalText(fields.subjectAlternateName) || normalizeOptionalText(fields.controllerAlternateName);
}

function resolveSubjectBirthDate(fields: IndividualFormTemplateFields): string | undefined {
  return normalizeOptionalText(fields.subjectDateOfBirth) || normalizeOptionalText(fields.controllerDateOfBirth);
}

function resolveControllerEmail(
  fields: IndividualFormTemplateFields,
  kyc?: IndividualOrganizationKycPayload,
): string | undefined {
  return normalizeOptionalText(fields.controllerEmail) || normalizeOptionalText(kyc?.controllerEmail);
}

function createEditorFromFacade(
  facade: Omit<IndividualOnboardingFacade, 'createEditor'>,
  initial?: IndividualFormTemplateFields,
): IndividualOnboardingEditor {
  let formFields = facade.createDraft(initial);
  let kyc: IndividualOrganizationKycPayload | undefined;
  let template: IndividualOnboardingPdfTemplateInput | undefined;
  let claims: Record<string, unknown> | undefined;
  let pdf: IndividualOnboardingPdfDocumentReferenceInput | undefined;

  const editor: IndividualOnboardingEditor = {
    setKyc(nextKyc, options = {}) {
      kyc = nextKyc;
      formFields = patchFields(
        facade.getFormFieldsFromProfileKyc(nextKyc, options),
        formFields,
      );
      return editor;
    },
    setSelf(value) { formFields = facade.setSelf(formFields, value); return editor; },
    setControllerAlternateName(value) { formFields = facade.setControllerAlternateName(formFields, value); return editor; },
    setControllerEmail(value) { formFields = facade.setControllerEmail(formFields, value); return editor; },
    setControllerPhone(value) { formFields = facade.setControllerPhone(formFields, value); return editor; },
    setControllerGivenName(value) { formFields = facade.setControllerGivenName(formFields, value); return editor; },
    setControllerFamilyName(value) { formFields = facade.setControllerFamilyName(formFields, value); return editor; },
    setControllerIdentifier(input) { formFields = facade.setControllerIdentifier(formFields, input); return editor; },
    setControllerBirthDate(value) { formFields = facade.setControllerBirthDate(formFields, value); return editor; },
    setControllerGender(value) { formFields = facade.setControllerGender(formFields, value); return editor; },
    setSubjectAlternateName(value) { formFields = facade.setSubjectAlternateName(formFields, value); return editor; },
    setSubjectEmail(value) { formFields = facade.setSubjectEmail(formFields, value); return editor; },
    setSubjectPhone(value) { formFields = facade.setSubjectPhone(formFields, value); return editor; },
    setSubjectGivenName(value) { formFields = facade.setSubjectGivenName(formFields, value); return editor; },
    setSubjectFamilyName(value) { formFields = facade.setSubjectFamilyName(formFields, value); return editor; },
    setSubjectIdentifier(input) { formFields = facade.setSubjectIdentifier(formFields, input); return editor; },
    setSubjectBirthDate(value) { formFields = facade.setSubjectBirthDate(formFields, value); return editor; },
    setSubjectGender(value) { formFields = facade.setSubjectGender(formFields, value); return editor; },
    setConsentDate(value) { formFields = facade.setConsentDate(formFields, value); return editor; },
    setServiceProviderDomain(value) { formFields = facade.setServiceProviderDomain(formFields, value); return editor; },
    setTemplate(value) { template = value; return editor; },
    setBaseClaims(value) { claims = { ...(value || {}) }; return editor; },
    setPdf(value) { pdf = value; return editor; },
    getFormFields() { return cloneFields(formFields); },
    buildClaims() {
      return facade.buildDraft({
        ...(kyc ? { kyc } : {}),
        formFields,
        ...(claims ? { claims } : {}),
      }).claims || {};
    },
    validate() { return facade.validate(formFields, template); },
    buildDraft() {
      return facade.buildDraft({
        ...(kyc ? { kyc } : {}),
        formFields,
        ...(template ? { template } : {}),
        ...(claims ? { claims } : {}),
        ...(pdf ? { pdf } : {}),
      });
    },
  };

  return editor;
}

export function createIndividualOnboardingFacade(): IndividualOnboardingFacade {
  const facade: Omit<IndividualOnboardingFacade, 'createEditor'> = {
    createDraft(initial = {}) {
      return cloneFields(initial);
    },

    getFormFieldsFromProfileKyc(kyc, options = {}) {
      const self = options.self ?? true;
      const subjectAlternateName =
        normalizeOptionalText(options.subjectAlternateName)
        || normalizeOptionalText(kyc.individualAlternateName);
      const controllerAlternateName =
        normalizeOptionalText(options.controllerAlternateName)
        || (self ? subjectAlternateName : undefined);
      const controllerGender = normalizeKycGender(kyc.profile.gender);

      return {
        controllerIsSubject: self,
        ...(controllerAlternateName ? { controllerAlternateName } : {}),
        ...(normalizeOptionalText(kyc.profile.first_name) ? { controllerGivenName: normalizeText(kyc.profile.first_name).toUpperCase() } : {}),
        ...(normalizeOptionalText(kyc.profile.last_name) ? { controllerFamilyName: normalizeText(kyc.profile.last_name).toUpperCase() } : {}),
        ...(resolveControllerEmail({}, kyc) ? { controllerEmail: resolveControllerEmail({}, kyc) } : {}),
        ...(normalizeOptionalText(kyc.profile.phone_number) ? { controllerPhone: normalizeText(kyc.profile.phone_number) } : {}),
        ...(normalizeOptionalText(options.controllerIdType) ? { controllerIdType: normalizeText(options.controllerIdType) } : {}),
        ...(normalizeOptionalText(kyc.profile.id_number) ? { controllerIdValue: normalizeText(kyc.profile.id_number) } : {}),
        ...(normalizeOptionalText(kyc.profile.birthdate) ? { controllerDateOfBirth: normalizeText(kyc.profile.birthdate) } : {}),
        ...(controllerGender ? { controllerGender } : {}),
        ...(!self && subjectAlternateName ? { subjectAlternateName } : {}),
        ...(!self && normalizeOptionalText(kyc.individualBirthDate) ? { subjectDateOfBirth: normalizeText(kyc.individualBirthDate) } : {}),
        ...(!self && normalizeOptionalText(options.subjectIdType) ? { subjectIdType: normalizeText(options.subjectIdType) } : {}),
        ...(normalizeOptionalText(options.consentDate) ? { docDate: normalizeText(options.consentDate) } : {}),
        ...(normalizeOptionalText(options.serviceProviderDomain) ? { serviceProviderDomain: normalizeText(options.serviceProviderDomain) } : {}),
      };
    },

    setSelf(fields, value) { return patchFields(fields, { controllerIsSubject: value }); },
    setControllerAlternateName(fields, value) { return patchFields(fields, { controllerAlternateName: normalizeText(value) }); },
    setControllerEmail(fields, value) { return patchFields(fields, { controllerEmail: normalizeText(value).toLowerCase() }); },
    setControllerPhone(fields, value) { return patchFields(fields, { controllerPhone: normalizeText(value) }); },
    setControllerGivenName(fields, value) { return patchFields(fields, { controllerGivenName: normalizeText(value) }); },
    setControllerFamilyName(fields, value) { return patchFields(fields, { controllerFamilyName: normalizeText(value) }); },
    setControllerIdentifier(fields, input) {
      return patchFields(fields, {
        ...(normalizeOptionalText(input.type) ? { controllerIdType: normalizeText(input.type) } : {}),
        controllerIdValue: normalizeText(input.value),
      });
    },
    setControllerBirthDate(fields, value) { return patchFields(fields, { controllerDateOfBirth: normalizeText(value) }); },
    setControllerGender(fields, value) { return patchFields(fields, { controllerGender: normalizeText(value) }); },
    setSubjectAlternateName(fields, value) { return patchFields(fields, { subjectAlternateName: normalizeText(value) }); },
    setSubjectEmail(fields, value) { return patchFields(fields, { subjectEmail: normalizeText(value).toLowerCase() }); },
    setSubjectPhone(fields, value) { return patchFields(fields, { subjectPhone: normalizeText(value) }); },
    setSubjectGivenName(fields, value) { return patchFields(fields, { subjectGivenName: normalizeText(value) }); },
    setSubjectFamilyName(fields, value) { return patchFields(fields, { subjectFamilyName: normalizeText(value) }); },
    setSubjectIdentifier(fields, input) {
      return patchFields(fields, {
        ...(normalizeOptionalText(input.type) ? { subjectIdType: normalizeText(input.type) } : {}),
        subjectIdValue: normalizeText(input.value),
      });
    },
    setSubjectBirthDate(fields, value) { return patchFields(fields, { subjectDateOfBirth: normalizeText(value) }); },
    setSubjectGender(fields, value) { return patchFields(fields, { subjectGender: normalizeText(value) }); },
    setConsentDate(fields, value) { return patchFields(fields, { docDate: normalizeText(value) }); },
    setServiceProviderDomain(fields, value) { return patchFields(fields, { serviceProviderDomain: normalizeText(value) }); },
    buildPdfDocumentReference(input) { return buildIndividualOnboardingPdfDocumentReferenceEntry(input); },
    buildPdfDraftRequestBundle(input) { return buildIndividualOnboardingPdfDraftRequestBundle(input); },

    buildDraft(input) {
      const fromKyc = input.kyc
        ? facade.getFormFieldsFromProfileKyc(input.kyc, {
          self: normalizeOptionalBoolean(input.formFields?.controllerIsSubject) ?? true,
          controllerAlternateName: input.formFields?.controllerAlternateName,
          subjectAlternateName: input.formFields?.subjectAlternateName,
          controllerIdType: input.formFields?.controllerIdType,
          subjectIdType: input.formFields?.subjectIdType,
          consentDate: input.formFields?.docDate,
          serviceProviderDomain: input.formFields?.serviceProviderDomain,
        })
        : {};
      const formFields = patchFields(fromKyc, input.formFields || {});
      const validation = facade.validate(formFields, input.template);
      const subjectAlternateName = resolveSubjectAlternateName(formFields);
      const subjectBirthDate = resolveSubjectBirthDate(formFields);
      const claims = (() => {
        if (!input.kyc && !input.formFields && !input.claims) return undefined;
        return mergeIndividualOrganizationClaims({
          claims: input.claims,
          ...(input.kyc && subjectAlternateName ? {
            kyc: {
              ...input.kyc,
              individualAlternateName: subjectAlternateName,
              individualBirthDate: subjectBirthDate,
              controllerEmail: resolveControllerEmail(formFields, input.kyc),
            },
          } : {}),
          formFields,
        }).claims;
      })();
      const pdfInput = input.pdf
        ? {
          ...input.pdf,
          date: normalizeOptionalText(input.pdf.date) || normalizeOptionalText(formFields.docDate),
        }
        : undefined;
      const documentReference = pdfInput ? buildIndividualOnboardingPdfDocumentReferenceEntry(pdfInput) : undefined;
      const bundle = pdfInput ? buildIndividualOnboardingPdfDraftBundle(pdfInput) : undefined;

      return {
        formFields,
        ...(input.template ? { template: input.template } : {}),
        ...(claims ? { claims } : {}),
        ...(documentReference ? { documentReference } : {}),
        ...(bundle ? { data: bundle.data, bundle } : {}),
        validation,
      };
    },

    validate(fields, template) {
      const issues: IndividualOnboardingValidationIssue[] = [];
      const self = normalizeOptionalBoolean(fields.controllerIsSubject) ?? true;
      const controllerAlternateName = normalizeOptionalText(fields.controllerAlternateName);
      const subjectAlternateName = normalizeOptionalText(fields.subjectAlternateName);
      const hasControllerContact = Boolean(normalizeOptionalText(fields.controllerEmail) || normalizeOptionalText(fields.controllerPhone));
      const hasSubjectContact = Boolean(normalizeOptionalText(fields.subjectEmail) || normalizeOptionalText(fields.subjectPhone));

      if (self) {
        if (!controllerAlternateName) {
          issues.push({ severity: 'error', code: 'missing-controller-alternate-name', message: 'Controller alternateName is required when controllerIsSubject=true.', field: 'controllerAlternateName' });
        }
        if (subjectAlternateName) {
          issues.push({ severity: 'warning', code: 'subject-fields-ignored-when-self', message: 'subjectAlternateName is usually unnecessary when controllerIsSubject=true.', field: 'subjectAlternateName' });
        }
      } else {
        if (!controllerAlternateName) {
          issues.push({ severity: 'error', code: 'missing-controller-alternate-name', message: 'Controller alternateName is required when controllerIsSubject=false.', field: 'controllerAlternateName' });
        }
        if (!subjectAlternateName) {
          issues.push({ severity: 'warning', code: 'missing-subject-alternate-name', message: 'Subject alternateName is recommended when self=false.', field: 'subjectAlternateName' });
        }
      }

      if (!hasControllerContact && !hasSubjectContact) {
        issues.push({ severity: 'error', code: 'missing-contact-channel', message: 'At least one controller or subject contact channel is required.', field: 'controllerEmail' });
      }

      if (template) {
        if (!normalizeOptionalText(template.sector)) issues.push({ severity: 'error', code: 'missing-template-sector', message: 'Template sector is required.', field: 'template' });
        if (!normalizeOptionalText(template.language)) issues.push({ severity: 'error', code: 'missing-template-language', message: 'Template language is required.', field: 'template' });
        if (!normalizeOptionalText(template.version)) issues.push({ severity: 'error', code: 'missing-template-version', message: 'Template version is required.', field: 'template' });
      }

      return toValidationResult(issues);
    },
  };

  return {
    ...facade,
    createEditor(initial = {}) {
      return createEditorFromFacade(facade, initial);
    },
  };
}

export function createIndividualOnboardingEditor(
  initial: IndividualFormTemplateFields = {},
): IndividualOnboardingEditor {
  return createIndividualOnboardingFacade().createEditor(initial);
}
