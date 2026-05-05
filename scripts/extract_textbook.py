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
# 任意字/词表后可能紧接的非字表内容（笔画表、偏旁表、后记等）；
# 见到即停止解析，避免把附录文字吞入末课。一/二年级 PDF 在 「（共 N 个字）」之后
# 紧跟「常用笔画名称表」等附录，且 PDF 内 token "100" 容易被误认为一节起点。
TABLE_TERMINATORS = (
    "常用笔画", "常用偏旁", "后 记", "后记",
    # 字表末尾「（共 N 个字）」总数行；TSV 行合并时「（共」可能被切到上一行，
    # 只剩「100 个字）」这样的尾巴，匹配「个字)」「个字）」可同时覆盖。
    "个字)", "个字）", "个生字)", "个生字）",
)
# 一/二年级用「课文 / 识字 / 汉语拼音」作小节标题，每节内编号从 1 重新开始。
# 出现这些独立成行时，切换当前 section_kind；后续 lesson_no 用 "kind-N" 复合键去重。
LESSON_KIND_HEADERS = {"课文": "课文", "识字": "识字", "汉语拼音": "拼音"}


def run_pdftotext(pdf: Path) -> str:
    res = subprocess.run(
        ["pdftotext", "-layout", str(pdf), "-"],
        capture_output=True, text=True, check=True,
    )
    return res.stdout


def run_tsv_rows(pdf: Path) -> str:
    """
    一/二年级双栏字表用 TSV → 同 y 行合并的方式取文本，
    避免 layout 模式把跨栏内容拆错或丢失。同一行内可能含多个课次编号，
    后续解析在数字 token 处自动切段。
    """
    here = Path(__file__).parent
    res = subprocess.run(
        [sys.executable, str(here / "columnize.py"), "--pdf", str(pdf)],
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


LessonKey = tuple[str, int]  # (kind, lesson_no)


def parse_section(text: str, mode: str, is_ciyu: bool = False) \
        -> tuple[dict[LessonKey, list[str]], dict[str, list[str]]]:
    """
    通用字/词表解析。
      mode: "chars" 取 CJK 字（识字表/写字表）；"words" 按空白切词（词语表）。
      is_ciyu: 词语表后紧跟「后记」需在该标记处截断。
    课次键为 (kind, lesson_no)。kind 来自最近一次「课文 / 识字 / 汉语拼音」标题；
    若 PDF 中没出现这些标题（如三-六年级），kind 为空字符串。
    一行内出现多次数字 token 时按数字切段（处理一年级双栏并排「3 爸 妈 6 棋 鸡」）。
    """
    lessons: dict[LessonKey, list[str]] = {}
    polyphone: dict[str, list[str]] = {}
    current_kind = ""
    current_key: LessonKey | None = None
    current_yuandi_key: str | None = None

    def items_of(s: str) -> list[str]:
        return cjk_only(s) if mode == "chars" else extract_words(s)

    for raw in text.splitlines():
        if any(t in raw for t in TABLE_TERMINATORS):
            break
        line = raw.rstrip()
        if not line.strip():
            continue
        if any(h in line for h in ("识 字 表", "写 字 表", "词 语 表")):
            continue
        if "（共" in line and ("生字" in line or "个字" in line):
            continue
        if "蓝色的字是多音字" in line:
            continue
        if is_footer_or_noise(line):
            continue

        # 页脚水印和页码可能挤在同一物理行（如「统              121」），
        # 先剥掉水印字再判断是否纯页码，避免「121」被当作课次起点。
        stripped = line.strip()
        for ch in WATERMARK_CHARS:
            stripped = stripped.replace(ch, "")
        stripped = stripped.strip()
        if not stripped or is_footer_or_noise(stripped):
            continue

        # 节标题：「课文」「识字」「汉语拼音」单独成行
        if stripped in LESSON_KIND_HEADERS:
            current_kind = LESSON_KIND_HEADERS[stripped]
            current_key = None
            current_yuandi_key = None
            continue

        # 「语文园地」行：标签后字符归入多音字补充篮
        if YUWEN_YUANDI in stripped:
            after = stripped.split(YUWEN_YUANDI, 1)[1]
            its = items_of(after)
            tag = f"after_{current_key[0]}-{current_key[1]}" if current_key else "head"
            polyphone.setdefault(tag, []).extend(its)
            current_yuandi_key = tag
            current_key = None
            continue

        # 行内 token 拆段：每个 \d+ token 起一个新 lesson；非数字 token 归入当前段
        tokens = stripped.split()
        segments: list[tuple[int | None, list[str]]] = []
        seg_num: int | None = None
        seg_tokens: list[str] = []
        for tok in tokens:
            if tok.isdigit():
                if seg_tokens or seg_num is not None:
                    segments.append((seg_num, seg_tokens))
                seg_num = int(tok)
                seg_tokens = []
            else:
                seg_tokens.append(tok)
        if seg_tokens or seg_num is not None:
            segments.append((seg_num, seg_tokens))

        for num, seg_toks in segments:
            its = items_of(" ".join(seg_toks))
            if num is not None:
                key = (current_kind, num)
                lessons.setdefault(key, []).extend(its)
                current_key = key
                current_yuandi_key = None
            elif its:
                # 续行：归入当前 lesson 或当前园地
                if current_key is not None:
                    lessons[current_key].extend(its)
                elif current_yuandi_key is not None:
                    polyphone[current_yuandi_key].extend(its)

    return lessons, polyphone


def extract_words(s: str) -> list[str]:
    """
    从一行（去掉前导编号后）中抽词：连续 CJK 字符为一词，空白/非 CJK 切分。
    切词前先抹掉「版/编/统」三个页脚水印字，避免它们粘在邻接词尾。
    """
    cleaned = "".join(c for c in s if c not in WATERMARK_CHARS)
    return [w for w in re.split(r"[^一-鿿]+", cleaned) if w]


def merge_lessons(
    xiezi: dict[LessonKey, list[str]],
    shizi: dict[LessonKey, list[str]],
    ciyu: dict[LessonKey, list[str]],
) -> list[dict]:
    keys = sorted(set(xiezi) | set(shizi) | set(ciyu))
    return [{
        "kind": k[0],
        "lesson_no": k[1],
        "write_chars": xiezi.get(k, []),
        "recognize_chars": shizi.get(k, []),
        "words": ciyu.get(k, []),
    } for k in keys]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True, type=Path)
    ap.add_argument("--grade", required=True, type=int)
    ap.add_argument("--semester", required=True, choices=["上", "下"])
    ap.add_argument("--edition", default="统编版")
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--rows", action="store_true",
                    help="一/二年级双栏字表用 TSV → 同 y 行合并；其他册用 -layout")
    args = ap.parse_args()

    full = run_tsv_rows(args.pdf) if args.rows else run_pdftotext(args.pdf)
    sections = split_sections(full)

    shizi, polyphone = parse_section(sections.get("shizibiao", ""), mode="chars")
    xiezi, _ = parse_section(sections.get("xiezibiao", ""), mode="chars")
    ciyu, _ = parse_section(sections.get("ciyubiao", ""), mode="words", is_ciyu=True)

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
