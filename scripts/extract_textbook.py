#!/usr/bin/env python3
"""
从「部编/统编版小学语文」官方电子教材 PDF 中提取识字表 / 写字表 / 词语表，
输出 JSON 结构化数据，按课次（lesson）组织。

依赖：Poppler 的 pdftotext（macOS: `brew install poppler`）

用法：
    python3 scripts/extract_textbook.py \\
        --pdf "PDF/统编版/四年级/下册/义务教育教科书·语文四年级下册.pdf" \\
        --grade 4 --semester 下 \\
        --out data/sources/grade4b.json
"""

from __future__ import annotations
import argparse
import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

CJK_RE = re.compile(r"[一-鿿]")
LESSON_LINE = re.compile(r"^\s*(\d+)\s+(.+?)\s*$")
YUWEN_YUANDI = "语文园地"
SECTION_MARKERS = {
    "shizibiao": ("识 字 表", "识字表"),
    "xiezibiao": ("写 字 表", "写字表"),
    "ciyubiao": ("词 语 表", "词语表"),
}
# 「统编版」三个水印字会在版心右下角作为页脚出现，与字表内容无关，全局剔除。
WATERMARK_CHARS = {"版", "编", "统"}
# 词语表是文末最后一节，没有下一节做切分锚点；遇到这些后续章节标题即截断。
CIYU_TERMINATORS = ("后 记", "后记")


def run_pdftotext(pdf: Path) -> str:
    res = subprocess.run(
        ["pdftotext", "-layout", str(pdf), "-"],
        capture_output=True, text=True, check=True,
    )
    return res.stdout


def cjk_only(s: str) -> list[str]:
    return [c for c in s if CJK_RE.match(c) and c not in WATERMARK_CHARS]


def split_sections(full_text: str) -> dict[str, str]:
    """
    粗切三大表。返回 {"shizibiao": "...", "xiezibiao": "...", "ciyubiao": "..."}。
    依据各表标题（含全角空格）作为锚点。
    """
    anchors: list[tuple[int, str]] = []
    for key, (marker, _) in SECTION_MARKERS.items():
        idx = full_text.find(marker)
        if idx == -1:
            print(f"warn: 找不到 {marker}", file=sys.stderr)
            continue
        anchors.append((idx, key))
    anchors.sort()

    out: dict[str, str] = {}
    for i, (idx, key) in enumerate(anchors):
        end = anchors[i + 1][0] if i + 1 < len(anchors) else len(full_text)
        out[key] = full_text[idx:end]
    return out


def is_footer_or_noise(line: str) -> bool:
    """
    过滤页眉页脚水印「版/编/统」和孤立页码。
    保守起见：如果一行只含 0-3 个 CJK 字，且不以数字开头，则视为噪声。
    """
    stripped = line.strip()
    if not stripped:
        return True
    # 整行没有 CJK 也没有阿拉伯数字 → 大概率是拼音行
    if not CJK_RE.search(stripped) and not re.search(r"\d", stripped):
        return True
    # 单字水印「版」「编」「统」「页码」
    if stripped in {"版", "编", "统"}:
        return True
    if re.fullmatch(r"\d{1,3}", stripped):
        return True
    return False


def parse_shizibiao(text: str) -> tuple[dict[int, list[str]], dict[str, list[str]]]:
    """
    识字表解析。返回:
      lessons: {lesson_no: [chars]}
      yuwen_yuandi: {"after_lesson_X": [extra polyphone chars]}
    多音字（语文园地 行）单独归一处，不计入 lessons。
    续行（没有 lesson 数字开头但有 CJK）合并到上一 lesson。
    """
    lessons: dict[int, list[str]] = {}
    yuandi: dict[str, list[str]] = {}
    current_lesson: int | None = None
    last_lesson_seen: int | None = None
    current_yuandi_key: str | None = None

    for raw in text.splitlines():
        line = raw.rstrip()
        if not line.strip():
            continue
        if "识 字 表" in line:
            continue
        if "（共" in line and "生字" in line:
            continue
        if "蓝色的字是多音字" in line:
            continue
        if is_footer_or_noise(line):
            continue

        # 拼音行（无 CJK）已经被 is_footer_or_noise 拦截
        # 接下来是 lesson 数字开头 / 语文园地行 / 续行

        if YUWEN_YUANDI in line:
            # 语文园地行：把所有 CJK 字提出来（去掉 "语文园地" 字样）
            after = line.split(YUWEN_YUANDI, 1)[1]
            chars = cjk_only(after)
            key = f"after_lesson_{last_lesson_seen}" if last_lesson_seen else "head"
            yuandi.setdefault(key, []).extend(chars)
            current_lesson = None
            current_yuandi_key = key
            continue

        m = LESSON_LINE.match(line)
        if m and m.group(1).isdigit() and CJK_RE.search(m.group(2)):
            num = int(m.group(1))
            chars = cjk_only(m.group(2))
            lessons.setdefault(num, []).extend(chars)
            current_lesson = num
            last_lesson_seen = num
            current_yuandi_key = None
            continue

        # 续行：纯 CJK + 空白
        if CJK_RE.search(line):
            chars = cjk_only(line)
            if current_lesson is not None:
                lessons[current_lesson].extend(chars)
            elif current_yuandi_key is not None:
                yuandi[current_yuandi_key].extend(chars)

    return lessons, yuandi


