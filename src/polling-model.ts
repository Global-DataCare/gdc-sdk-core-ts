// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

export type SubmitPayload = { thid?: string } & Record<string, unknown>;

export type AsyncPollRequest = {
  thid: string;
};

export type SubmitResponse = {
  status: number;
  location?: string;
  body: unknown;
};

export type PollOptions = {
  timeoutMs?: number;
  intervalMs?: number;
};

export type PollResult = {
  status: number;
  body: unknown;
  attempts: number;
};

export type SubmitAndPollResult = {
  submit: SubmitResponse;
  poll: PollResult;
};

/**
 * Converts timeout/interval values expressed in seconds into SDK poll options.
 *
 * @param timeoutSeconds Optional poll timeout in seconds.
 * @param intervalSeconds Optional poll interval in seconds.
 * @param defaults Optional millisecond defaults used when explicit seconds are absent.
 */
export function resolvePollOptionsFromSeconds(
  timeoutSeconds?: number,
  intervalSeconds?: number,
  defaults?: {
    timeoutMs?: number;
    intervalMs?: number;
  },
): PollOptions | undefined {
  const pollOptions: PollOptions = {};
  if (Number.isFinite(Number(timeoutSeconds))) {
    pollOptions.timeoutMs = Math.max(1, Math.floor(Number(timeoutSeconds) * 1000));
  } else if (defaults?.timeoutMs) {
    pollOptions.timeoutMs = defaults.timeoutMs;
  }
  if (Number.isFinite(Number(intervalSeconds))) {
    pollOptions.intervalMs = Math.max(1, Math.floor(Number(intervalSeconds) * 1000));
  } else if (defaults?.intervalMs) {
    pollOptions.intervalMs = defaults.intervalMs;
  }
  return Object.keys(pollOptions).length ? pollOptions : undefined;
}
