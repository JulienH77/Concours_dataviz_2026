import csv
from contextlib import contextmanager
import heapq
import json
import math
import zipfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "DONNEES.zip"
OUTPUT = ROOT / "data" / "ideas-plus.json"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

META = json.loads((ROOT / "data" / "catalogue.json").read_text(encoding="utf-8"))
MARNE_IDS = [
    "H5011020", "H5031020", "H5071020", "H5071040", "H5071050",
    "H5071010", "H5201005", "H5201010",
]
CITY_IDS = [
    "A2280030", "A1160030", "A1610030", "A4430640", "A6921010",
    "H5031020", "H5071010", "H5201010",
]
SELECTED = set(MARNE_IDS + CITY_IDS)
station_by_id = {s["id"]: s for s in META["stations"]}

@contextmanager
def open_source(member):
    local = ROOT / member
    if local.exists():
        with local.open("rb") as stream:
            yield stream
    else:
        with zipfile.ZipFile(ARCHIVE) as archive:
            with archive.open(member) as stream:
                yield stream

def median(xs):
    xs = sorted(x for x in xs if x is not None and math.isfinite(x))
    if not xs:
        return None
    n = len(xs)
    return xs[n // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2

groups = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(list))))
weeks = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
with open_source("DONNEES/donnees/donnees.csv") as raw:
    import io
    rows = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8-sig", newline=""))
    for row in rows:
        sid = row["site"]
        if sid not in SELECTED:
            continue
        date = row["date"]
        year, month = int(date[:4]), int(date[5:7])
        for key in ("temp", "pluie", "neige", "debit", "humidite"):
            raw_value = row[key].strip()
            value = float(raw_value) if raw_value else None
            if value is not None and key == "debit" and value < 0:
                value = None
            if value is not None:
                groups[sid][year][month][key].append(value)
                weeks[sid][year][key].append(value)

def simplify(points, tol=0.00028, preserve=None):
    if len(points) <= 2:
        return points
    if preserve is not None:
        for i, point in enumerate(points[1:-1], 1):
            if abs(point[0] - preserve[0]) < 1e-10 and abs(point[1] - preserve[1]) < 1e-10:
                return simplify(points[:i + 1], tol)[:-1] + simplify(points[i:], tol)
    x1, y1 = points[0][:2]
    x2, y2 = points[-1][:2]
    dx, dy = x2 - x1, y2 - y1
    den = dx * dx + dy * dy
    best_i, best_d = 0, -1
    for i in range(1, len(points) - 1):
        x, y = points[i][:2]
        if den:
            t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / den))
            d = (x - (x1 + t * dx)) ** 2 + (y - (y1 + t * dy)) ** 2
        else:
            d = (x - x1) ** 2 + (y - y1) ** 2
        if d > best_d:
            best_i, best_d = i, d
    if best_d > tol * tol:
        left = simplify(points[:best_i + 1], tol)
        right = simplify(points[best_i:], tol)
        return left[:-1] + right
    return [points[0], points[-1]]

def station_record(sid):
    s = station_by_id[sid]
    monthly = []
    for year in range(2000, 2027):
        for month in range(1, 13):
            vals = groups[sid][year][month]
            monthly.append([
                round(sum(vals["temp"]) / len(vals["temp"]), 3) if vals["temp"] else None,
                round(sum(vals["pluie"]), 3) if vals["pluie"] else None,
                round(sum(vals["neige"]), 3) if vals["neige"] else None,
                round(median(vals["debit"]), 3) if vals["debit"] else None,
                round(sum(vals["humidite"]) / len(vals["humidite"]), 3) if vals["humidite"] else None,
            ])
    allflows = [x for year in weeks[sid].values() for x in year["debit"]]
    baseline = median(allflows)
    yearly = []
    for year in range(2000, 2026):
        monthly_flows = [x[3] for x in monthly[(year - 2000) * 12:(year - 1999) * 12] if x[3] is not None]
        relative = (median(monthly_flows) / baseline) if baseline and monthly_flows else None
        yearly.append(round(relative, 4) if relative is not None else None)
    return {
        "name": s["name"], "river": s["river"], "town": s["town"],
        "dept": s["dept"], "lat": s["lat"], "lon": s["lon"],
        "coverage": s["coverage"], "baseline": round(baseline, 3) if baseline is not None else None,
        "m": monthly if sid in MARNE_IDS else [], "y": yearly,
    }

river_lines = []
source_point = None
water_graph = defaultdict(list)
with open_source("DONNEES/cours-eau-region_1791104972648.geojson") as raw:
    river_data = json.load(raw)
for feature in river_data["features"]:
    if str(feature.get("properties", {}).get("TopoOH", "")).casefold() == "la marne":
        for line in feature["geometry"]["coordinates"]:
            for point in line:
                if source_point is None or point[1] < source_point[1]:
                    source_point = point[:2]
            for a, b in zip(line, line[1:]):
                u, v = tuple(round(x, 7) for x in a[:2]), tuple(round(x, 7) for x in b[:2])
                length = math.hypot((v[0] - u[0]) * math.cos(math.radians(48)), v[1] - u[1])
                water_graph[u].append((v, length))
                water_graph[v].append((u, length))
for feature in river_data["features"]:
    props = feature.get("properties", {})
    if str(props.get("TopoOH", "")).casefold() != "la marne":
        continue
    for line in feature["geometry"]["coordinates"]:
        clipped = [p[:2] for p in line if 3.4 <= p[0] <= 5.5 and 47.7 <= p[1] <= 49.2]
        if len(clipped) >= 2:
            reduced = simplify(clipped, tol=0.00065, preserve=source_point)
            river_lines.append(reduced)