def parse_xiezibiao(text: str) -> dict[int, list[str]]:
    """
    写字表：每行 `<num> <chars no spaces>`，无拼音行，结构最规则。
    """
    lessons: dict[int, list[str]] = {}
    current: int | None = None
    for raw in text.splitlines():
        line = raw.rstrip()
        if not line.strip():
            continue
        if "写 字 表" in line:
            continue
        if "（共" in line and ("生字" in line or "个字" in line):
            continue
        if is_footer_or_noise(line):
            continue
        m = LESSON_LINE.match(line)
        if m and m.group(1).isdigit() and CJK_RE.search(m.group(2)):
            num = int(m.group(1))
            chars = cjk_only(m.group(2))
            lessons.setdefault(num, []).extend(chars)
            current = num
        elif CJK_RE.search(line) and current is not None:
            lessons[current].extend(cjk_only(line))
    return lessons


def parse_ciyubiao(text: str) -> dict[int, list[str]]:
    """
    词语表：`<num>   词  词  词` 多空格分隔；可能多行续接。
    每个词由连续 CJK 字符组成，空格切词。
    词语表后紧跟「后记」与封底文字，需在终止标记处截断，否则后记会被吞入末课。
    """
    lessons: dict[int, list[str]] = {}
    current: int | None = None
    for raw in text.splitlines():
        line = raw.rstrip()
        if any(t in line for t in CIYU_TERMINATORS):
            break
        if not line.strip():
            continue
        if "词 语 表" in line:
            continue
        if is_footer_or_noise(line):
            continue
        m = LESSON_LINE.match(line)
        if m and m.group(1).isdigit() and CJK_RE.search(m.group(2)):
            num = int(m.group(1))
            words = extract_words(m.group(2))
            lessons.setdefault(num, []).extend(words)
            current = num
        elif CJK_RE.search(line) and current is not None:
            words = extract_words(line)
            lessons[current].extend(words)
    return lessons


def extract_words(s: str) -> list[str]:
    """
    从一行（去掉前导编号后）中抽词：连续 CJK 字符为一词，空白/非 CJK 切分。
    切词前先抹掉「版/编/统」三个页脚水印字，避免它们粘在邻接词尾。
    """
    cleaned = "".join(c for c in s if c not in WATERMARK_CHARS)
    return [w for w in re.split(r"[^一-鿿]+", cleaned) if w]


def merge_lessons(
    xiezi: dict[int, list[str]],
    shizi: dict[int, list[str]],
    ciyu: dict[int, list[str]],
) -> list[dict]:
    nums = sorted(set(xiezi) | set(shizi) | set(ciyu))
    out = []
    for n in nums:
        out.append({
            "lesson_no": n,
            "write_chars": xiezi.get(n, []),
            "recognize_chars": shizi.get(n, []),
            "words": ciyu.get(n, []),
        })
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True, type=Path)
    ap.add_argument("--grade", required=True, type=int)
    ap.add_argument("--semester", required=True, choices=["上", "下"])
    ap.add_argument("--edition", default="统编版")
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()

    full = run_pdftotext(args.pdf)
    sections = split_sections(full)

    shizi, polyphone = parse_shizibiao(sections.get("shizibiao", ""))
    xiezi = parse_xiezibiao(sections.get("xiezibiao", ""))
    ciyu = parse_ciyubiao(sections.get("ciyubiao", ""))

    lessons = merge_lessons(xiezi, shizi, ciyu)

    payload = {
        "edition": args.edition,
        "grade": args.grade,
        "semester": args.semester,
        "source": {
            "publisher": "人民教育出版社",
            "pdf_filename": args.pdf.name,
            "extracted_at": date.today().isoformat(),
            "extractor": "pdftotext -layout (poppler) + scripts/extract_textbook.py",
        },
        "lessons": lessons,
        "polyphone_chars": polyphone,
        "stats": {
            "lesson_count": len(lessons),
            "write_chars_total": sum(len(l["write_chars"]) for l in lessons),
            "recognize_chars_total": sum(len(l["recognize_chars"]) for l in lessons),
            "words_total": sum(len(l["words"]) for l in lessons),
        },
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"wrote {args.out}")
    print(f"stats: {payload['stats']}")


if __name__ == "__main__":
    main()
