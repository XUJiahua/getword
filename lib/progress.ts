import type { EntryFilter, WordEntry } from "@/lib/worksheet";

export const REVIEW_INTERVAL_DAYS = 7;
const REVIEW_INTERVAL_MS = REVIEW_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

export type MasteryStatus = "new" | "learning" | "mastered";
export type StoredMasteryStatus = Exclude<MasteryStatus, "new">;

export type ProgressRecord = {
  status: StoredMasteryStatus;
  updatedAt: string;
};

export type ProgressMap = Record<string, ProgressRecord>;

function isStoredStatus(value: unknown): value is StoredMasteryStatus {
  return value === "learning" || value === "mastered";
}

function hasValidDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function normalizeProgress(
  value: unknown,
  legacyLearningIds: unknown,
  now = new Date(),
): ProgressMap {
  const progress: ProgressMap = {};

  if (value && typeof value === "object" && !Array.isArray(value)) {
    Object.entries(value).forEach(([entryId, record]) => {
      if (!record || typeof record !== "object" || Array.isArray(record)) return;
      const candidate = record as Partial<ProgressRecord>;
      if (!isStoredStatus(candidate.status) || !hasValidDate(candidate.updatedAt)) return;
      progress[entryId] = {
        status: candidate.status,
        updatedAt: candidate.updatedAt,
      };
    });
  }

  if (Array.isArray(legacyLearningIds)) {
    legacyLearningIds.forEach((entryId) => {
      if (typeof entryId !== "string" || progress[entryId]) return;
      progress[entryId] = {
        status: "learning",
        updatedAt: now.toISOString(),
      };
    });
  }

  return progress;
}

export function getMasteryStatus(
  progress: ProgressMap,
  entryId: string,
): MasteryStatus {
  return progress[entryId]?.status ?? "new";
}

export function setMasteryStatus(
  progress: ProgressMap,
  entryId: string,
  status: MasteryStatus,
  now = new Date(),
): ProgressMap {
  const next = { ...progress };
  if (status === "new") {
    delete next[entryId];
    return next;
  }

  next[entryId] = { status, updatedAt: now.toISOString() };
  return next;
}

export function isReviewDue(record: ProgressRecord | undefined, now = new Date()): boolean {
  if (!record) return false;
  if (record.status === "learning") return true;
  return now.getTime() - Date.parse(record.updatedAt) >= REVIEW_INTERVAL_MS;
}

export function filterEntriesByProgress(
  entries: WordEntry[],
  filter: EntryFilter,
  progress: ProgressMap,
  now = new Date(),
): WordEntry[] {
  if (filter === "all") return entries;

  return entries.filter((entry) => {
    const record = progress[entry.id];
    const status = record?.status ?? "new";
    if (filter === "unmastered") return status !== "mastered";
    if (filter === "learning") return status === "learning";
    if (filter === "mastered") return status === "mastered";
    return isReviewDue(record, now);
  });
}

export function getProgressCounts(
  entries: WordEntry[],
  progress: ProgressMap,
  now = new Date(),
) {
  let learning = 0;
  let mastered = 0;
  let review = 0;

  entries.forEach((entry) => {
    const record = progress[entry.id];
    if (record?.status === "learning") learning += 1;
    if (record?.status === "mastered") mastered += 1;
    if (isReviewDue(record, now)) review += 1;
  });

  return {
    learning,
    mastered,
    review,
    unmastered: entries.length - mastered,
  };
}