story_ids = ["H5011020", "H5031020", "H5071050", "H5071020", "H5071040", "H5071010", "H5201005", "H5201010"]
source_node = min(water_graph, key=lambda p: (p[0] - source_point[0]) ** 2 + (p[1] - source_point[1]) ** 2)
distances, previous = {source_node: 0.0}, {}
queue = [(0.0, source_node)]
while queue:
    distance, node = heapq.heappop(queue)
    if distance != distances[node]:
        continue
    for neighbor, edge_length in water_graph[node]:
        candidate = distance + edge_length
        if candidate < distances.get(neighbor, math.inf):
            distances[neighbor], previous[neighbor] = candidate, node
            heapq.heappush(queue, (candidate, neighbor))

def nearest_node(lon, lat):
    return min(water_graph, key=lambda p: ((p[0] - lon) * math.cos(math.radians(48))) ** 2 + (p[1] - lat) ** 2)

story_nodes = [nearest_node(*source_point)] + [nearest_node(station_by_id[sid]["lon"], station_by_id[sid]["lat"]) for sid in story_ids]
end_node = story_nodes[-1]
if end_node not in distances:
    raise ValueError("La géométrie fournie ne relie pas la source au dernier arrêt de la Marne.")
journey = [end_node]
while journey[-1] != source_node:
    journey.append(previous[journey[-1]])
journey.reverse()
cumdist = [0.0]
for a, b in zip(journey, journey[1:]):
    cumdist.append(cumdist[-1] + math.hypot((b[0] - a[0]) * math.cos(math.radians(48)), b[1] - a[1]))
journey_progress = []
for target in story_nodes:
    i = min(range(len(journey)), key=lambda j: (journey[j][0] - target[0]) ** 2 + (journey[j][1] - target[1]) ** 2)
    journey_progress.append(round(100 * cumdist[i] / cumdist[-1], 2) if cumdist[-1] else 0)
anchors = sorted(set([0, len(journey) - 1] + [min(range(len(journey)), key=lambda j: (journey[j][0] - n[0]) ** 2 + (journey[j][1] - n[1]) ** 2) for n in story_nodes]))
journey_simplified = []
for left, right in zip(anchors, anchors[1:]):
    part = simplify(journey[left:right + 1], tol=0.0002)
    journey_simplified.extend(part if not journey_simplified else part[1:])

# The station series used above ends in Châlons. Continue the actual Marne
# geometry to its western edge in the supplied Grand Est river layer. The
# source layers contain a small gap at the station coordinate, so retain a
# short connector to the nearest downstream geometry endpoint.
route_end = journey[-1]
continuations = []
for line in river_lines:
    for reverse in (False, True):
        ordered = list(reversed(line)) if reverse else line
        near = ordered[0]
        gap = math.hypot((near[0] - route_end[0]) * math.cos(math.radians(48)), near[1] - route_end[1])
        if near[0] < route_end[0] and gap < 0.2 and ordered[-1][0] < near[0]:
            continuations.append((gap, ordered))
continuations.sort(key=lambda item: (item[1][-1][0] > 3.8, item[0]))
if continuations:
    extension = continuations[0][1]
    # Densify the data-layer gap so the boat crosses it smoothly.
    gap_end = extension[0]
    gap_km = math.hypot((gap_end[0] - route_end[0]) * 111 * math.cos(math.radians(48)), (gap_end[1] - route_end[1]) * 111)
    gap_steps = max(1, math.ceil(gap_km / 1.2))
    connector = [[route_end[0] + (gap_end[0] - route_end[0]) * i / gap_steps,
                  route_end[1] + (gap_end[1] - route_end[1]) * i / gap_steps]
                 for i in range(1, gap_steps + 1)]
    journey_simplified.extend(connector)
    journey_simplified.extend(extension[1:])
    journey.extend(connector)
    journey.extend(extension[1:])

# Recalculate station stops on the extended route so the last station remains
# before the river's regional exit rather than becoming the trip's endpoint.
cumdist = [0.0]
for a, b in zip(journey, journey[1:]):
    cumdist.append(cumdist[-1] + math.hypot((b[0] - a[0]) * math.cos(math.radians(48)), b[1] - a[1]))
journey_progress = []
for target in story_nodes:
    i = min(range(len(journey)), key=lambda j: (journey[j][0] - target[0]) ** 2 + (journey[j][1] - target[1]) ** 2)
    journey_progress.append(round(100 * cumdist[i] / cumdist[-1], 2) if cumdist[-1] else 0)

out = {
    "version": 1,
    "source": "DONNEES/donnees/donnees.csv et cours-eau-region_1791104972648.geojson",
    "period": [2000, 2026],
    "months": ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
    "marneStationIds": MARNE_IDS,
    "cityStationIds": CITY_IDS,
    "sourcePoint": [round(source_point[0], 6), round(source_point[1], 6)],
    "langresPoint": [5.332412, 47.858293],
    "journeyIds": story_ids,
    "journeyProgress": journey_progress,
    "journeyGeometry": [[round(p[0], 6), round(p[1], 6)] for p in journey_simplified],
    "exitPoint": [round(journey[-1][0], 6), round(journey[-1][1], 6)],
    "stations": {sid: station_record(sid) for sid in sorted(SELECTED)},
    "marneGeometry": river_lines,
    "geometryNote": "Cours d'eau nommés exactement « la Marne » dans la donnée fournie, simplifiés pour affichage.",
}
OUTPUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"written {OUTPUT} ({OUTPUT.stat().st_size:,} bytes); {len(river_lines)} river parts; {sum(map(len, river_lines))} vertices")
for sid in MARNE_IDS:
    s=out["stations"][sid]
    print(sid, s["town"], f"coverage={s['coverage']:.1%}", "baseline=", s["baseline"])
