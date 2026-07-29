#!/usr/bin/env python3
"""Import cumulative ranking text while preserving stable company IDs."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

HEADER = re.compile(r"^(\d+)-(\d+)名\s+\(累计出口：(.+?)\)$")
RANKED = re.compile(r"^(\d+)\.\s*(.+)$")
CSV_ROW = re.compile(r"^\s*(\d+)\s*[，,]\s*(.*?)\s*[，,]\s*(.+?)\s*$")
RANGE = re.compile(r"^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)万美元$")


def normalize_name(name: str) -> str:
    return re.sub(r"[\s\u3000（）()·•,，.。\-—_]+", "", name)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("sources", nargs="+", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--companies", type=Path, required=True)
    parser.add_argument("--current-period", type=Path, required=True)
    parser.add_argument("--aliases", type=Path, required=True)
    parser.add_argument("--period-id", default="2026-ytd-05")
    parser.add_argument("--period-label", default="2026年1—5月")
    parser.add_argument("--as-of", default="2026-05-31")
    return parser.parse_args()


def parse_sources(paths: list[Path]) -> list[dict]:
    records = []
    inferred_rank = None
    band_label = None
    for path in paths:
        for source_line, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            line = raw.strip()
            if not line or line.startswith("2026年") or line.startswith("注："):
                continue
            header = HEADER.fullmatch(line)
            if header:
                start, _, raw_label = header.groups()
                inferred_rank = int(start)
                band_label = raw_label.replace("区间", "").replace("或未明确", "")
                continue
            csv_row = CSV_ROW.fullmatch(line)
            if csv_row:
                rank = int(csv_row.group(1))
                company_name = csv_row.group(2).strip()
                band_label = csv_row.group(3).strip()
                inferred_rank = rank + 1
            else:
                ranked = RANKED.fullmatch(line)
                if ranked:
                    rank, company_name = int(ranked.group(1)), ranked.group(2)
                elif inferred_rank is not None:
                    rank, company_name = inferred_rank, line
                else:
                    raise ValueError(f"Unclassified line {path}:{source_line}: {line}")
            if band_label is None:
                raise ValueError(f"Missing band header before {path}:{source_line}")
            records.append(
                {
                    "rank": rank,
                    "company_name": company_name,
                    "band_label": band_label,
                    "source_file": f"{path.parent.name}/{path.name}",
                    "source_line": source_line,
                }
            )
            inferred_rank = rank + 1

    expected = list(range(1, len(records) + 1))
    if [record["rank"] for record in records] != expected:
        raise ValueError("Ranks must be continuous and sorted from 1")
    return records


def make_bands(records: list[dict]) -> list[dict]:
    labels = list(dict.fromkeys(record["band_label"] for record in records))
    bands = []
    for index, label in enumerate(labels, start=1):
        match = RANGE.fullmatch(label)
        bands.append(
            {
                "id": f"b{index:02d}",
                "label": label,
                "min_usd_10k": float(match.group(1)) if match else None,
                "max_usd_10k": float(match.group(2)) if match else None,
                "count": sum(record["band_label"] == label for record in records),
            }
        )
    return bands


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def main() -> None:
    args = parse_args()
    records = parse_sources(args.sources)
    companies = json.loads(args.companies.read_text(encoding="utf-8"))
    current_period = json.loads(args.current_period.read_text(encoding="utf-8"))
    explicit_aliases = json.loads(args.aliases.read_text(encoding="utf-8"))

    by_name = {}
    normalized = defaultdict(set)
    by_id = {company["company_id"]: company for company in companies}
    for company in companies:
        for name in [company["company_name"], *company.get("aliases", [])]:
            by_name[name] = company["company_id"]
            normalized[normalize_name(name)].add(company["company_id"])

    for alias, canonical in explicit_aliases.items():
        if canonical not in by_name:
            raise ValueError(f"Alias target is not in company registry: {canonical}")
        company_id = by_name[canonical]
        by_name[alias] = company_id
        normalized[normalize_name(alias)].add(company_id)
        if alias not in by_id[company_id]["aliases"]:
            by_id[company_id]["aliases"].append(alias)

    name_counts = Counter(record["company_name"] for record in records)
    next_id = max(int(company["company_id"][2:]) for company in companies) + 1
    matched_records = []
    for record in records:
        source_name = record["company_name"]
        company_id = by_name.get(source_name)
        if company_id is None:
            candidates = normalized[normalize_name(source_name)]
            if len(candidates) == 1:
                company_id = next(iter(candidates))
                if source_name not in by_id[company_id]["aliases"]:
                    by_id[company_id]["aliases"].append(source_name)
            elif candidates:
                raise ValueError(f"Ambiguous normalized company name: {source_name}")
            else:
                company_id = f"YQ{next_id:06d}"
                next_id += 1
                company = {
                    "company_id": company_id,
                    "company_name": source_name,
                    "aliases": [],
                    "needs_review": name_counts[source_name] > 1,
                }
                companies.append(company)
                by_id[company_id] = company
                by_name[source_name] = company_id
                normalized[normalize_name(source_name)].add(company_id)

        if name_counts[source_name] > 1:
            by_id[company_id]["needs_review"] = True
        matched_records.append({**record, "company_id": company_id})

    bands = make_bands(records)
    band_ids = {band["label"]: band["id"] for band in bands}
    output_records = [
        {
            "rank": record["rank"],
            "company_id": record["company_id"],
            "company_name": record["company_name"],
            "band_id": band_ids[record["band_label"]],
            "band_label": record["band_label"],
            "source_file": record["source_file"],
            "source_line": record["source_line"],
            "source_duplicate": name_counts[record["company_name"]] > 1,
        }
        for record in matched_records
    ]
    period = {
        "id": args.period_id,
        "label": args.period_label,
        "type": "year_to_date",
        "as_of": args.as_of,
    }
    data = {
        "period": period,
        "source_note": "排名来自用户提供的区间数据；仅展示累计排名与出口额区间，不推算精确出口额。",
        "bands": bands,
        "records": output_records,
    }
    manifest_path = args.output / "periods.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    else:
        manifest = {
            "latest": current_period["period"]["id"],
            "periods": [
                {
                    **current_period["period"],
                    "file": f"{current_period['period']['id']}.json",
                    "record_count": len(current_period["records"]),
                }
            ],
        }
    period_meta = {**period, "file": f"{args.period_id}.json", "record_count": len(output_records)}
    manifest["periods"] = [
        item for item in manifest["periods"] if item["id"] != args.period_id
    ] + [period_meta]
    manifest["periods"].sort(key=lambda item: item["as_of"], reverse=True)
    write_json(args.output / "companies.json", companies)
    write_json(args.output / f"{args.period_id}.json", data)
    write_json(manifest_path, manifest)
    print(
        f"Imported {len(output_records)} rows; registry now has {len(companies)} companies; "
        f"{sum(bool(company['aliases']) for company in companies)} companies have aliases"
    )


if __name__ == "__main__":
    main()
