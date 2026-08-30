import { describe, expect, it } from "vitest";

import type { ProgressMap } from "./progress";
import {
  buildDailyPlan,
  buildStudyReport,
  buildWorksheetVariants,
} from "./planning";
import { createPracticeSession, setSessionResult } from "./study-data";

const NOW = new Date("2026-08-25T12:00:00.000Z");
const entries = [
  { id: "new-one", chinese: "苹果", english: "apple" },
  { id: "future", chinese: "香蕉", english: "banana" },
  { id: "due-mastered", chinese: "梨", english: "pear" },
  { id: "due-learning", chinese: "桃子", english: "peach" },
  { id: "new-two", chinese: "葡萄", english: "grape" },
];
const progress: ProgressMap = {
  future: {
    intervalDays: 3,
    nextReviewAt: "2026-08-28T12:00:00.000Z",
    status: "mastered",
    streak: 2,
    updatedAt: "2026-08-25T12:00:00.000Z",
  },
  "due-mastered": {
    intervalDays: 3,
    nextReviewAt: "2026-08-24T12:00:00.000Z",
    status: "mastered",
    streak: 2,
    updatedAt: "2026-08-21T12:00:00.000Z",
  },
  "due-learning": {
    intervalDays: 0,
    nextReviewAt: "2026-08-25T10:00:00.000Z",
    status: "learning",
    streak: 0,
    updatedAt: "2026-08-25T10:00:00.000Z",
  },
};

describe("daily planning", () => {
  it("puts due learning and mastered words before new words", () => {
    const plan = buildDailyPlan(entries, progress, 3, NOW);
    expect(plan.entries.map((entry) => entry.id).slice(0, 2)).toEqual([
      "due-learning",
      "due-mastered",
    ]);
    expect(plan.entries.map((entry) => entry.id)).not.toContain("future");
    expect(plan).toMatchObject({ dueCount: 2, newCount: 1 });
  });
});

describe("worksheet variants", () => {
  it("builds deterministic A/B/C orders without changing the word set", () => {
    const variants = buildWorksheetVariants(entries, 3, 42);
    expect(variants.map((variant) => variant.label)).toEqual(["A卷", "B卷", "C卷"]);
    expect(variants).toEqual(buildWorksheetVariants(entries, 3, 42));
    variants.forEach((variant) => {
      expect(variant.entries.map((entry) => entry.id).sort()).toEqual(
        entries.map((entry) => entry.id).sort(),
      );
    });
    expect(variants[0].entries.map((entry) => entry.id)).not.toEqual(
      variants[1].entries.map((entry) => entry.id),
    );
  });
});

describe("study report", () => {
  it("summarizes only recorded results belonging to the current wordbook", () => {
    const base = createPracticeSession({
      code: "ABC123",
      createdAt: "2026-08-25T08:00:00.000Z",
      entries: [...entries, { id: "other", chinese: "其他", english: "other" }],
      filterLabel: "全部词条",
      id: "session-one",
      mode: "recall",
      title: "水果",
      variantCount: 2,
    });
    const session = setSessionResult(
      setSessionResult(setSessionResult(base, "new-one", "correct"), "due-learning", "wrong"),
      "other",
      "correct",
    );
    const report = buildStudyReport(entries, progress, [session], NOW);

    expect(report).toMatchObject({
      accuracy: 50,
      correct: 1,
      due: 2,
      marked: 2,
      total: 5,
    });
    expect(report.recentSessions[0]).toMatchObject({ correct: 1, marked: 2 });
    expect(report.attention[0]).toMatchObject({ id: "due-learning", wrong: 1 });
    expect(report.reviewDays[0].count).toBe(2);
    expect(report.reviewDays[3].count).toBe(1);
  });
});
