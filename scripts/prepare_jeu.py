"""Prépare les agrégats mensuels utilisés par le jeu de l'eau."""
from __future__ import annotations
import json
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATION_IDS = [
    "A4430640", "A6921010", "H5011020", "H5031020", "H5071050",
    "H5071020", "H5071040", "H5071010", "H5201005", "H5201010",
    "A1160030", "A1610030", "A2280030",
]
MONTHS = 312


def quantile(values: list[float], p: float) -> float | None:
    values = sorted(v for v in values if math.isfinite(v))
    if not values:
        return None
    at = (len(values) - 1) * p
    low, high = math.floor(at), math.ceil(at)
    if low == high:
        return values[low]
    return values[low] + (values[high] - values[low]) * (at - low)


def avg(xs):
    xs = [x for x in xs if isinstance(x, (int, float)) and math.isfinite(x)]
    return sum(xs) / len(xs) if xs else None


def median(xs):
    xs = sorted(x for x in xs if isinstance(x, (int, float)) and math.isfinite(x))
    if not xs:
        return None
    mid = len(xs) // 2
    return xs[mid] if len(xs) % 2 else (xs[mid - 1] + xs[mid]) / 2


def main():
    catalog = json.loads((ROOT / "data/catalogue.json").read_text(encoding="utf-8"))
    weekly = catalog["weeks"]
    station_index = {s["id"]: s for s in catalog["stations"]}
    prepared = []
    for station_id in STATION_IDS:
        meta = station_index[station_id]
        source = json.loads((ROOT / "data/stations" / f"{station_id}.json").read_text(encoding="utf-8"))
        grouped = defaultdict(lambda: defaultdict(list))
        for i, week in enumerate(weekly):
            year, month = int(week["year"]), int(week["date"][5:7])
            if not (2000 <= year <= 2025):
                continue
            key = f"{year:04d}-{month:02d}"
            for field in ("debit", "pluie", "humidite", "temp", "neige"):
                values = source["values"].get(field, [])
                value = values[i] if i < len(values) else None
                if isinstance(value, (int, float)) and math.isfinite(value):
                    grouped[key][field].append(value)
        monthly = []
        for index in range(MONTHS):
            year, month = 2000 + index // 12, index % 12 + 1
            row = grouped.get(f"{year:04d}-{month:02d}", {})
            monthly.append([
                avg(row.get("temp", [])), sum(row.get("pluie", [])) if row.get("pluie") else None,
                sum(row.get("neige", [])) if row.get("neige") else None,
                median(row.get("debit", [])), avg(row.get("humidite", [])),
            ])
        limits = []
        for month in range(12):
            rows = [monthly[i] for i in range(month, MONTHS, 12)]
            limits.append([
                quantile([r[1] for r in rows if r[1] is not None], .85),
                quantile([r[2] for r in rows if r[2] is not None], .85),
                quantile([r[3] for r in rows if r[3] is not None], .15),
                quantile([r[4] for r in rows if r[4] is not None], .15),
                quantile([r[4] for r in rows if r[4] is not None], .85),
            ])
        prepared.append({
            "id": station_id, "name": meta["name"], "river": meta["river"],
            "town": meta["town"], "dept": meta["dept"], "lat": meta["lat"],
            "lon": meta["lon"], "monthly": monthly, "limits": limits,
        })

    events = []
    for index in range(MONTHS):
        station = prepared[index % len(prepared)]
        month = index % 12
        temp, rain, snow, flow, soil = station["monthly"][index]
        rain85, snow85, flow15, soil15, soil85 = station["limits"][month]
        event = None
        if rain is not None and rain85 is not None and rain > rain85:
            event = "crue"
        elif snow is not None and snow85 is not None and snow > max(1, snow85):
            event = "neige"
        elif flow is not None and flow15 is not None and soil is not None and soil15 is not None and flow < flow15 and soil < soil15:
            event = "etiage"
        elif soil is not None and soil85 is not None and soil > soil85:
            event = "sol"
        events.append(event)

    result = {
        "version": 1,
        "period": {"start": "2000-01", "end": "2025-12", "months": MONTHS},
        "fields": ["temperature", "pluie", "neige", "debit", "humidite_sol"],
        "thresholds": "Percentiles calculés séparément pour chaque station et mois de l’année, sur 2000–2025.",
        "stationOrder": STATION_IDS,
        "stations": prepared,
        "events": events,
    }
    out = ROOT / "data/jeu-eau.json"
    out.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{out}: {len(events)} mois, {len(prepared)} stations")


if __name__ == "__main__":
    main()
