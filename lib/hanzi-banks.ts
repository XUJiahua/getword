export const HANZI_BANKS = [
  { key: "grade1a", name: "一年级上册", short: "一上" },
  { key: "grade1b", name: "一年级下册", short: "一下" },
  { key: "grade2a", name: "二年级上册", short: "二上" },
  { key: "grade2b", name: "二年级下册", short: "二下" },
  { key: "grade3a", name: "三年级上册", short: "三上" },
  { key: "grade3b", name: "三年级下册", short: "三下" },
  { key: "grade4a", name: "四年级上册", short: "四上" },
  { key: "grade4b", name: "四年级下册", short: "四下" },
  { key: "grade5a", name: "五年级上册", short: "五上" },
  { key: "grade5b", name: "五年级下册", short: "五下" },
  { key: "grade6a", name: "六年级上册", short: "六上" },
  { key: "grade6b", name: "六年级下册", short: "六下" },
] as const;

export type HanziBankKey = (typeof HANZI_BANKS)[number]["key"];

export function isHanziBankKey(value: string): value is HanziBankKey {
  return HANZI_BANKS.some((bank) => bank.key === value);
}

export function hanziBankUrl(key: HanziBankKey): string {
  return `/data/hanzi/${key}.json`;
}
