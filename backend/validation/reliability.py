"""Calculate pilot-study agreement and repeatability metrics.

The script intentionally produces no default claims: an indicator is enabled
only when the supplied pilot data meet every release gate.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from collections import defaultdict
from pathlib import Path
from typing import Iterable, Mapping

import numpy as np


RELEASE_GATES = {
    "mae_deg_max": 2.0,
    "icc_min": 0.90,
    "sem_deg_max": 2.0,
    "mdc95_deg_max": 5.0,
}


def _icc_3_1(matrix: np.ndarray) -> float:
    """Two-way mixed-effects, single-measure, consistency ICC(3,1)."""
    if matrix.ndim != 2 or matrix.shape[0] < 2 or matrix.shape[1] < 2:
        return float("nan")
    n_subjects, n_repeats = matrix.shape
    grand = float(matrix.mean())
    row_means = matrix.mean(axis=1)
    column_means = matrix.mean(axis=0)
    ms_subject = n_repeats * float(np.square(row_means - grand).sum()) / (n_subjects - 1)
    residual = matrix - row_means[:, None] - column_means[None, :] + grand
    ms_error = float(np.square(residual).sum()) / ((n_subjects - 1) * (n_repeats - 1))
    denominator = ms_subject + (n_repeats - 1) * ms_error
    if denominator == 0:
        return 1.0 if ms_error == 0 else float("nan")
    return float((ms_subject - ms_error) / denominator)


def _balanced_matrix(rows: list[Mapping[str, str]]) -> np.ndarray | None:
    by_subject: dict[str, dict[str, float]] = defaultdict(dict)
    for row in rows:
        repeat_key = f"{row['rater_id']}::{row['trial']}"
        by_subject[row["subject_id"]][repeat_key] = float(row["automatic_deg"])
    if len(by_subject) < 2:
        return None
    common_repeats = set.intersection(*(set(values) for values in by_subject.values()))
    if len(common_repeats) < 2:
        return None
    return np.asarray(
        [[by_subject[subject][repeat] for repeat in sorted(common_repeats)] for subject in sorted(by_subject)],
        dtype=float,
    )


def analyze_records(records: Iterable[Mapping[str, str]]) -> dict:
    grouped: dict[str, list[Mapping[str, str]]] = defaultdict(list)
    for row in records:
        grouped[row["metric_id"]].append(row)

    results = []
    for metric_id, rows in sorted(grouped.items()):
        automatic = np.asarray([float(row["automatic_deg"]) for row in rows], dtype=float)
        reference = np.asarray([float(row["reference_deg"]) for row in rows], dtype=float)
        matrix = _balanced_matrix(rows)
        icc = _icc_3_1(matrix) if matrix is not None else float("nan")
        pooled_sd = float(np.std(automatic, ddof=1)) if automatic.size > 1 else float("nan")
        sem = pooled_sd * math.sqrt(max(0.0, 1.0 - icc)) if math.isfinite(icc) else float("nan")
        mdc95 = 1.96 * math.sqrt(2.0) * sem if math.isfinite(sem) else float("nan")
        mae = float(np.mean(np.abs(automatic - reference)))
        gates = {
            "mae": mae <= RELEASE_GATES["mae_deg_max"],
            "icc": math.isfinite(icc) and icc >= RELEASE_GATES["icc_min"],
            "sem": math.isfinite(sem) and sem <= RELEASE_GATES["sem_deg_max"],
            "mdc95": math.isfinite(mdc95) and mdc95 <= RELEASE_GATES["mdc95_deg_max"],
        }
        validated = all(gates.values())
        results.append({
            "metric_id": metric_id,
            "observations": len(rows),
            "subjects": len({row["subject_id"] for row in rows}),
            "mae_deg": round(mae, 4),
            "icc_3_1": round(icc, 4) if math.isfinite(icc) else None,
            "sem_deg": round(sem, 4) if math.isfinite(sem) else None,
            "mdc95_deg": round(mdc95, 4) if math.isfinite(mdc95) else None,
            "release_gates": gates,
            "validated": validated,
            "status": "validated" if validated else "experimental",
        })

    return {"release_gates": RELEASE_GATES, "metrics": results}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    required = {"subject_id", "metric_id", "rater_id", "trial", "automatic_deg", "reference_deg"}
    missing = required.difference(rows[0].keys() if rows else set())
    if missing:
        raise ValueError(f"missing columns: {', '.join(sorted(missing))}")
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate posture V2 pilot reliability")
    parser.add_argument("csv_path", type=Path)
    args = parser.parse_args()
    print(json.dumps(analyze_records(read_csv(args.csv_path)), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
