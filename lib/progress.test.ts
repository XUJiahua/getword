import { describe, expect, it } from "vitest";

import {
  filterEntriesByProgress,
  getMasteryStatus,
  getProgressCounts,
  isReviewDue,
  normalizeProgress,
  recordPracticeResult,
  setMasteryStatus,
  type ProgressMap,
} from "./progress";

const NOW = new Date("2026-08-25T12:00:00.000Z");
const entries = [
  { id: "new", chinese: "新的", english: "new" },
  { id: "learning", chinese: "生词", english: "word" },
  { id: "fresh", chinese: "刚掌握", english: "fresh" },
  { id: "due", chinese: "需复习", english: "review" },
];

const progress: ProgressMap = {
  learning: {
    intervalDays: 0,
    nextReviewAt: "2026-08-25T10:00:00.000Z",
    status: "learning",
    streak: 0,
    updatedAt: "2026-08-25T10:00:00.000Z",
  },
  fresh: {
    intervalDays: 7,
    nextReviewAt: "2026-08-30T12:00:00.000Z",
    status: "mastered",
    streak: 3,
    updatedAt: "2026-08-23T12:00:00.000Z",
  },
  due: {
    intervalDays: 7,
    nextReviewAt: "2026-08-25T12:00:00.000Z",
    status: "mastered",
    streak: 3,
    updatedAt: "2026-08-18T12:00:00.000Z",
  },
};

describe("progress helpers", () => {
  it("migrates valid legacy learning ids and ignores malformed records", () => {
    expect(
      normalizeProgress(
        {
          saved: { status: "mastered", updatedAt: "2026-08-20T12:00:00.000Z" },
          broken: { status: "mastered", updatedAt: "not-a-date" },
        },
        ["legacy", "saved", 42],
        NOW,
      ),
    ).toEqual({
      saved: {
        intervalDays: 7,
        nextReviewAt: "2026-08-27T12:00:00.000Z",
        status: "mastered",
        streak: 3,
        updatedAt: "2026-08-20T12:00:00.000Z",
      },
      legacy: {
        intervalDays: 0,
        nextReviewAt: NOW.toISOString(),
        status: "learning",
        streak: 0,
        updatedAt: NOW.toISOString(),
      },
    });
  });

  it("sets and clears mastery status without mutating the original map", () => {
    const mastered = setMasteryStatus({}, "word", "mastered", NOW);
    expect(getMasteryStatus(mastered, "word")).toBe("mastered");
    expect(mastered.word).toMatchObject({ intervalDays: 1, streak: 1 });
    expect(setMasteryStatus(mastered, "word", "new", NOW)).toEqual({});
    expect(mastered.word.status).toBe("mastered");
  });

  it("uses the stored next-review time for learning and mastered words", () => {
    expect(isReviewDue(progress.learning, NOW)).toBe(true);
    expect(isReviewDue(progress.fresh, NOW)).toBe(false);
    expect(isReviewDue(progress.due, NOW)).toBe(true);
  });

  it("advances correct answers through the adaptive schedule and resets misses", () => {
    const first = recordPracticeResult({}, "word", "correct", NOW);
    const second = recordPracticeResult(
      first,
      "word",
      "correct",
      new Date("2026-08-26T12:00:00.000Z"),
    );
    const third = recordPracticeResult(
      second,
      "word",
      "correct",
      new Date("2026-08-29T12:00:00.000Z"),
    );
    const fourth = recordPracticeResult(
      third,
      "word",
      "correct",
      new Date("2026-09-05T12:00:00.000Z"),
    );
    const fifth = recordPracticeResult(
      fourth,
      "word",
      "correct",
      new Date("2026-09-19T12:00:00.000Z"),
    );
    const sixth = recordPracticeResult(
      fifth,
      "word",
      "correct",
      new Date("2026-10-19T12:00:00.000Z"),
    );
    expect(first.word).toMatchObject({ intervalDays: 1, streak: 1 });
    expect(second.word).toMatchObject({ intervalDays: 3, streak: 2 });
    expect(third.word).toMatchObject({ intervalDays: 7, streak: 3 });
    expect(fourth.word).toMatchObject({ intervalDays: 14, streak: 4 });
    expect(fifth.word).toMatchObject({ intervalDays: 30, streak: 5 });
    expect(sixth.word).toMatchObject({ intervalDays: 30, streak: 6 });

    const unsure = recordPracticeResult(third, "word", "unsure", NOW);
    expect(unsure.word).toMatchObject({ intervalDays: 1, status: "learning", streak: 0 });
    expect(isReviewDue(unsure.word, NOW)).toBe(false);

    const wrong = recordPracticeResult(third, "word", "wrong", NOW);
    expect(wrong.word).toMatchObject({ intervalDays: 0, status: "learning", streak: 0 });
    expect(isReviewDue(wrong.word, NOW)).toBe(true);
  });

  it("filters each local wordbook and reports progress counts", () => {
    expect(filterEntriesByProgress(entries, "unmastered", progress, NOW).map((x) => x.id))
      .toEqual(["new", "learning"]);
    expect(filterEntriesByProgress(entries, "learning", progress, NOW).map((x) => x.id))
      .toEqual(["learning"]);
    expect(filterEntriesByProgress(entries, "mastered", progress, NOW).map((x) => x.id))
      .toEqual(["fresh", "due"]);
    expect(filterEntriesByProgress(entries, "review", progress, NOW).map((x) => x.id))
      .toEqual(["learning", "due"]);
    expect(getProgressCounts(entries, progress, NOW)).toEqual({
      learning: 1,
      mastered: 2,
      review: 2,
      unmastered: 2,
    });
  });
});
