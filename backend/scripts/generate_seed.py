#!/usr/bin/env python3
"""
Genera database/seed_exercises.sql dal file Excel della libreria esercizi.

Uso:
    python3 backend/scripts/generate_seed.py

Lettura via stdlib (zipfile + xml.etree) — nessuna dipendenza pip.
Normalizza i nomi dei gruppi muscolari a lowercase per matchare i CHECK
constraint di init.sql. Fallisce rumorosamente se trova valori fuori set.
"""

from __future__ import annotations

import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
XLSX = ROOT / "docs" / "reference" / "FitQuest_Libreria_Esercizi_v1.xlsx"
OUT = ROOT / "database" / "seed_exercises.sql"

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

VALID_GROUPS = {"petto", "schiena", "gambe", "spalle", "braccia", "core", "cardio"}
VALID_CATEGORIES = {"pesi", "corpo_libero", "isometrico", "cardio"}


def read_sheet1_rows() -> list[list[str]]:
    with zipfile.ZipFile(XLSX) as z:
        xml = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
    root = ET.fromstring(xml)
    rows: list[list[str]] = []
    for row in root.iter(NS + "row"):
        cells: list[str] = []
        for c in row:
            v = c.find(NS + "v")
            is_ = c.find(NS + "is")
            if is_ is not None:
                t = is_.find(NS + "t")
                cells.append(t.text if t is not None and t.text is not None else "")
            elif v is not None:
                cells.append(v.text or "")
            else:
                cells.append("")
        rows.append(cells)
    return rows


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def main() -> int:
    rows = read_sheet1_rows()
    data = rows[1:]  # salta header

    inserts: list[str] = []
    for idx, r in enumerate(data, start=2):
        if len(r) < 5 or not r[2]:
            continue
        _, gruppo, nome, categoria, difficolta = r[0], r[1], r[2], r[3], r[4]

        group_norm = gruppo.strip().lower()
        cat_norm = categoria.strip().lower()
        try:
            diff = int(difficolta)
        except ValueError:
            print(f"[riga {idx}] Difficoltà non numerica: {difficolta!r}", file=sys.stderr)
            return 1

        if group_norm not in VALID_GROUPS:
            print(f"[riga {idx}] Gruppo non valido: {gruppo!r}", file=sys.stderr)
            return 1
        if cat_norm not in VALID_CATEGORIES:
            print(f"[riga {idx}] Categoria non valida: {categoria!r}", file=sys.stderr)
            return 1
        if diff not in (1, 2, 3):
            print(f"[riga {idx}] Difficoltà fuori range: {diff}", file=sys.stderr)
            return 1

        inserts.append(
            f"INSERT INTO exercises (name, muscle_group, category, difficulty) "
            f"VALUES ('{sql_escape(nome.strip())}', '{group_norm}', '{cat_norm}', {diff}) "
            f"ON CONFLICT DO NOTHING;"
        )

    header = (
        "-- ============================================================\n"
        "-- Seed libreria esercizi — generato da backend/scripts/generate_seed.py\n"
        "-- Sorgente: docs/reference/FitQuest_Libreria_Esercizi_v1.xlsx (foglio \"Esercizi Workout\")\n"
        f"-- Totale: {len(inserts)} esercizi\n"
        "-- Idempotente: ON CONFLICT DO NOTHING.\n"
        "-- Non modificare a mano — rigenerare con: python3 backend/scripts/generate_seed.py\n"
        "-- ============================================================\n\n"
    )
    OUT.write_text(header + "\n".join(inserts) + "\n", encoding="utf-8")
    print(f"Scritti {len(inserts)} esercizi in {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
