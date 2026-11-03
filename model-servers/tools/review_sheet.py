#!/usr/bin/env python3
"""Make a spreadsheet a clinician can use to REVIEW machine translations before you rely on them.

Input : a text file, one sentence per line:   <language code><TAB><sentence>      e.g.   hi<TAB>मुझे तीन दिन से बुखार है
Output: a CSV with columns  language, original, machine_translation, reviewer_ok, reviewer_correction
        (the last two are left blank for the reviewer to fill in).

Usage:  python review_sheet.py sentences.txt review.csv --url http://127.0.0.1:8001/translate [--api-key KEY]
Use sentences that look like real patient answers (symptoms, durations, negations like "no chest pain",
medicines, numbers). Keep them synthetic: never use real patient data.
"""
import argparse
import csv
import sys

import httpx


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("infile")
    ap.add_argument("outfile")
    ap.add_argument("--url", default="http://127.0.0.1:8001/translate")
    ap.add_argument("--api-key", default="")
    ap.add_argument("--target", default="en")
    a = ap.parse_args()
    headers = {"X-API-Key": a.api_key} if a.api_key else {}
    rows, failures = [], 0
    with open(a.infile, encoding="utf-8") as f:
        for n, line in enumerate(f, 1):
            line = line.rstrip("\n")
            if not line.strip() or line.startswith("#"):
                continue
            if "\t" not in line:
                print(f"line {n}: expected '<lang><TAB><sentence>', skipped", file=sys.stderr)
                continue
            lang, text = line.split("\t", 1)
            try:
                r = httpx.post(a.url, json={"text": text, "source": lang.strip(), "target": a.target},
                               headers=headers, timeout=120)
                r.raise_for_status()
                out = r.json()["translation"]
            except (httpx.HTTPError, KeyError, ValueError) as exc:
                out, failures = f"ERROR: {type(exc).__name__}", failures + 1
            rows.append([lang.strip(), text, out, "", ""])
    with open(a.outfile, "w", encoding="utf-8-sig", newline="") as f:      # utf-8-sig so Excel shows Indic scripts
        w = csv.writer(f)
        w.writerow(["language", "original", "machine_translation", "reviewer_ok", "reviewer_correction"])
        w.writerows(rows)
    print(f"wrote {len(rows)} rows to {a.outfile} ({failures} failures)")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
