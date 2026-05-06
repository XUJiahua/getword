#!/usr/bin/env python3
"""
从 data/sources/grade*.json 提取所有汉字，从 jsDelivr CDN 拉取 hanzi-writer-data 的
单字笔顺 JSON 到 data/strokes/<字>.json，并生成 index.json 清单。

数据源:  https://github.com/chanind/hanzi-writer-data （原始数据来自 make-me-a-hanzi）
许可证:  Arphic Public License（见 data/strokes/LICENSE.txt）
"""

from __future__ import annotations
import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

CDN = "https://cdn.jsdelivr.net/npm/hanzi-writer-data@{ver}/{ch}.json"
DEFAULT_VERSION = "2.0.1"


def collect_chars(sources_dir: Path) -> list[str]:
    chars: set[str] = set()

    def walk(node):
        if isinstance(node, str):
            for ch in node:
                if "一" <= ch <= "鿿":
                    chars.add(ch)
        elif isinstance(node, list):
            for x in node:
                walk(x)
        elif isinstance(node, dict):
            for x in node.values():
                walk(x)

    for fp in sorted(sources_dir.glob("grade*.json")):
        walk(json.loads(fp.read_text(encoding="utf-8")))
    return sorted(chars)


def fetch_one(ch: str, version: str, out_dir: Path, retries: int = 3) -> tuple[str, str | None]:
    """返回 (char, error or None)。已存在则跳过。"""
    target = out_dir / f"{ch}.json"
    if target.exists() and target.stat().st_size > 0:
        return ch, None

    url = CDN.format(ver=version, ch=urllib.parse.quote(ch, safe=""))
    last_err: str | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "fetch_strokes/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                payload = resp.read()
            json.loads(payload)  # 验证是合法 JSON
            target.write_bytes(payload)
            return ch, None
        except Exception as e:  # noqa: BLE001
            last_err = f"{type(e).__name__}: {e}"
            time.sleep(0.5 * (attempt + 1))
    return ch, last_err


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sources", type=Path,
                    default=Path(__file__).resolve().parent.parent / "data" / "sources")
    ap.add_argument("--out", type=Path,
                    default=Path(__file__).resolve().parent.parent / "data" / "strokes")
    ap.add_argument("--version", default=DEFAULT_VERSION,
                    help="hanzi-writer-data npm 版本（默认 %(default)s）")
    ap.add_argument("--workers", type=int, default=16)
    ap.add_argument("--limit", type=int, default=0,
                    help="只下前 N 个字（调试用），0 表示全部")
    args = ap.parse_args()

    chars = collect_chars(args.sources)
    if args.limit:
        chars = chars[: args.limit]
    args.out.mkdir(parents=True, exist_ok=True)

    print(f"target chars: {len(chars)}")
    print(f"hanzi-writer-data version: {args.version}")
    print(f"output dir: {args.out}")

    failures: list[tuple[str, str]] = []
    done = 0
    started = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(fetch_one, ch, args.version, args.out): ch for ch in chars}
        for fut in as_completed(futs):
            ch, err = fut.result()
            done += 1
            if err:
                failures.append((ch, err))
            if done % 200 == 0 or done == len(chars):
                rate = done / max(1e-6, time.time() - started)
                print(f"  {done}/{len(chars)}  ({rate:.1f}/s)  failures={len(failures)}")

    if failures:
        print("\nfailures:")
        for ch, err in failures[:30]:
            print(f"  {ch}: {err}")
        if len(failures) > 30:
            print(f"  ... and {len(failures) - 30} more")

    # 写 index.json
    available = sorted(p.stem for p in args.out.glob("*.json")
                       if p.name not in {"index.json"})
    index = {
        "source": {
            "name": "hanzi-writer-data",
            "repo": "https://github.com/chanind/hanzi-writer-data",
            "upstream": "https://github.com/skishore/makemeahanzi",
            "version": args.version,
            "license": "Arphic Public License (see LICENSE.txt)",
        },
        "format": {
            "strokes": "每笔的 SVG path d 属性数组",
            "medians": "每笔的中线坐标点（用于动画展开）",
            "radStrokes": "属于部首的笔画索引（可缺省）",
        },
        "count": len(available),
        "chars": "".join(available),
    }
    (args.out / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"\nwrote {args.out / 'index.json'}: {len(available)} chars")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
