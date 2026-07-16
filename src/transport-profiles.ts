import type { CommunicationOutboxJob } from './communication-draft.js';
import {
  isCommMsgExtendedCommunicationOutboxJob,
  renderCommMsgExtendedClinicalBody,
} from './comm-msg-extended-draft.js';
import type {
  CommMsgExtendedCommunicationOutboxJob,
  CommunicationClinicalFormatRenderers,
} from './comm-msg-extended-draft.js';

/** Canonical wire profiles selected by a channel facade for one outbox entry. */
export const TransportProfiles = Object.freeze({
  FhirJson: 'application/fhir+json',
  DidcommPlainJson: 'application/didcomm-plain+json',
  DidcommEncryptedForm: 'application/x-www-form-urlencoded',
} as const);

export type TransportProfile = typeof TransportProfiles[keyof typeof TransportProfiles];

/** Resolves a configured media type and rejects silent profile downgrade. */
export function requireTransportProfile(value: unknown): TransportProfile {
  const normalized = String(value || '').trim().toLowerCase();
  const profile = Object.values(TransportProfiles).find((candidate) => candidate === normalized);
  if (!profile) throw new Error(`Unsupported transport profile '${String(value || '')}'.`);
  return profile;
}

export type SecureDidcommTransportAdapter = Readonly<{
  /** Signs/encrypts one DIDComm plaintext message for the selected GW recipient. */
  pack: (message: Record<string, unknown>) => Promise<string>;
  /** Decrypts and verifies one compact response JWE returned by GW. */
  unpack: (compactJwe: string) => Promise<unknown>;
}>;

export type RenderedTransportRequest = Readonly<{
  profile: TransportProfile;
  contentType: string;
  accept: string;
  body: Record<string, unknown> | string;
  thid: string;
}>;

export type CommunicationOutboxRenderOptions = Readonly<{
  /** `api` and `r4` are built in; product packages may register other formats. */
  clinicalFormat?: string;
  /** Sector-owned clinical projection renderers keyed by normalized format. */
  formatRenderers?: CommunicationClinicalFormatRenderers;
}>;

/** Resolves the business thread id without inventing a second FHIR thread. */
export function resolveTransportThreadId(profile: TransportProfile, payload: Record<string, unknown>): string | undefined {
  if (profile === TransportProfiles.FhirJson) {
    return typeof payload.id === 'string' && payload.id.trim() ? payload.id.trim() : undefined;
  }
  return typeof payload.thid === 'string' && payload.thid.trim() ? payload.thid.trim() : undefined;
}

/**
 * Renders one canonical clinical outbox job for the selected HTTP wire profile.
 *
 * New applications own a claims-first `CommMsgExtended` outbox job; legacy
 * FHIR-Communication jobs remain accepted temporarily. This function first
 * renders `data[]` or `Bundle.entry[]`, then adds a DIDComm envelope only for
 * DIDComm profiles. Callers must not hand-build either representation or JWE.
 */
export async function renderCommunicationOutboxRequest(
  job: CommunicationOutboxJob | CommMsgExtendedCommunicationOutboxJob,
  profile: TransportProfile,
  secureAdapter?: SecureDidcommTransportAdapter,
  options: CommunicationOutboxRenderOptions = {},
): Promise<RenderedTransportRequest> {
  const canonicalMessageJob = isCommMsgExtendedCommunicationOutboxJob(job);
  if (canonicalMessageJob) {
    requireReadyCommMsgExtendedJob(job);
  } else {
    requireReadyCommunicationJob(job);
  }
  const clinicalBody = canonicalMessageJob
    ? renderCommMsgExtendedClinicalBody(
        job.payload,
        options.clinicalFormat || 'api',
        options.formatRenderers,
      )
    : requireEnvelopeBundle(job.envelope);
  const didcommMessage = canonicalMessageJob
    ? { ...job.payload, body: clinicalBody, thid: job.thid }
    : { ...job.envelope, thid: job.thid };

  if (profile === TransportProfiles.FhirJson) {
    const isFhirBundle = clinicalBody.resourceType === 'Bundle';
    return {
      profile,
      contentType: TransportProfiles.FhirJson,
      accept: 'application/fhir+json, application/json',
      body: {
        ...clinicalBody,
        id: typeof clinicalBody.id === 'string' && clinicalBody.id.trim() ? clinicalBody.id : job.thid,
        ...(isFhirBundle ? {} : { thid: job.thid }),
      },
      thid: job.thid,
    };
  }

  if (profile === TransportProfiles.DidcommPlainJson) {
    return {
      profile,
      contentType: TransportProfiles.DidcommPlainJson,
      accept: 'application/didcomm-plain+json, application/json',
      body: didcommMessage,
      thid: job.thid,
    };
  }

  if (profile === TransportProfiles.DidcommEncryptedForm) {
    if (!secureAdapter) {
      throw new Error('DidcommEncryptedForm transport requires a secure adapter.');
    }
    const compactJwe = await secureAdapter.pack(didcommMessage);
    if (!String(compactJwe || '').trim()) {
      throw new Error('Secure DIDComm adapter returned an empty request JWE.');
    }
    return {
      profile,
      contentType: TransportProfiles.DidcommEncryptedForm,
      accept: TransportProfiles.DidcommEncryptedForm,
      body: `request=${encodeURIComponent(compactJwe)}`,
      thid: job.thid,
    };
  }

  throw new Error(`Unsupported transport profile '${String(profile)}'.`);
}

