// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import type {
  CommunicationDraft,
  CommunicationOutboxJob,
  CommunicationOutboxStatus,
  OutboxJob,
} from './communication-draft.js';
import {
  WalletMessagePriorities,
  type WalletMessagePriority,
} from 'gdc-common-utils-ts/models/wallet';

export type OutboxQuery<TStatus extends string = CommunicationOutboxStatus> = Readonly<{
  status?: TStatus | TStatus[];
  draftId?: string;
  thid?: string;
}>;

/**
 * Runtime-neutral repository contract for communication drafts and outbox jobs.
 *
 * Frontend packages can back this with IndexedDB/SQLite/secure storage.
 * Node packages can back it with memory, files, or a database.
 */
export interface IOutboxRepository<
  TDraft extends { id: string } = CommunicationDraft,
  TJob extends { id: string; draftId: string; thid: string; status: string } = OutboxJob,
  TStatus extends string = CommunicationOutboxStatus,
> {
  initialize(): Promise<void>;
  putDraft(draft: TDraft): Promise<boolean>;
  getDraft(draftId: string): Promise<TDraft | undefined>;
  listDrafts(): Promise<TDraft[]>;
  deleteDraft(draftId: string): Promise<boolean>;
  putJob(job: TJob): Promise<boolean>;
  getJob(jobId: string): Promise<TJob | undefined>;
  listJobs(query?: OutboxQuery<TStatus>): Promise<TJob[]>;
  deleteJob(jobId: string): Promise<boolean>;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeStatuses(
  status: CommunicationOutboxStatus | CommunicationOutboxStatus[] | undefined,
): Set<CommunicationOutboxStatus> | undefined {
  if (!status) return undefined;
  const values = Array.isArray(status) ? status : [status];
  return new Set(values);
}

/**
 * Memory-backed reference implementation of `IOutboxRepository`.
 *
 * Useful for tests, demos, server-local drafts, and as the baseline behavior
 * before wiring persistent adapters in frontend or node runtimes.
 */
export class OutboxRepositoryMemory implements IOutboxRepository {
  private readonly drafts = new Map<string, CommunicationDraft>();
  private readonly jobs = new Map<string, CommunicationOutboxJob>();

  public async initialize(): Promise<void> {}

  public async putDraft(draft: CommunicationDraft): Promise<boolean> {
    this.drafts.set(draft.id, clone(draft));
    return true;
  }

  public async getDraft(draftId: string): Promise<CommunicationDraft | undefined> {
    const draft = this.drafts.get(draftId);
    return draft ? clone(draft) : undefined;
  }

  public async listDrafts(): Promise<CommunicationDraft[]> {
    return [...this.drafts.values()].map((draft) => clone(draft));
  }

  public async deleteDraft(draftId: string): Promise<boolean> {
    return this.drafts.delete(draftId);
  }

  public async putJob(job: CommunicationOutboxJob): Promise<boolean> {
    this.jobs.set(job.id, clone(job));
    return true;
  }

  public async getJob(jobId: string): Promise<CommunicationOutboxJob | undefined> {
    const job = this.jobs.get(jobId);
    return job ? clone(job) : undefined;
  }

  public async listJobs(query: OutboxQuery = {}): Promise<CommunicationOutboxJob[]> {
    const acceptedStatuses = normalizeStatuses(query.status);
    return [...this.jobs.values()]
      .filter((job) => {
        if (acceptedStatuses && !acceptedStatuses.has(job.status)) return false;
        if (query.draftId && job.draftId !== query.draftId) return false;
        if (query.thid && job.thid !== query.thid) return false;
        return true;
      })
      .map((job) => clone(job));
  }

  public async deleteJob(jobId: string): Promise<boolean> {
    return this.jobs.delete(jobId);
  }
}

/**
 * Honest lifecycle of one durable Communication delivery.
 *
 * `accepted` only means that the remote endpoint acknowledged the submission.
 * It must not be presented as authoritative persistence. `confirmed` requires
 * the product/runtime to complete its authoritative, subject-scoped readback.
 */
export const DurableCommunicationOutboxStatuses = Object.freeze({
  Pending: 'pending',
  Submitting: 'submitting',
  Accepted: 'accepted',
  Reconciling: 'reconciling',
  Confirmed: 'confirmed',
  Retryable: 'retryable',
  RequiresAction: 'requires-action',
  Rejected: 'rejected',
  Failed: 'failed',
  Expired: 'expired',
  Cancelled: 'cancelled',
} as const);

export type DurableCommunicationOutboxStatus =
  typeof DurableCommunicationOutboxStatuses[keyof typeof DurableCommunicationOutboxStatuses];

/** Minimum immutable job shape accepted by the durable repository contract. */
export type PortableCommunicationOutboxJob = Readonly<{
  id: string;
  draftId: string;
  thid: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  payload: unknown;
  /** Stable canonical-intent digest used to detect idempotency collisions. */
  idempotencyDigest?: string;
}>;

/** Structured failure metadata retained without embedding transport policy. */
export type DurableCommunicationOutboxError = Readonly<{
  message: string;
  code?: string;
  occurredAt: string;
}>;

/**
 * Persistable scheduling wrapper around the immutable canonical outbox job.
 *
 * Adapters must persist `sequence`, `revision`, and `idempotencyKey`; these are
 * repository facts, not fields that renderers or HTTP carriers may rewrite.
 */
export type DurableCommunicationOutboxRecord<
  TJob extends PortableCommunicationOutboxJob = CommunicationOutboxJob,
> = Readonly<{
  id: string;
  idempotencyKey: string;
  job: TJob;
  priority: WalletMessagePriority;
  sequence: number;
  revision: number;
  status: DurableCommunicationOutboxStatus;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  availableAt: string;
  lastAttemptAt?: string;
  acceptedAt?: string;
  confirmedAt?: string;
  leaseOwner?: string;
  leaseUntil?: string;
  receipt?: Record<string, unknown>;
  lastError?: DurableCommunicationOutboxError;
}>;

export type EnqueueDurableCommunicationInput<
  TJob extends PortableCommunicationOutboxJob = CommunicationOutboxJob,
> = Readonly<{
  job: TJob;
  idempotencyKey: string;
  priority?: WalletMessagePriority;
  availableAt?: string;
}>;

export type DurableCommunicationEnqueueResult<
  TJob extends PortableCommunicationOutboxJob = CommunicationOutboxJob,
> = Readonly<{
  record: DurableCommunicationOutboxRecord<TJob>;
  created: boolean;
}>;

export type DurableCommunicationOutboxQuery = Readonly<{
  status?: DurableCommunicationOutboxStatus | DurableCommunicationOutboxStatus[];
  priority?: WalletMessagePriority | WalletMessagePriority[];
  draftId?: string;
  thid?: string;
}>;

export type ClaimDurableCommunicationInput = Readonly<{
  workerId: string;
  now?: string;
  leaseMs?: number;
}>;

export type TransitionDurableCommunicationInput = Readonly<{
  expectedRevision: number;
  status: DurableCommunicationOutboxStatus;
  updatedAt?: string;
  availableAt?: string;
  receipt?: Record<string, unknown>;
  error?: Omit<DurableCommunicationOutboxError, 'occurredAt'> & { occurredAt?: string };
}>;

/**
 * Storage-neutral durable Communication outbox port.
 *
 * Database, SQLite, IndexedDB, filesystem, and encrypted-store adapters must
 * provide equivalent atomic idempotent enqueue, priority/FIFO claim, and
 * compare-and-swap transition behavior. Transport submission and readback are
 * deliberately outside this repository.
 */
export interface IDurableCommunicationOutboxRepository<
  TJob extends PortableCommunicationOutboxJob = CommunicationOutboxJob,
> {
  initialize(): Promise<void>;
  enqueue(input: EnqueueDurableCommunicationInput<TJob>): Promise<DurableCommunicationEnqueueResult<TJob>>;
  get(recordId: string): Promise<DurableCommunicationOutboxRecord<TJob> | undefined>;
  getByIdempotencyKey(idempotencyKey: string): Promise<DurableCommunicationOutboxRecord<TJob> | undefined>;
  list(query?: DurableCommunicationOutboxQuery): Promise<DurableCommunicationOutboxRecord<TJob>[]>;
  claimNext(input: ClaimDurableCommunicationInput): Promise<DurableCommunicationOutboxRecord<TJob> | undefined>;
  transition(
    recordId: string,
    input: TransitionDurableCommunicationInput,
  ): Promise<DurableCommunicationOutboxRecord<TJob>>;
}

const DurablePriorityOrder: Record<WalletMessagePriority, number> = {
  [WalletMessagePriorities.Emergency]: 0,
  [WalletMessagePriorities.High]: 1,
  [WalletMessagePriorities.Normal]: 2,
  [WalletMessagePriorities.Low]: 3,
};

const DurableTransitions: Readonly<Record<DurableCommunicationOutboxStatus, readonly DurableCommunicationOutboxStatus[]>> = {
  pending: ['submitting', 'requires-action', 'expired', 'cancelled'],
  submitting: ['accepted', 'reconciling', 'retryable', 'requires-action', 'rejected', 'failed', 'expired', 'cancelled'],
  accepted: ['reconciling', 'confirmed', 'requires-action', 'rejected', 'expired', 'cancelled'],
  reconciling: ['confirmed', 'requires-action', 'rejected', 'failed', 'expired', 'cancelled'],
  retryable: ['submitting', 'requires-action', 'failed', 'expired', 'cancelled'],
  'requires-action': ['pending', 'expired', 'cancelled'],
  confirmed: [],
  rejected: [],
  failed: [],
  expired: [],
  cancelled: [],
};

function normalizeText(value: string, name: string): string {
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error(`Durable Communication outbox requires ${name}.`);
  return normalized;
}

function asSet<T extends string>(value: T | T[] | undefined): Set<T> | undefined {
  if (!value) return undefined;
  return new Set(Array.isArray(value) ? value : [value]);
}

function orderedDurableRecords<TJob extends PortableCommunicationOutboxJob>(
  records: Iterable<DurableCommunicationOutboxRecord<TJob>>,
): DurableCommunicationOutboxRecord<TJob>[] {
  return [...records].sort((left, right) => {
    const priority = DurablePriorityOrder[left.priority] - DurablePriorityOrder[right.priority];
    return priority || left.sequence - right.sequence;
  });
}

/**
 * Isolated in-memory reference adapter for the durable repository contract.
 *
 * Every instance owns its records and monotonic sequence. It is intentionally
 * neither a singleton nor a claim of process-restart durability; production
 * runtimes replace it with an adapter that persists the same record contract.
 */
export class DurableCommunicationOutboxRepositoryMemory<
  TJob extends PortableCommunicationOutboxJob = CommunicationOutboxJob,
> implements IDurableCommunicationOutboxRepository<TJob> {
  private readonly records = new Map<string, DurableCommunicationOutboxRecord<TJob>>();
  private readonly idempotencyIndex = new Map<string, string>();
  private sequence = 0;

  public async initialize(): Promise<void> {}

  /** Enqueues once per idempotency key and rejects key/job collisions. */
  public async enqueue(
    input: EnqueueDurableCommunicationInput<TJob>,
  ): Promise<DurableCommunicationEnqueueResult<TJob>> {
    const idempotencyKey = normalizeText(input.idempotencyKey, 'idempotencyKey');
    const jobId = normalizeText(input.job?.id, 'job.id');
    normalizeText(input.job?.thid, 'job.thid');
    const existingId = this.idempotencyIndex.get(idempotencyKey);
    if (existingId) {
      const existing = this.records.get(existingId)!;
      if (existing.job.id !== jobId
        || existing.job.thid !== input.job.thid
        || (existing.job.idempotencyDigest
          && input.job.idempotencyDigest
          && existing.job.idempotencyDigest !== input.job.idempotencyDigest)) {
        throw new Error('Durable Communication outbox idempotency key collision.');
      }
      return { record: clone(existing), created: false };
    }
    if (this.records.has(jobId)) {
      throw new Error(`Durable Communication outbox record already exists: ${jobId}`);
    }
    this.sequence += 1;
    const now = new Date().toISOString();
    const record: DurableCommunicationOutboxRecord<TJob> = {
      id: jobId,
      idempotencyKey,
      job: clone(input.job),
      priority: input.priority || WalletMessagePriorities.Normal,
      sequence: this.sequence,
      revision: 0,
      status: DurableCommunicationOutboxStatuses.Pending,
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
      availableAt: input.availableAt || now,
    };
    this.records.set(record.id, record);
    this.idempotencyIndex.set(idempotencyKey, record.id);
    return { record: clone(record), created: true };
  }

  public async get(recordId: string): Promise<DurableCommunicationOutboxRecord<TJob> | undefined> {
    const record = this.records.get(String(recordId || '').trim());
    return record ? clone(record) : undefined;
  }

  public async getByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<DurableCommunicationOutboxRecord<TJob> | undefined> {
    const recordId = this.idempotencyIndex.get(String(idempotencyKey || '').trim());
    return recordId ? this.get(recordId) : undefined;
  }

  public async list(
    query: DurableCommunicationOutboxQuery = {},
  ): Promise<DurableCommunicationOutboxRecord<TJob>[]> {
    const statuses = asSet(query.status);
    const priorities = asSet(query.priority);
    return orderedDurableRecords(this.records.values())
      .filter((record) => !statuses || statuses.has(record.status))
      .filter((record) => !priorities || priorities.has(record.priority))
      .filter((record) => !query.draftId || record.job.draftId === query.draftId)
      .filter((record) => !query.thid || record.job.thid === query.thid)
      .map((record) => clone(record));
  }

  /** Atomically claims the next due pending/retryable record by priority then FIFO. */
  public async claimNext(
    input: ClaimDurableCommunicationInput,
  ): Promise<DurableCommunicationOutboxRecord<TJob> | undefined> {
    const workerId = normalizeText(input.workerId, 'workerId');
    const now = input.now || new Date().toISOString();
    const next = orderedDurableRecords(this.records.values()).find((record) =>
      (record.status === DurableCommunicationOutboxStatuses.Pending
        || record.status === DurableCommunicationOutboxStatuses.Retryable
        || (record.status === DurableCommunicationOutboxStatuses.Submitting
          && !!record.leaseUntil
          && record.leaseUntil <= now))
      && record.availableAt <= now);
    if (!next) return undefined;
    const updated: DurableCommunicationOutboxRecord<TJob> = {
      ...next,
      status: DurableCommunicationOutboxStatuses.Submitting,
      attemptCount: next.attemptCount + 1,
      revision: next.revision + 1,
      updatedAt: now,
      lastAttemptAt: now,
      leaseOwner: workerId,
      leaseUntil: new Date(new Date(now).getTime() + (input.leaseMs ?? 30_000)).toISOString(),
      lastError: undefined,
    };
    this.records.set(updated.id, updated);
    return clone(updated);
  }

  /** Applies one compare-and-swap lifecycle transition and retains audit metadata. */
  public async transition(
    recordId: string,
    input: TransitionDurableCommunicationInput,
  ): Promise<DurableCommunicationOutboxRecord<TJob>> {
    const normalizedId = normalizeText(recordId, 'recordId');
    const current = this.records.get(normalizedId);
    if (!current) throw new Error(`Durable Communication outbox record not found: ${normalizedId}`);
    if (current.revision !== input.expectedRevision) {
      throw new Error(`Durable Communication outbox revision conflict: ${normalizedId}`);
    }
    if (input.status !== current.status && !DurableTransitions[current.status].includes(input.status)) {
      throw new Error(`Invalid durable Communication outbox transition: ${current.status} -> ${input.status}`);
    }
    const updatedAt = input.updatedAt || new Date().toISOString();
    const updated: DurableCommunicationOutboxRecord<TJob> = {
      ...current,
      status: input.status,
      revision: current.revision + 1,
      updatedAt,
      ...(input.availableAt ? { availableAt: input.availableAt } : {}),
      ...(input.receipt ? { receipt: clone(input.receipt) } : {}),
      ...(input.error
        ? { lastError: { ...input.error, occurredAt: input.error.occurredAt || updatedAt } }
        : {}),
      ...(input.status === DurableCommunicationOutboxStatuses.Accepted ? { acceptedAt: updatedAt } : {}),
      ...(input.status === DurableCommunicationOutboxStatuses.Confirmed ? { confirmedAt: updatedAt } : {}),
      leaseOwner: undefined,
      leaseUntil: undefined,
    };
    this.records.set(normalizedId, updated);
    return clone(updated);
  }
}
