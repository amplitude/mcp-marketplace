#!/usr/bin/env python3
"""
compress-run.py — Merge all CSV chunks from a single audit run into one file,
keeping only rows that have a suggested_description. Deletes the chunk files
after the merged file is successfully written.

Usage:
    python compress-run.py <run_id>
    python compress-run.py 187520-6207b95c177

The run directory is resolved relative to this script's location:
    .agents/skills/event-description-generator/runs/<run_id>/

Output is written to:
    .agents/skills/event-description-generator/runs/<run_id>/<run_id>-<YYYY-MM-DD>.csv
"""

import csv
import sys
from datetime import date
from pathlib import Path


SKILL_DIR = Path(__file__).parent.parent
RUNS_DIR = SKILL_DIR / "runs"

# CSV rows absorbed as descriptions have the telltale shape: they contain ",,"
# (two consecutive empty fields), which no real description ever contains.
def _is_csv_row(text: str) -> bool:
    return ",," in text


def compress_run(run_id: str) -> None:
    run_dir = RUNS_DIR / run_id
    if not run_dir.is_dir():
        print(f"Error: run directory not found: {run_dir}", file=sys.stderr)
        sys.exit(1)

    chunk_files = sorted(
        run_dir.glob("event-descriptions-*.csv"),
        key=lambda p: int(p.stem.split("-")[-1]),
    )

    if not chunk_files:
        print(f"No chunk CSV files found in {run_dir}", file=sys.stderr)
        sys.exit(1)

    today = date.today().strftime("%Y-%m-%d")
    output_path = run_dir / f"{run_id}-{today}.csv"
    total_read = 0
    total_written = 0

    with output_path.open("w", newline="", encoding="utf-8") as out_f:
        writer: csv.DictWriter | None = None

        for chunk_file in chunk_files:
            with chunk_file.open(newline="", encoding="utf-8") as in_f:
                reader = csv.DictReader(in_f)

                # Trigger fieldnames to be read from the file header
                _ = reader.fieldnames

                if not reader.fieldnames:
                    # Empty or headerless file — skip
                    continue

                if writer is None:
                    fieldnames = [f for f in reader.fieldnames if f is not None]
                    writer = csv.DictWriter(out_f, fieldnames=fieldnames, extrasaction="ignore")
                    writer.writeheader()

                for row in reader:
                    total_read += 1
                    desc = row.get("suggested_description", "").strip()
                    if desc and not _is_csv_row(desc):
                        row["suggested_description"] = " ".join(desc.splitlines())
                        writer.writerow(row)
                        total_written += 1

    for chunk_file in chunk_files:
        chunk_file.unlink()

    print(f"Run:      {run_id}")
    print(f"Chunks:   {len(chunk_files)} (deleted after merge)")
    print(f"Read:     {total_read} rows")
    print(f"Written:  {total_written} rows (with suggested_description)")
    print(f"Filtered: {total_read - total_written} rows (no description)")
    print(f"Output:   {output_path}")


def main() -> None:
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <run_id>", file=sys.stderr)
        print(f"Example: {sys.argv[0]} 187520-6207b95c177", file=sys.stderr)
        sys.exit(1)

    compress_run(sys.argv[1])


if __name__ == "__main__":
    main()
