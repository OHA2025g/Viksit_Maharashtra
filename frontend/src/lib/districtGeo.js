/** GeoJSON district name aliases (seed DB names → BharatMap boundaries). */
export const DISTRICT_NAME_ALIASES = {
  Ahmednagar: "Ahilyanagar",
  "Mumbai City": "Mumbai",
};

function ringCentroid(ring) {
  const n = Math.max(ring.length - 1, 1);
  let lat = 0;
  let lng = 0;
  for (let i = 0; i < n; i += 1) {
    lng += ring[i][0];
    lat += ring[i][1];
  }
  return [lat / n, lng / n];
}

export function featureCentroid(feature) {
  const { geometry } = feature;
  if (!geometry) return null;

  if (geometry.type === "Polygon") {
    return ringCentroid(geometry.coordinates[0]);
  }

  if (geometry.type === "MultiPolygon") {
    let best = geometry.coordinates[0][0];
    let bestArea = 0;
    geometry.coordinates.forEach((polygon) => {
      const ring = polygon[0];
      const area = Math.abs(
        ring.reduce((acc, point, idx) => {
          const next = ring[(idx + 1) % ring.length];
          return acc + point[0] * next[1] - next[0] * point[1];
        }, 0),
      );
      if (area > bestArea) {
        bestArea = area;
        best = ring;
      }
    });
    return ringCentroid(best);
  }

  return null;
}

/** Build { districtName: [lat, lng] } from districts GeoJSON features. */
export function buildDistrictCentroidMap(districtsGeo) {
  const map = {};
  (districtsGeo?.features || []).forEach((feature) => {
    const name = feature.properties?.dtname || feature.properties?.New_Name;
    const center = featureCentroid(feature);
    if (name && center) map[name] = center;
  });
  Object.entries(DISTRICT_NAME_ALIASES).forEach(([seedName, geoName]) => {
    if (map[geoName]) map[seedName] = map[geoName];
  });
  return map;
}

function hashId(id) {
  const s = String(id || "");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return h;
}

const MH_LAT = [15.55, 22.05];
const MH_LNG = [72.55, 80.95];

function inMaharashtra(lat, lng) {
  return lat >= MH_LAT[0] && lat <= MH_LAT[1] && lng >= MH_LNG[0] && lng <= MH_LNG[1];
}

/**
 * Resolve pin position for an asset: prefer BharatMap district centroid + small jitter.
 */
export function resolveAssetPosition(asset, centroidMap) {
  const districtKey = asset.district_name || asset.district_id;
  const base = centroidMap[asset.district_name] || centroidMap[districtKey];

  if (base) {
    const h = hashId(asset.id || asset.asset_id);
    const jLat = ((h % 100) - 50) * 0.00025;
    const jLng = (((h >> 7) % 100) - 50) * 0.00025;
    return [base[0] + jLat, base[1] + jLng];
  }

  const lat = Number(asset.latitude);
  const lng = Number(asset.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && inMaharashtra(lat, lng)) {
    return [lat, lng];
  }

  return null;
}
