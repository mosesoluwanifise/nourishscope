"""
One-time edit: replace en and em dashes with hyphens in the Data_Dictionary
`data_year` and `description` cells of the NourishScope workbook
(UI/UX audit plan U2, R21). Year ranges such as "2020–2024" become "2020-2024".

Only those two columns are touched; the Kentucky_Counties sheet is not opened
for writing. Kept in the repo as a record of the edit. Running it again is safe:
it reports that there is nothing to change.

Usage:
  python scripts/normalise_year_ranges.py data/NourishScope_Kentucky_County_Dataset_v1.0.xlsx
"""
import sys

import openpyxl

COLUMNS = ["data_year", "description"]
DASHES = str.maketrans({"–": "-", "—": "-"})


def main(path):
    wb = openpyxl.load_workbook(path)
    ws = wb["Data_Dictionary"]
    headers = [c.value for c in ws[1]]
    changed = []
    for name in COLUMNS:
        col = headers.index(name) + 1
        for row in range(2, ws.max_row + 1):
            cell = ws.cell(row=row, column=col)
            if isinstance(cell.value, str) and cell.value != cell.value.translate(DASHES):
                changed.append(f"row {row} {name}: {cell.value!r} -> {cell.value.translate(DASHES)!r}")
                cell.value = cell.value.translate(DASHES)
    if not changed:
        print("No dashes to replace; nothing to do.")
        return
    wb.save(path)
    print("\n".join(changed))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
