import { getMasteryStatus, isReviewDue, type ProgressMap } from "./progress";
import {
  seededShuffle,
  type WordEntry,
} from "./worksheet";
import {
  type PracticeSession,
} from "./study-data";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DailyPlan = {
  dueCount: number;
  entries: WordEntry[];
  newCount: number;
};

export type WorksheetVariant = {
  entries: WordEntry[];
  label: string;
};

export type ReportSession = {
  code: string;
  correct: number;
  createdAt: string;
  marked: number;
  title: string;
  total: number;
};

export type AttentionEntry = WordEntry & {
  attempts: number;
  correct: number;
  unsure: number;
  wrong: number;
};

export type ReviewDay = {
  count: number;
  date: string;
  dayOffset: number;
};

export type StudyReport = {
  accuracy: number | null;
  attention: AttentionEntry[];
  correct: number;
  due: number;
  learning: number;
  marked: number;
  mastered: number;
  newCount: number;
  recentSessions: ReportSession[];
  reviewDays: ReviewDay[];
  total: number;
};

function dateSeed(date: Date): number {
  const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let seed = 2166136261;
  for (const character of dateKey) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

export function buildDailyPlan(
  entries: WordEntry[],
  progress: ProgressMap,
  target: number,
  now = new Date(),
): DailyPlan {
  const safeTarget = Math.max(1, Math.floor(target));
  const originalOrder = new Map(entries.map((entry, index) => [entry.id, index]));
  const dueEntries = entries
    .filter((entry) => isReviewDue(progress[entry.id], now))
    .sort((left, right) => {
      const leftRecord = progress[left.id];
      const rightRecord = progress[right.id];
      if (leftRecord.status !== rightRecord.status) {
        return leftRecord.status === "learning" ? -1 : 1;
      }
      const dueDifference =
        Date.parse(leftRecord.nextReviewAt) - Date.parse(rightRecord.nextReviewAt);
      return dueDifference || (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0);
    });
  const dueIds = new Set(dueEntries.map((entry) => entry.id));
  const newEntries = seededShuffle(
    entries.filter(
      (entry) => !dueIds.has(entry.id) && getMasteryStatus(progress, entry.id) === "new",
    ),
    dateSeed(now),
  );
  const planned = [...dueEntries, ...newEntries].slice(0, safeTarget);
  const plannedDueIds = new Set(dueEntries.slice(0, safeTarget).map((entry) => entry.id));

  return {
    dueCount: planned.filter((entry) => plannedDueIds.has(entry.id)).length,
    entries: planned,
    newCount: planned.filter((entry) => !plannedDueIds.has(entry.id)).length,
  };
}

export function buildWorksheetVariants(
  entries: WordEntry[],
  count: number,
  seed: number,
): WorksheetVariant[] {
  const safeCount = Math.min(3, Math.max(1, Math.floor(count)));
  if (safeCount === 1) return [{ entries: [...entries], label: "" }];

  return Array.from({ length: safeCount }, (_, index) => ({
    entries: seededShuffle(entries, seed + (index + 1) * 104729),
    label: `${String.fromCharCode(65 + index)}卷`,
  }));
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getReviewDayOffset(nextReviewAt: string, now: Date): number {
  const today = startOfLocalDay(now).getTime();
  const reviewDate = startOfLocalDay(new Date(nextReviewAt)).getTime();
  return Math.max(0, Math.round((reviewDate - today) / DAY_MS));
}

export function buildStudyReport(
  entries: WordEntry[],
  progress: ProgressMap,
  sessions: PracticeSession[],
  now = new Date(),
): StudyReport {
  const entryIds = new Set(entries.map((entry) => entry.id));
  const stats = new Map<string, Omit<AttentionEntry, keyof WordEntry>>();
  const recentSessions: ReportSession[] = [];
  let marked = 0;
  let correct = 0;

  sessions.forEach((session) => {
    let sessionMarked = 0;
    let sessionCorrect = 0;
    session.entries.forEach((entry) => {
      if (!entryIds.has(entry.id)) return;
      const result = session.results[entry.id];
      if (!result) return;
      sessionMarked += 1;
      marked += 1;
      if (result === "correct") {
        sessionCorrect += 1;
        correct += 1;
      }
      const current = stats.get(entry.id) ?? {
        attempts: 0,
        correct: 0,
        unsure: 0,
        wrong: 0,
      };
      current.attempts += 1;
      current[result] += 1;
      stats.set(entry.id, current);
    });

    if (sessionMarked > 0 && recentSessions.length < 5) {
      recentSessions.push({
        code: session.code,
        correct: sessionCorrect,
        createdAt: session.createdAt,
        marked: sessionMarked,
        title: session.title,
        total: session.entries.filter((entry) => entryIds.has(entry.id)).length,
      });
    }
  });

  const attention = entries
    .filter((entry) => {
      const status = getMasteryStatus(progress, entry.id);
      const result = stats.get(entry.id);
      return status === "learning" || isReviewDue(progress[entry.id], now) || Boolean(result?.wrong || result?.unsure);
    })
    .map((entry) => ({
      ...entry,
      ...(stats.get(entry.id) ?? { attempts: 0, correct: 0, unsure: 0, wrong: 0 }),
    }))
    .sort((left, right) => {
      const scoreDifference =
        right.wrong * 3 + right.unsure * 2 - (left.wrong * 3 + left.unsure * 2);
      if (scoreDifference) return scoreDifference;
      const leftDue = isReviewDue(progress[left.id], now) ? 1 : 0;
      const rightDue = isReviewDue(progress[right.id], now) ? 1 : 0;
      return rightDue - leftDue || right.attempts - left.attempts;
    })
    .slice(0, 12);

  const reviewCounts = Array.from({ length: 7 }, () => 0);
  entries.forEach((entry) => {
    const record = progress[entry.id];
    if (!record) return;
    const offset = getReviewDayOffset(record.nextReviewAt, now);
    if (offset < reviewCounts.length) reviewCounts[offset] += 1;
  });
  const reviewDays = reviewCounts.map((count, dayOffset) => ({
    count,
    date: new Date(startOfLocalDay(now).getTime() + dayOffset * DAY_MS).toISOString(),
    dayOffset,
  }));

  let learning = 0;
  let mastered = 0;
  let due = 0;
  entries.forEach((entry) => {
    const status = getMasteryStatus(progress, entry.id);
    if (status === "learning") learning += 1;
    if (status === "mastered") mastered += 1;
    if (isReviewDue(progress[entry.id], now)) due += 1;
  });

  return {
    accuracy: marked ? Math.round((correct / marked) * 100) : null,
    attention,
    correct,
    due,
    learning,
    marked,
    mastered,
    newCount: entries.length - learning - mastered,
    recentSessions,
    reviewDays,
    total: entries.length,
  };
}
