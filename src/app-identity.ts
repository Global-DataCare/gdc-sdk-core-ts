// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import type { AppInfo } from './session-model.js';

export const DEFAULT_APP_VERSION = 'v1.0';

export type ResolvedAppInfo = Omit<AppInfo, 'appVersion'> & {
  appVersion: string;
};

/**
 * Resolves the host app identity into the canonical form expected by GW CORE.
 *
 * Rules:
 * - `appId` is mandatory
 * - URL/domain inputs are normalized to reverse-DNS using only the hostname
 * - `appVersion` defaults to `v1.0`
 *
 * @example
 * ```ts
 * const resolved = resolveAppInfo({
 *   appId: 'https://globaldatacare.es/portal',
 *   appType: 'Family',
 *   sector: 'health-care',
 * });
 *
 * console.log(resolved.appId);
 * // es.globaldatacare
 *
 * console.log(resolved.appVersion);
 * // v1.0
 * ```
 */
export function resolveAppInfo(appInfo: AppInfo): ResolvedAppInfo {
  return {
    ...appInfo,
    appId: normalizeAppId(appInfo.appId),
    appVersion: normalizeAppVersion(appInfo.appVersion),
  };
}

/**
 * Normalizes a GW CORE app identifier.
 *
 * When the input is a URL or bare hostname, the hostname is converted to
 * reverse-DNS. Otherwise the trimmed literal value is preserved.
 *
 * @example
 * ```ts
 * normalizeAppId('https://globaldatacare.es/app');
 * // 'es.globaldatacare'
 * ```
 *
 * @example
 * ```ts
 * normalizeAppId('globaldatacare.es');
 * // 'es.globaldatacare'
 * ```
 *
 * @example
 * ```ts
 * normalizeAppId('es.globaldatacare.portal');
 * // 'es.globaldatacare.portal'
 * ```
 */
export function normalizeAppId(input: string): string {
  const raw = String(input || '').trim();
  if (!raw) {
    throw new Error('AppInfo.appId is required.');
  }

  const lowerRaw = raw.toLowerCase();
  const hostname = tryExtractHostname(raw);
  if (!hostname) {
    return raw;
  }

  const normalizedHost = hostname
    .trim()
    .toLowerCase()
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '');

  if (!normalizedHost) {
    throw new Error('AppInfo.appId must contain a valid hostname or stable identifier.');
  }

  if (!looksLikeReversibleHostname(normalizedHost)) {
    return raw;
  }

  if (!shouldReverseHostname(lowerRaw, normalizedHost)) {
    return normalizedHost;
  }

  return normalizedHost.split('.').reverse().join('.');
}

/**
 * Returns the canonical GW CORE app version.
 *
 * @example
 * ```ts
 * normalizeAppVersion(undefined);
 * // 'v1.0'
 * ```
 */
export function normalizeAppVersion(input?: string): string {
  const version = String(input || '').trim();
  return version || DEFAULT_APP_VERSION;
}

/**
 * Builds the standard GW CORE request headers for the host app identity.
 *
 * @example
 * ```ts
 * const headers = buildAppHeaders({
 *   appId: 'https://globaldatacare.es',
 *   appType: 'Family',
 *   sector: 'health-care',
 * });
 *
 * console.log(headers);
 * // { AppId: 'es.globaldatacare', AppVersion: 'v1.0' }
 * ```
 */
export function buildAppHeaders(appInfo: AppInfo): Record<'AppId' | 'AppVersion', string> {
  const resolved = resolveAppInfo(appInfo);
  return {
    AppId: resolved.appId,
    AppVersion: resolved.appVersion,
  };
}

function tryExtractHostname(raw: string): string | undefined {
  const candidate = raw.includes('://') ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    return parsed.hostname || undefined;
  } catch {
    return undefined;
  }
}

function looksLikeReversibleHostname(hostname: string): boolean {
  if (!hostname.includes('.')) {
    return false;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return false;
  }
  return hostname.split('.').every((label) => /^[a-z0-9-]+$/i.test(label) && !label.startsWith('-') && !label.endsWith('-'));
}

function shouldReverseHostname(raw: string, hostname: string): boolean {
  if (raw.includes('://') || raw.includes('/') || raw.includes(':')) {
    return true;
  }

  const labels = hostname.split('.');
  const lastLabel = labels[labels.length - 1];
  if (lastLabel.length === 2) {
    return true;
  }

  return ['com', 'org', 'net', 'edu', 'gov', 'mil', 'info', 'biz', 'io', 'app', 'dev'].includes(lastLabel);
}
