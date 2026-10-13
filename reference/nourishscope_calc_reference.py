"""
NourishScope calculation reference (Methodology v1.0).
A plain, dependency-free implementation of every calculation in the app.
The developer can use it to check that the app's results match exactly.

Run:  python nourishscope_calc_reference.py
"""
import csv
import math
from statistics import median

HEALTH = ("diabetes_pct", "obesity_pct", "high_bp_pct")


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def state_medians(rows):
    """Median of each health measure across all counties in the dataset (fixed reference)."""
    return {m: median([num(r[m]) for r in rows if num(r[m]) is not None]) for m in HEALTH}


def health_index(row, med):
    """H = average of (county rate / State median) over available measures; 1.0 if none."""
    ratios = [num(row[m]) / med[m] for m in HEALTH if num(row[m]) is not None]
    return sum(ratios) / len(ratios) if ratios else 1.0


def core(c):
    """Unmet need. If served is blank, served-mode is off: U = N and coverage is not shown."""
    N = c["need"]
    S = c.get("served")
    c["served_known"] = S is not None
    c["unmet"] = max(N - (S or 0), 0)
    return c


def allocate(comms, B, strategy, floor_share=0.05):
    n = len(comms)
    U = [c["unmet"] for c in comms]
    if strategy == "equal":
        A = [B / n] * n
    elif strategy == "proportional":
        tot = sum(U)
        A = [B * u / tot if tot else B / n for u in U]
    elif strategy == "need_floor":
        F = floor_share * B / n
        rest = B - F * n
        tot = sum(U)
        A = [F + (rest * u / tot if tot else rest / n) for u in U]
    elif strategy == "health_weighted":
        W = [c["unmet"] * c["H"] for c in comms]
        tot = sum(W)
        A = [B * w / tot if tot else B / n for w in W]
    elif strategy == "cost_effectiveness":
        # Cheapest cost per household first; ties broken by higher health index, then higher unmet need.
        order = sorted(range(n), key=lambda i: (comms[i]["cost"], -comms[i]["H"], -comms[i]["unmet"]))
        A = [0.0] * n
        left = B
        for i in order:
            need_dollars = comms[i]["unmet"] * comms[i]["cost"]
            A[i] = min(left, need_dollars)
            left -= A[i]
            if left <= 0:
                break
    else:
        raise ValueError(strategy)
    return [round(a, 2) for a in A]


def results(comms, B, strategy, cost_factor=1.0):
    A = allocate([dict(c, cost=c["cost"] * cost_factor) for c in comms], B, strategy)
    out, spend_total, reached_total = [], 0.0, 0
    for c, a in zip(comms, A):
        cost = c["cost"] * cost_factor
        R = min(math.floor(a / cost), c["unmet"]) if cost > 0 else 0
        spend = round(R * cost, 2)
        spend_total += spend
        reached_total += R
        out.append({"community": c["name"], "allocation": a, "reached": R, "spend": spend})
    totals = {"reached": reached_total, "spend": round(spend_total, 2),
              "unspent": round(B - spend_total, 2)}
    if all(c["served_known"] for c in comms):
        N = sum(c["need"] for c in comms)
        S = sum(c["served"] for c in comms)
        totals["coverage_before"] = round(100 * S / N, 1)
        totals["coverage_after"] = round(100 * (S + reached_total) / N, 1)
    return out, totals


def evaluation(pre_pct, post_pct, participants, program_cost):
    change = post_pct - pre_pct
    improved = participants * change / 100
    return {"change_pts": round(change, 1),
            "participants_improving": round(improved, 1),
            "cost_per_participant_improving": round(program_cost / improved, 2) if improved > 0 else None}


if __name__ == "__main__":
    rows = list(csv.DictReader(open("nourishscope_ky_counties_v1.0.csv")))
    med = state_medians(rows)
    pick = ["Magoffin County", "Owsley County", "Wolfe County"]
    comms = []
    for r in rows:
        if r["county_name"] in pick:
            comms.append(core({"name": r["county_name"], "need": int(r["snap_households"]),
                               "served": None, "cost": 100.0, "H": health_index(r, med),
                               "flag": r["arc_status_fy2027"]}))
    B = 50000
    print("State medians:", {k: round(v, 1) for k, v in med.items()})
    for c in comms:
        print(f'{c["name"]}: need={c["need"]}, H={c["H"]:.3f}, flag={c["flag"]}')
    for s in ["equal", "proportional", "need_floor", "health_weighted", "cost_effectiveness"]:
        out, tot = results(comms, B, s)
        print("\n" + s, tot)
        for o in out:
            print("  ", o)
    print("\nSensitivity (proportional):")
    for f in (0.8, 1.0, 1.2):
        print(f"  cost x{f}:", results(comms, B, "proportional", f)[1])
    print("\nWith served entered (example 400, 150, 200):")
    for c, s in zip(comms, (400, 150, 200)):
        c["served"] = s
        core(c)
    print("  proportional:", results(comms, B, "proportional")[1])
    print("\nEvaluation example:", evaluation(30, 55, 73, 2500))