function requireReadyCommMsgExtendedJob(job: CommMsgExtendedCommunicationOutboxJob): void {
  if (!String(job.thid || '').trim()) throw new Error('Communication outbox job requires thid.');
  if (!Array.isArray(job.payload?.body?.data) || job.payload.body.data.length === 0) {
    throw new Error('Communication outbox job requires CommMsgExtended body.data[].');
  }
}

/**
 * Renders one already-authored GW message for search and other actor-facade
 * operations that do not originate in a Communication outbox.
 */
export async function renderGatewayMessageRequest(
  message: Record<string, unknown>,
  profile: TransportProfile,
  secureAdapter?: SecureDidcommTransportAdapter,
): Promise<RenderedTransportRequest> {
  const thid = String(message.thid || '').trim();
  if (!thid) throw new Error('Gateway transport message requires thid.');

  if (profile === TransportProfiles.FhirJson) {
    const body = requireEnvelopeBundle(message);
    return {
      profile,
      contentType: TransportProfiles.FhirJson,
      accept: 'application/fhir+json, application/json',
      body: {
        ...body,
        id: typeof body.id === 'string' && body.id.trim() ? body.id : thid,
        thid,
      },
      thid,
    };
  }
  if (profile === TransportProfiles.DidcommPlainJson) {
    return {
      profile,
      contentType: TransportProfiles.DidcommPlainJson,
      accept: 'application/didcomm-plain+json, application/json',
      body: message,
      thid,
    };
  }
  if (profile === TransportProfiles.DidcommEncryptedForm) {
    if (!secureAdapter) throw new Error('DidcommEncryptedForm transport requires a secure adapter.');
    const compactJwe = await secureAdapter.pack(message);
    if (!String(compactJwe || '').trim()) throw new Error('Secure DIDComm adapter returned an empty request JWE.');
    return {
      profile,
      contentType: TransportProfiles.DidcommEncryptedForm,
      accept: TransportProfiles.DidcommEncryptedForm,
      body: `request=${encodeURIComponent(compactJwe)}`,
      thid,
    };
  }
  throw new Error(`Unsupported transport profile '${String(profile)}'.`);
}

/** Renders the async poll request using the same protection profile as submit. */
export async function renderTransportPollRequest(
  thid: string,
  profile: TransportProfile,
  secureAdapter?: SecureDidcommTransportAdapter,
): Promise<RenderedTransportRequest> {
  const normalizedThid = String(thid || '').trim();
  if (!normalizedThid) throw new Error('Transport polling requires thid.');

  if (profile === TransportProfiles.DidcommEncryptedForm) {
    if (!secureAdapter) {
      throw new Error('DidcommEncryptedForm transport requires a secure adapter.');
    }
    const compactJwe = await secureAdapter.pack({ thid: normalizedThid });
    return {
      profile,
      contentType: TransportProfiles.DidcommEncryptedForm,
      accept: TransportProfiles.DidcommEncryptedForm,
      body: `request=${encodeURIComponent(compactJwe)}`,
      thid: normalizedThid,
    };
  }

  return {
    profile,
    contentType: 'application/json',
    accept: 'application/json, application/fhir+json',
    body: { thid: normalizedThid },
    thid: normalizedThid,
  };
}

/** Decodes a terminal response according to the selected wire profile. */
export async function decodeTransportResponse(
  raw: unknown,
  profile: TransportProfile,
  secureAdapter?: SecureDidcommTransportAdapter,
): Promise<unknown> {
  if (profile !== TransportProfiles.DidcommEncryptedForm) return raw;
  if (!secureAdapter) throw new Error('DidcommEncryptedForm transport requires a secure adapter.');
  const compactJwe = readFormField(raw, 'response');
  if (!compactJwe) throw new Error('Secure GW response is missing response=<JWE>.');
  return secureAdapter.unpack(compactJwe);
}

function requireReadyCommunicationJob(job: CommunicationOutboxJob): void {
  if (!job || typeof job !== 'object') throw new Error('Communication transport requires an outbox job.');
  if (!String(job.thid || '').trim()) throw new Error('Communication outbox job requires thid.');
  if (!job.payload || job.payload.resourceType !== 'Communication') {
    throw new Error('Communication outbox job requires a FHIR Communication payload.');
  }
  if (!job.envelope || typeof job.envelope !== 'object') {
    throw new Error('Communication outbox job requires a transport envelope.');
  }
}

function requireEnvelopeBundle(envelope: Record<string, unknown>): Record<string, unknown> {
  const body = envelope.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Communication outbox envelope requires one FHIR Bundle body.');
  }
  return body as Record<string, unknown>;
}

function readFormField(raw: unknown, field: string): string | undefined {
  if (typeof raw === 'string') {
    const params = new URLSearchParams(raw);
    return params.get(field)?.trim() || undefined;
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const value = (raw as Record<string, unknown>)[field];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
  return undefined;
}
