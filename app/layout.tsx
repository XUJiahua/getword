import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "英语词汇练习纸 | Getword",
  description:
    "把中英词条生成适合打印的 A4 英语单词练习纸，支持中文写英文、首字母提示、听写和答案页。",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
