#!/usr/bin/env python3
"""
writer-plan.py — Count data rows in a compressed CSV and emit the chunk plan
needed to spawn event-descriptions-writer subagents.

Usage:
    python writer-plan.py <csvPath>
    python writer-plan.py <csvPath> --events-per-writer 25

Output (JSON):
    {
      "csvPath": "...",
      "totalDataRows": 137,
      "eventsPerWriter": 50,
      "totalChunks": 3,
      "chunks": [
        {"index": 0, "lineStart": 1, "lineEnd": 50},
        {"index": 1, "lineStart": 51, "lineEnd": 100},
        {"index": 2, "lineStart": 101, "lineEnd": 137}
      ]
    }
"""

import argparse
import csv
import json
import math
import sys
from pathlib import Path


DEFAULT_EVENTS_PER_WRITER = 50


def count_data_rows(csv_path: Path) -> int:
    with csv_path.open(newline="", encoding="utf-8") as f:
        return sum(1 for _ in csv.DictReader(f))


def build_writer_plan(total_rows: int, events_per_writer: int) -> list[dict]:
    total_chunks = math.ceil(total_rows / events_per_writer)
    chunks = []
    for i in range(total_chunks):
        line_start = i * events_per_writer + 1
        line_end = min((i + 1) * events_per_writer, total_rows)
        chunks.append({"index": i, "lineStart": line_start, "lineEnd": line_end})
    return chunks


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a writer chunk plan from a compressed CSV.")
    parser.add_argument("csv_path", help="Path to the compressed CSV file")
    parser.add_argument(
        "--events-per-writer",
        type=int,
        default=DEFAULT_EVENTS_PER_WRITER,
        help=f"Rows per writer chunk (default: {DEFAULT_EVENTS_PER_WRITER})",
    )
    args = parser.parse_args()

    csv_path = Path(args.csv_path)
    if not csv_path.is_file():
        print(f"Error: file not found: {csv_path}", file=sys.stderr)
        sys.exit(1)

    total_rows = count_data_rows(csv_path)
    if total_rows == 0:
        print("Error: CSV has no data rows", file=sys.stderr)
        sys.exit(1)

    chunks = build_writer_plan(total_rows, args.events_per_writer)

    result = {
        "csvPath": str(csv_path),
        "totalDataRows": total_rows,
        "eventsPerWriter": args.events_per_writer,
        "totalChunks": len(chunks),
        "chunks": chunks,
    }

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
