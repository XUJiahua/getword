import { describe, expect, it } from "vitest";

import {
  autoPinyin,
  chineseChars,
  filterHanziWords,
  paginateHanziItems,
  splitItemPinyin,
  splitWords,
  wordsForBank,
  type HanziBank,
} from "./hanzi";

describe("hanzi worksheet helpers", () => {
  it("parses unique lines containing Chinese characters", () => {
    expect(splitWords(" 春天 \n学校\n春天\nEnglish\n音乐！")).toEqual([
      "春天",
      "学校",
      "音乐！",
    ]);
  });

  it("extracts Chinese characters and generates word-aware pinyin", () => {
    expect(chineseChars("音乐！A")).toEqual(["音", "乐"]);
    expect(autoPinyin("音乐")).toBe("yīn yuè");
  });

  it("aligns manually edited pinyin with characters", () => {
    expect(splitItemPinyin({ word: "长大", pinyin: "zhǎng dà" })).toEqual([
      "zhǎng",
      "dà",
    ]);
    expect(splitItemPinyin({ word: "学校", pinyin: "xué" })).toEqual(["xué", ""]);
  });

  it("filters records and paginates the selected words", () => {
    const words = ["春天", "学校", "认真"];
    const records = { 学校: "mastered", 认真: "learning" } as const;
    expect(filterHanziWords(words, "hideMastered", records)).toEqual(["春天", "认真"]);
    expect(filterHanziWords(words, "onlyLearning", records)).toEqual(["认真"]);
    expect(paginateHanziItems(words, 2)).toEqual([["春天", "学校"], ["认真"]]);
  });

  it("loads a unit or the whole textbook without duplicates", () => {
    const bank = {
      units: [
        { key: "u1", words: ["春天", "学校"] },
        { key: "u2", words: ["学校", "认真"] },
      ],
    } as HanziBank;
    expect(wordsForBank(bank, "u1")).toEqual(["春天", "学校"]);
    expect(wordsForBank(bank, "")).toEqual(["春天", "学校", "认真"]);
  });
});
