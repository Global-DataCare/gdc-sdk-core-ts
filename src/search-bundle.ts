// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

export type SearchParameterPrimitive =
  | string
  | number
  | boolean
  | readonly (string | number | boolean)[];

export type SearchRequestEncoding = 'get-query' | 'post-parameters';

export type SearchBundleOptions = Readonly<{
  resourceType: string;
  searchParams?: Record<string, SearchParameterPrimitive | undefined>;
  encoding?: SearchRequestEncoding;
}>;

function normalizeSearchPrimitiveValues(
  value: SearchParameterPrimitive,
): Array<string | number | boolean> {
  const values = Array.isArray(value) ? [...value] : [value];
  return values
    .map((item) => typeof item === 'string' ? item.trim() : item)
    .filter((item) => item !== '' && item !== undefined && item !== null);
}

function buildSearchQueryString(
  searchParams: Readonly<Record<string, SearchParameterPrimitive | undefined>>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === null) continue;
    const normalized = normalizeSearchPrimitiveValues(value);
    if (normalized.length === 0) continue;
    params.set(key, normalized.map((item) => String(item)).join(','));
  }
  return params.toString();
}

function buildFhirParametersResourceFromSearchParams(
  searchParams: Readonly<Record<string, SearchParameterPrimitive | undefined>>,
): {
  resourceType: 'Parameters';
  parameter: Array<Record<string, unknown>>;
} {
  const parameter: Array<Record<string, unknown>> = [];
  for (const [name, value] of Object.entries(searchParams)) {
    if (value === undefined || value === null) continue;
    for (const item of normalizeSearchPrimitiveValues(value)) {
      if (typeof item === 'boolean') {
        parameter.push({ name, valueBoolean: item });
      } else if (typeof item === 'number') {
        parameter.push(Number.isInteger(item) ? { name, valueInteger: item } : { name, valueDecimal: item });
      } else {
        parameter.push({ name, valueString: item });
      }
    }
  }
  return {
    resourceType: 'Parameters',
    parameter,
  };
}

/**
 * Builds one runtime-neutral search entry that can be wrapped inside a batch
 * bundle and then submitted through SDK node/front runtimes or portal DIDComm
 * wrappers.
 */
export function buildSearchBundleEntry(input: SearchBundleOptions): {
  request: {
    method: 'GET' | 'POST';
    url: string;
  };
  resource?: {
    resourceType: 'Parameters';
    parameter: Array<Record<string, unknown>>;
  };
} {
  const resourceType = String(input.resourceType || '').trim();
  const encoding = input.encoding || 'post-parameters';
  const searchParams = input.searchParams || {};

  if (!resourceType) {
    throw new Error('buildSearchBundleEntry requires resourceType.');
  }

  if (encoding === 'get-query') {
    const query = buildSearchQueryString(searchParams);
    return {
      request: {
        method: 'GET',
        url: query ? `${resourceType}?${query}` : resourceType,
      },
    };
  }

  return {
    request: {
      method: 'POST',
      url: `${resourceType}/_search`,
    },
    resource: buildFhirParametersResourceFromSearchParams(searchParams),
  };
}

/**
 * Builds a one-entry `Bundle` for search operations.
 *
 * New SDK code should use the default `post-parameters` encoding. `get-query`
 * remains available only for compatibility with legacy GW search handlers.
 */
export function buildSearchBundle(input: SearchBundleOptions): {
  resourceType: 'Bundle';
  type: 'batch';
  entry: Array<ReturnType<typeof buildSearchBundleEntry>>;
} {
  return {
    resourceType: 'Bundle',
    type: 'batch',
    entry: [buildSearchBundleEntry(input)],
  };
}
