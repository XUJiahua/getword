import { serializeEntries, type WordEntry } from "@/lib/worksheet";

export type WordBank = {
  key: string;
  name: string;
  description: string;
  title: string;
  entries: WordEntry[];
};

function entry(
  chinese: string,
  english: string,
  partOfSpeech: string,
  example: string,
): WordEntry {
  return {
    id: `sample-${english.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    chinese,
    english,
    partOfSpeech,
    example,
  };
}

export const WORD_BANKS: WordBank[] = [
  {
    key: "people",
    name: "示例：人物特点",
    description: "10 个小学常用人物描写词，请按实际教材校对。",
    title: "英语单词练习 · 人物特点",
    entries: [
      entry("年老的", "old", "adj.", "My grandpa is ____."),
      entry("年轻的", "young", "adj.", "The new teacher is ____."),
      entry("滑稽的；有趣的", "funny", "adj.", "The story is ____."),
      entry("友好的；体贴的", "kind", "adj.", "She is ____ to everyone."),
      entry("要求严格的", "strict", "adj.", "Our teacher is ____."),
      entry("有礼貌的", "polite", "adj.", "He is a ____ boy."),
      entry("工作努力的", "hard-working", "adj.", "Amy is very ____."),
      entry("愿意帮忙的", "helpful", "adj.", "Robin is ____ at home."),
      entry("聪明的", "clever", "adj.", "The little dog is ____."),
      entry("羞怯的；腼腆的", "shy", "adj.", "The child is a little ____."),
    ],
  },
  {
    key: "school-day",
    name: "示例：校园日常",
    description: "12 个常用单词与词块，包含单词和短语。",
    title: "英语单词练习 · 校园日常",
    entries: [
      entry("星期一", "Monday", "n.", "We have English on ____."),
      entry("星期二", "Tuesday", "n.", "Today is ____."),
      entry("星期三", "Wednesday", "n.", "____ is in the middle of the week."),
      entry("星期四", "Thursday", "n.", "The art class is on ____."),
      entry("星期五", "Friday", "n.", "I like ____."),
      entry("周末", "weekend", "n.", "What do you do on the ____?"),
      entry("做作业", "do homework", "phr.", "I ____ after school."),
      entry("看电视", "watch TV", "phr.", "We ____ in the evening."),
      entry("读书", "read books", "phr.", "I often ____ at home."),
      entry("踢足球", "play football", "phr.", "They ____ after class."),
      entry("洗衣服", "wash clothes", "phr.", "I can ____ at home."),
      entry("做运动", "play sports", "phr.", "We often ____ together."),
    ],
  },
];

export const DEFAULT_BANK = WORD_BANKS[0];
export const DEFAULT_SOURCE = serializeEntries(DEFAULT_BANK.entries);
