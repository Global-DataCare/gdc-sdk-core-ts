// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import { WalletMessagePriorities, type WalletMessagePriority } from 'gdc-common-utils-ts/models/wallet';
import {
  DurableCommunicationOutboxStatuses,
  type DurableCommunicationOutboxRecord,
  type DurableCommunicationOutboxStatus,
  type PortableCommunicationOutboxJob,
} from './communication-outbox.js';

const PriorityOrder: Record<WalletMessagePriority, number> = {
  [WalletMessagePriorities.Emergency]: 0,
  [WalletMessagePriorities.High]: 1,
  [WalletMessagePriorities.Normal]: 2,
  [WalletMessagePriorities.Low]: 3,
};

const AllowedTransitions: Readonly<Record<DurableCommunicationOutboxStatus, readonly DurableCommunicationOutboxStatus[]>> = {
  [DurableCommunicationOutboxStatuses.Pending]: [DurableCommunicationOutboxStatuses.Submitting, DurableCommunicationOutboxStatuses.RequiresAction, DurableCommunicationOutboxStatuses.Expired, DurableCommunicationOutboxStatuses.Cancelled],
  [DurableCommunicationOutboxStatuses.Submitting]: [DurableCommunicationOutboxStatuses.Accepted, DurableCommunicationOutboxStatuses.Reconciling, DurableCommunicationOutboxStatuses.Retryable, DurableCommunicationOutboxStatuses.RequiresAction, DurableCommunicationOutboxStatuses.Rejected, DurableCommunicationOutboxStatuses.Failed, DurableCommunicationOutboxStatuses.Expired, DurableCommunicationOutboxStatuses.Cancelled],
  [DurableCommunicationOutboxStatuses.Accepted]: [DurableCommunicationOutboxStatuses.Reconciling, DurableCommunicationOutboxStatuses.Confirmed, DurableCommunicationOutboxStatuses.RequiresAction, DurableCommunicationOutboxStatuses.Rejected, DurableCommunicationOutboxStatuses.Expired, DurableCommunicationOutboxStatuses.Cancelled],
  [DurableCommunicationOutboxStatuses.Reconciling]: [DurableCommunicationOutboxStatuses.Confirmed, DurableCommunicationOutboxStatuses.RequiresAction, DurableCommunicationOutboxStatuses.Rejected, DurableCommunicationOutboxStatuses.Failed, DurableCommunicationOutboxStatuses.Expired, DurableCommunicationOutboxStatuses.Cancelled],
  [DurableCommunicationOutboxStatuses.Retryable]: [DurableCommunicationOutboxStatuses.Submitting, DurableCommunicationOutboxStatuses.RequiresAction, DurableCommunicationOutboxStatuses.Failed, DurableCommunicationOutboxStatuses.Expired, DurableCommunicationOutboxStatuses.Cancelled],
  [DurableCommunicationOutboxStatuses.RequiresAction]: [DurableCommunicationOutboxStatuses.Pending, DurableCommunicationOutboxStatuses.Expired, DurableCommunicationOutboxStatuses.Cancelled],
  [DurableCommunicationOutboxStatuses.Confirmed]: [],
  [DurableCommunicationOutboxStatuses.Rejected]: [],
  [DurableCommunicationOutboxStatuses.Failed]: [],
  [DurableCommunicationOutboxStatuses.Expired]: [],
  [DurableCommunicationOutboxStatuses.Cancelled]: [],
};

/** Shared priority/FIFO comparator for database, native and memory adapters. */
export function compareDurableCommunicationOutboxRecords<TJob extends PortableCommunicationOutboxJob>(
  left: DurableCommunicationOutboxRecord<TJob>,
  right: DurableCommunicationOutboxRecord<TJob>,
): number {
  return PriorityOrder[left.priority] - PriorityOrder[right.priority]
    || left.sequence - right.sequence
    || left.id.localeCompare(right.id);
}

/** Shared lease/due check used by every durable adapter. */
export function isDurableCommunicationOutboxRecordClaimable<TJob extends PortableCommunicationOutboxJob>(
  record: DurableCommunicationOutboxRecord<TJob>,
  now: string,
): boolean {
  const queued = record.status === DurableCommunicationOutboxStatuses.Pending
    || record.status === DurableCommunicationOutboxStatuses.Retryable;
  const abandoned = record.status === DurableCommunicationOutboxStatuses.Submitting
    && !!record.leaseUntil
    && record.leaseUntil <= now;
  return (queued || abandoned) && record.availableAt <= now;
}

export function assertDurableCommunicationOutboxTransition(
  current: DurableCommunicationOutboxStatus,
  next: DurableCommunicationOutboxStatus,
): void {
  if (next !== current && !AllowedTransitions[current].includes(next)) {
    throw new Error(`Invalid durable Communication outbox transition: ${current} -> ${next}`);
  }
}
