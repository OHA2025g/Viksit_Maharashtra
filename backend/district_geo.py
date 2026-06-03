"""District centroids from bundled BharatMap GeoJSON (aligned with frontend map)."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Optional, Tuple

ALIASES = {"Ahilyanagar": "Ahmednagar", "Mumbai": "Mumbai City"}
GEOJSON_PATH = Path(__file__).parent.parent / "frontend" / "public" / "data" / "maharashtra-districts.geojson"

_centroid_cache: Optional[Dict[str, Tuple[float, float]]] = None


def _ring_centroid(ring):
    n = max(len(ring) - 1, 1)
    lng = sum(p[0] for p in ring[:n]) / n
    lat = sum(p[1] for p in ring[:n]) / n
    return lat, lng


def _feature_centroid(feature: dict) -> Tuple[float, float]:
    geom = feature.get("geometry") or {}
    gtype = geom.get("type")
    if gtype == "Polygon":
        return _ring_centroid(geom["coordinates"][0])
    if gtype == "MultiPolygon":
        best, best_area = geom["coordinates"][0][0], 0.0
        for polygon in geom["coordinates"]:
            ring = polygon[0]
            area = abs(
                sum(
                    ring[i][0] * ring[(i + 1) % len(ring)][1]
                    - ring[(i + 1) % len(ring)][0] * ring[i][1]
                    for i in range(len(ring))
                )
            )
            if area > best_area:
                best_area, best = area, ring
        return _ring_centroid(best)
    return 19.3, 75.7


def load_district_centroids() -> Dict[str, Tuple[float, float]]:
    global _centroid_cache
    if _centroid_cache is not None:
        return _centroid_cache
    data = json.loads(GEOJSON_PATH.read_text(encoding="utf-8"))
    out: Dict[str, Tuple[float, float]] = {}
    for feat in data.get("features", []):
        props = feat.get("properties") or {}
        name = props.get("dtname") or props.get("New_Name")
        if not name:
            continue
        lat, lng = _feature_centroid(feat)
        out[name] = (round(lat, 4), round(lng, 4))
    for geo_name, seed_name in ALIASES.items():
        if geo_name in out:
            out[seed_name] = out[geo_name]
    _centroid_cache = out
    return out


def resolve_asset_coordinates(
    district_name: Optional[str],
    district_id: Optional[str] = None,
    asset_id: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> Tuple[float, float]:
    """Return [lat, lng] snapped to district centroid when possible."""
    centroids = load_district_centroids()
    base = None
    if district_name and district_name in centroids:
        base = centroids[district_name]
    if base:
        h = sum(ord(c) for c in (asset_id or "")) % 10000
        j_lat = ((h % 100) - 50) * 0.00025
        j_lng = (((h // 100) % 100) - 50) * 0.00025
        return round(base[0] + j_lat, 6), round(base[1] + j_lng, 6)
    if latitude is not None and longitude is not None:
        return float(latitude), float(longitude)
    return 19.3, 75.7
