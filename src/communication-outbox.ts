// Copyright 2026 Antifraud Services Inc. under the Apache License, Version 2.0.

import type {
  CommunicationDraft,
  CommunicationOutboxJob,
  CommunicationOutboxStatus,
  OutboxJob,
} from './communication-draft.js';

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
