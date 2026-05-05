#!/usr/bin/env python3
"""
读取 pdftotext -tsv 输出，把同一 y 行的所有词按 x 排序拼成一行文本。
这样可以把一/二年级双栏字表页面的视觉「跨栏行」还原为逻辑单行——
某些行内含多个课次编号（譬如「3 爸 妈 6 棋 鸡」表示拼音 3 与 拼音 6 各占一段）；
解析器在遇到行内多次数字时按数字切段。

用法：
    python3 scripts/columnize.py --pdf <PDF> [--first <P> --last <P>]
        > rows.txt
"""

from __future__ import annotations
import argparse
import csv
import io
import subprocess
import sys
from collections import defaultdict
from pathlib import Path


def run_tsv(pdf: Path, first: int | None, last: int | None) -> str:
    cmd = ["pdftotext", "-tsv"]
    if first is not None:
        cmd += ["-f", str(first)]
    if last is not None:
        cmd += ["-l", str(last)]
    cmd += [str(pdf), "-"]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return res.stdout


def parse_tsv(tsv_text: str) -> list[dict]:
    out = []
    for row in csv.DictReader(io.StringIO(tsv_text), delimiter="\t"):
        if int(row["level"]) != 5:
            continue
        text = row["text"]
        if text.startswith("###") or not text.strip():
            continue
        out.append({
            "page": int(row["page_num"]),
            "left": float(row["left"]),
            "top": float(row["top"]),
            "text": text,
        })
    return out


def emit_rows(words: list[dict], y_tol: float = 6.0) -> str:
    by_page: dict[int, list[dict]] = defaultdict(list)
    for w in words:
        by_page[w["page"]].append(w)

    lines: list[str] = []
    for page in sorted(by_page):
        items = sorted(by_page[page], key=lambda w: (w["top"], w["left"]))
        cur: list[dict] = []
        cur_top: float | None = None
        for w in items:
            if cur_top is None or abs(w["top"] - cur_top) <= y_tol:
                cur.append(w)
                if cur_top is None:
                    cur_top = w["top"]
            else:
                cur.sort(key=lambda x: x["left"])
                lines.append(" ".join(x["text"] for x in cur))
                cur = [w]
                cur_top = w["top"]
        if cur:
            cur.sort(key=lambda x: x["left"])
            lines.append(" ".join(x["text"] for x in cur))
        lines.append("\f")  # 分页符
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True, type=Path)
    ap.add_argument("--first", type=int, default=None)
    ap.add_argument("--last", type=int, default=None)
    args = ap.parse_args()

    tsv = run_tsv(args.pdf, args.first, args.last)
    words = parse_tsv(tsv)
    sys.stdout.write(emit_rows(words))


if __name__ == "__main__":
    main()
