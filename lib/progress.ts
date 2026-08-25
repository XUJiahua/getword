import type { EntryFilter, WordEntry } from "@/lib/worksheet";

export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

export type MasteryStatus = "new" | "learning" | "mastered";
export type StoredMasteryStatus = Exclude<MasteryStatus, "new">;

export type ProgressRecord = {
  intervalDays: number;
  nextReviewAt: string;
  status: StoredMasteryStatus;
  streak: number;
  updatedAt: string;
};

export type ProgressMap = Record<string, ProgressRecord>;
export type PracticeResult = "correct" | "unsure" | "wrong";

function isStoredStatus(value: unknown): value is StoredMasteryStatus {
  return value === "learning" || value === "mastered";
}

function hasValidDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function addDays(date: Date, days: number): string {
  return new Date(date.getTime() + days * DAY_MS).toISOString();
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
      const legacyInterval = candidate.status === "mastered" ? 7 : 0;
      const intervalDays =
        typeof candidate.intervalDays === "number" && candidate.intervalDays >= 0
          ? candidate.intervalDays
          : legacyInterval;
      progress[entryId] = {
        intervalDays,
        nextReviewAt: hasValidDate(candidate.nextReviewAt)
          ? candidate.nextReviewAt
          : addDays(new Date(candidate.updatedAt), intervalDays),
        status: candidate.status,
        streak:
          typeof candidate.streak === "number" && candidate.streak >= 0
            ? Math.floor(candidate.streak)
            : candidate.status === "mastered"
              ? 3
              : 0,
        updatedAt: candidate.updatedAt,
      };
    });
  }

  if (Array.isArray(legacyLearningIds)) {
    legacyLearningIds.forEach((entryId) => {
      if (typeof entryId !== "string" || progress[entryId]) return;
      progress[entryId] = {
        intervalDays: 0,
        nextReviewAt: now.toISOString(),
        status: "learning",
        streak: 0,
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
  return recordPracticeResult(
    next,
    entryId,
    status === "mastered" ? "correct" : "wrong",
    now,
  );
}

export function isReviewDue(record: ProgressRecord | undefined, now = new Date()): boolean {
  if (!record) return false;
  return Date.parse(record.nextReviewAt) <= now.getTime();
}

export function recordPracticeResult(
  progress: ProgressMap,
  entryId: string,
  result: PracticeResult,
  now = new Date(),
): ProgressMap {
  const current = progress[entryId];
  const updatedAt = now.toISOString();

  if (result === "correct") {
    const previousStreak = current?.status === "mastered" ? current.streak : 0;
    const streak = previousStreak + 1;
    const intervalDays =
      REVIEW_INTERVAL_DAYS[Math.min(streak - 1, REVIEW_INTERVAL_DAYS.length - 1)];
    return {
      ...progress,
      [entryId]: {
        intervalDays,
        nextReviewAt: addDays(now, intervalDays),
        status: "mastered",
        streak,
        updatedAt,
      },
    };
  }

  const intervalDays = result === "unsure" ? 1 : 0;
  return {
    ...progress,
    [entryId]: {
      intervalDays,
      nextReviewAt: addDays(now, intervalDays),
      status: "learning",
      streak: 0,
      updatedAt,
    },
  };
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
