"""
Fill the NourishScope Kentucky county dataset with public federal data.

Fills: Census ACS 5-year fields and CDC PLACES health fields.
Food-system fields (USDA ERS / FNS) are downloaded manually; see the
Data_Dictionary sheet for sources.

Requirements:
  pip install requests
  A free Census API key: https://api.census.gov/data/key_signup.html

Usage:
  python fill_nourishscope_dataset.py --key YOUR_CENSUS_KEY --year 2023 \
      --infile nourishscope_ky_counties_v0.1.csv \
      --outfile nourishscope_ky_counties_v1.0.csv

Before use: confirm the ACS year and the CDC PLACES dataset ID are current
(PLACES releases are posted at https://www.cdc.gov/places/).
"""
import argparse
import csv
import requests

STATE_FIPS = "21"  # Kentucky
PLACES_DATASET = "swc5-untb"  # CDC PLACES county data; confirm latest release ID

ACS_VARS = [
    "B01003_001E",  # population
    "B11001_001E",  # total households
    "B22003_001E",  # households (SNAP universe)
    "B22003_002E",  # households receiving SNAP
    "B19013_001E",  # median household income
    "B17002_001E",  # persons for whom poverty status is determined
    "B17002_002E", "B17002_003E", "B17002_004E", "B17002_005E", "B17002_006E",
]


def num(v):
    try:
        x = float(v)
        if x < 0:
            return None  # Census uses negative codes for missing
        return int(x) if x.is_integer() else x
    except (TypeError, ValueError):
        return None


def get_acs(key, year):
    url = f"https://api.census.gov/data/{year}/acs/acs5"
    params = {"get": ",".join(["NAME"] + ACS_VARS), "for": "county:*",
              "in": f"state:{STATE_FIPS}", "key": key}
    r = requests.get(url, params=params, timeout=60)
    r.raise_for_status()
    rows = r.json()
    head, data = rows[0], rows[1:]
    out = {}
    for row in data:
        d = dict(zip(head, row))
        fips = d["state"] + d["county"]
        v = {k: num(d[k]) for k in ACS_VARS}
        snap_pct = (round(100 * v["B22003_002E"] / v["B22003_001E"], 1)
                    if v["B22003_001E"] else None)
        b100 = (v["B17002_002E"] or 0) + (v["B17002_003E"] or 0)
        b185 = sum(v[f"B17002_00{i}E"] or 0 for i in range(2, 7))
        pct185 = round(100 * b185 / v["B17002_001E"], 1) if v["B17002_001E"] else None
        out[fips] = {
            "population": v["B01003_001E"],
            "total_households": v["B11001_001E"],
            "snap_households": v["B22003_002E"],
            "snap_household_pct": snap_pct,
            "median_household_income": v["B19013_001E"],
            "persons_below_100pct_poverty": b100,
            "persons_below_185pct_poverty": b185,
            "pct_below_185pct_poverty": pct185,
            "data_year": f"ACS 5-year {year}",
        }
    return out


def get_places():
    url = f"https://data.cdc.gov/resource/{PLACES_DATASET}.json"
    params = {
        "$select": "locationid,measureid,data_value,year",
        "$where": ("stateabbr='KY' AND data_value_type='Age-adjusted prevalence' "
                   "AND measureid in('DIABETES','OBESITY','BPHIGH')"),
        "$limit": 5000,
    }
    r = requests.get(url, params=params, timeout=60)
    r.raise_for_status()
    field = {"DIABETES": "diabetes_pct", "OBESITY": "obesity_pct", "BPHIGH": "high_bp_pct"}
    out = {}
    for rec in r.json():
        out.setdefault(rec["locationid"], {})[field[rec["measureid"]]] = num(rec.get("data_value"))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", required=True)
    ap.add_argument("--year", default="2023")
    ap.add_argument("--infile", default="nourishscope_ky_counties_v0.1.csv")
    ap.add_argument("--outfile", default="nourishscope_ky_counties_v1.0.csv")
    a = ap.parse_args()

    acs = get_acs(a.key, a.year)
    places = get_places()

    with open(a.infile, newline="") as fh:
        rows = list(csv.DictReader(fh))
    missing = []
    for row in rows:
        f = row["fips"].zfill(5)
        for src in (acs.get(f, {}), places.get(f, {})):
            for k, v in src.items():
                row[k] = "" if v is None else v
        if f not in acs or f not in places:
            missing.append(row["county_name"])

    with open(a.outfile, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=rows[0].keys())
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {len(rows)} counties to {a.outfile}")
    if missing:
        print("Check these counties (missing ACS or PLACES data):", ", ".join(missing))


if __name__ == "__main__":
    main()
