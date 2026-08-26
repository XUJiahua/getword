import type { Metadata } from "next";

import { HanziApp } from "@/components/hanzi-app";

export const metadata: Metadata = {
  title: "看拼音写汉字练习纸 | Getword",
  description:
    "生成看拼音写汉字、描红、抄写、听写和笔顺练习纸，支持部编版一到六年级教材词库与 A4 打印。",
};

export default function HanziPage() {
  return <HanziApp />;
}
