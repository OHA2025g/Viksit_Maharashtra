import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  Popup,
  GeoJSON,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RAG_COLORS } from "@/lib/api";
import {
  buildDistrictCentroidMap,
  featureCentroid,
  resolveAssetPosition,
} from "@/lib/districtGeo";

/** Maharashtra state extent — aligned with State GIS Portal (NIC) map view. */
export const MAHARASHTRA_BOUNDS = L.latLngBounds(
  [15.55, 72.55],
  [22.05, 80.95],
);

const MAHARASHTRA_CENTER = [19.3, 75.7];
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const BOUNDARY_ATTRIBUTION =
  'District boundaries: BharatMap / Survey of India (open REST, bundled locally)';

let boundaryCache = null;

async function loadBoundaryData() {
  if (boundaryCache) return boundaryCache;
  const [districtRes, stateRes] = await Promise.all([
    fetch(`${process.env.PUBLIC_URL || ""}/data/maharashtra-districts.geojson`),
    fetch(`${process.env.PUBLIC_URL || ""}/data/maharashtra-state.geojson`),
  ]);
  if (!districtRes.ok || !stateRes.ok) {
    throw new Error("Failed to load Maharashtra boundary data");
  }
  boundaryCache = {
    districts: await districtRes.json(),
    state: await stateRes.json(),
  };
  return boundaryCache;
}

function districtLabelIcon(name, highlight = false) {
  const safeName = name || "District";
  const className = highlight ? "mh-district-label mh-district-label--highlight" : "mh-district-label";
  return L.divIcon({
    className: "mh-district-label-wrap",
    html: `<span class="${className}">${safeName}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function hqStarIcon() {
  return L.divIcon({
    className: "mh-district-hq-wrap",
    html: '<span class="mh-district-hq" aria-hidden="true">★</span>',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function ensureMapPanes(map) {
  if (!map.getPane("mh-boundaries")) {
    map.createPane("mh-boundaries");
    map.getPane("mh-boundaries").style.zIndex = 350;
  }
  if (!map.getPane("mh-labels")) {
    map.createPane("mh-labels");
    map.getPane("mh-labels").style.zIndex = 450;
  }
}

function FitMaharashtraBounds({ padding = 12, stateGeo, zoomOffset = 0, onBaselineZoom }) {
  const map = useMap();
  useEffect(() => {
    map.whenReady(() => {
      const { x, y } = map.getSize();
      if (x <= 0 || y <= 0) return;
      const fitPadding = Array.isArray(padding) ? padding : [padding, padding];
      const applyZoomOffset = () => {
        if (zoomOffset > 0) {
          const next = Math.min(map.getZoom() + zoomOffset, map.getMaxZoom());
          map.setZoom(next, { animate: false });
        }
        onBaselineZoom?.(map.getZoom());
      };
      if (stateGeo) {
        const layer = L.geoJSON(stateGeo);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: fitPadding, maxZoom: 9 });
          applyZoomOffset();
          return;
        }
      }
      map.fitBounds(MAHARASHTRA_BOUNDS, { padding: fitPadding });
      applyZoomOffset();
    });
  }, [map, padding, stateGeo, zoomOffset, onBaselineZoom]);
  return null;
}

/** Pan to selected district at the same zoom as the default map view. */
function FocusSelectedDistrict({ selectedDistrictId, positionedDistricts, baselineZoom }) {
  const map = useMap();
  const lastFocusId = React.useRef(null);

  useEffect(() => {
    if (!selectedDistrictId || baselineZoom == null) return;
    const item = positionedDistricts.find(({ district }) => district.id === selectedDistrictId);
    if (!item?.position) return;

    const shouldAnimate = lastFocusId.current != null && lastFocusId.current !== selectedDistrictId;
    lastFocusId.current = selectedDistrictId;
    map.flyTo(item.position, baselineZoom, {
      duration: shouldAnimate ? 0.45 : 0,
      animate: shouldAnimate,
    });
  }, [map, selectedDistrictId, positionedDistricts, baselineZoom]);

  useEffect(() => {
    if (!selectedDistrictId) lastFocusId.current = null;
  }, [selectedDistrictId]);

  return null;
}

/** Pan to selected asset at the same zoom as the default asset map view. */
function FocusSelectedAsset({ selectedAssetId, positionedAssets, baselineZoom }) {
  const map = useMap();
  const lastFocusId = React.useRef(null);

  useEffect(() => {
    if (!selectedAssetId || baselineZoom == null) return;
    const item = positionedAssets.find(({ asset }) => asset.id === selectedAssetId);
    if (!item?.position) return;

    const shouldAnimate = lastFocusId.current != null && lastFocusId.current !== selectedAssetId;
    lastFocusId.current = selectedAssetId;
    map.flyTo(item.position, baselineZoom, {
      duration: shouldAnimate ? 0.45 : 0,
      animate: shouldAnimate,
    });
  }, [map, selectedAssetId, positionedAssets, baselineZoom]);

  useEffect(() => {
    if (!selectedAssetId) lastFocusId.current = null;
  }, [selectedAssetId]);

  return null;
}

function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const run = () => map.invalidateSize({ animate: false });
    const t1 = setTimeout(run, 50);
    const t2 = setTimeout(run, 350);
    window.addEventListener("resize", run);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", run);
    };
  }, [map]);
  return null;
}

function MaharashtraBoundaries({ districtsGeo, stateGeo }) {
  const map = useMap();
  const [panesReady, setPanesReady] = useState(false);

  useLayoutEffect(() => {
    ensureMapPanes(map);
    setPanesReady(true);
  }, [map]);

  const districtStyle = useMemo(
    () => ({
      color: "#B8B8B8",
      weight: 1,
      fillColor: "#FFFFFF",
      fillOpacity: 1,
    }),
    [],
  );

  const stateStyle = useMemo(
    () => ({
      color: "#DC2626",
      weight: 3,
      fillOpacity: 0,
      fillColor: "transparent",
    }),
    [],
  );

  const labelFeatures = useMemo(
    () =>
      (districtsGeo?.features || []).map((feature) => {
        const name = feature.properties?.dtname || feature.properties?.New_Name || "District";
        const center = featureCentroid(feature) || MAHARASHTRA_CENTER;
        const highlight = /mumbai/i.test(name);
        return {
          id: feature.properties?.dtcode11 || name,
          name,
          center,
          highlight,
          hqIcon: hqStarIcon(),
          labelIcon: districtLabelIcon(name, highlight),
        };
      }),
    [districtsGeo],
  );

  if (!districtsGeo || !stateGeo || !panesReady) return null;

  return (
    <>
      <GeoJSON data={districtsGeo} style={districtStyle} pane="mh-boundaries" />
      <GeoJSON data={stateGeo} style={stateStyle} pane="mh-boundaries" />
      {labelFeatures.map((item) => (
        <React.Fragment key={item.id}>
          <Marker
            position={item.center}
            icon={item.hqIcon}
            pane="mh-labels"
            interactive={false}
          />
          <Marker
            position={item.center}
            icon={item.labelIcon}
            pane="mh-labels"
            interactive={false}
          />
        </React.Fragment>
      ))}
    </>
  );
}

function AssetPin({ asset, position, selected, onSelect }) {
  const color = RAG_COLORS[asset.rag]?.solid || "#2563EB";
  const center = position;
  if (!center) return null;
  const outerRadius = selected ? 20 : 16;
  const innerRadius = selected ? 6 : 5;

  const handlers = {
    click: (e) => {
      e.originalEvent?.stopPropagation?.();
      onSelect && onSelect(asset);
    },
  };

  return (
    <>
      <CircleMarker
        center={center}
        radius={outerRadius}
        pathOptions={{
          color,
          fillColor: color,
          fillOpacity: 0.28,
          weight: 1,
          opacity: 0.55,
        }}
        eventHandlers={handlers}
      />
      <CircleMarker
        center={center}
        radius={innerRadius}
        pathOptions={{
          color: selected ? "#EA580C" : color,
          fillColor: selected ? "#FB923C" : color,
          fillOpacity: 0.95,
          weight: selected ? 3 : 2,
          opacity: 1,
        }}
        eventHandlers={handlers}
      >
        <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
          <div className="text-xs max-w-[200px]">
            <div className="font-bold">{asset.asset_id}</div>
            <div className="line-clamp-2">{asset.name}</div>
            <div>{asset.district_name}</div>
          </div>
        </Tooltip>
        <Popup>
          <div className="text-xs min-w-[160px]">
            <div className="font-bold">{asset.name}</div>
            <div>
              {asset.asset_id} · {asset.district_name}
            </div>
            <div className="mt-1">
              Status: {asset.status} · RAG: {asset.rag}
            </div>
            <div className="text-slate-500">
              {asset.latitude?.toFixed(4)}, {asset.longitude?.toFixed(4)}
            </div>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
}

function DistrictPin({ district, position, selected, onSelect, radiusFn }) {
  const color = RAG_COLORS[district.rag]?.solid || "#94A3B8";
  const center = position;
  if (!center) return null;
  const baseRadius = radiusFn(district.progress_score ?? 0);
  const outerRadius = selected ? baseRadius + 6 : baseRadius + 2;
  const innerRadius = selected ? Math.max(baseRadius * 0.45, 6) : Math.max(baseRadius * 0.4, 5);

  const handlers = {
    click: (e) => {
      e.originalEvent?.stopPropagation?.();
      onSelect && onSelect(district);
    },
  };

  return (
    <>
      <CircleMarker
        center={center}
        radius={outerRadius}
        pathOptions={{
          color,
          fillColor: color,
          fillOpacity: 0.28,
          weight: 1,
          opacity: 0.55,
        }}
        eventHandlers={handlers}
      />
      <CircleMarker
        center={center}
        radius={innerRadius}
        pathOptions={{
          color: selected ? "#EA580C" : color,
          fillColor: selected ? "#FB923C" : color,
          fillOpacity: 0.95,
          weight: selected ? 3 : 2,
          opacity: 1,
        }}
        eventHandlers={handlers}
      >
        <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
          <div className="text-xs max-w-[200px]">
            <div className="font-bold">{district.name}</div>
            <div>
              {district.region} · {district.progress_score}%
            </div>
          </div>
        </Tooltip>
        <Popup>
          <div className="text-xs min-w-[160px]">
            <div className="font-bold">{district.name}</div>
            <div>
              {district.region} · {district.progress_score}% progress
            </div>
            <div className="mt-1">RAG: {district.rag}</div>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
}

export default function DistrictMap({
  districts,
  assets = [],
  onSelect,
  onAssetSelect,
  selectedAssetId,
  selectedDistrictId,
  compact = false,
  variant = "districts",
  ariaLabel,
}) {
  const usesBoundaryMap = variant === "assets" || variant === "districts";
  const isAssetMap = variant === "assets";
  const height = compact ? "100%" : 560;
  const [boundaryData, setBoundaryData] = useState(boundaryCache);
  const [boundaryError, setBoundaryError] = useState(null);
  const [mapBaselineZoom, setMapBaselineZoom] = useState(null);

  const centroidMap = useMemo(
    () => (boundaryData?.districts ? buildDistrictCentroidMap(boundaryData.districts) : {}),
    [boundaryData],
  );

  const positionedDistricts = useMemo(
    () =>
      districts
        .map((d) => {
          const position =
            centroidMap[d.name] ||
            (Number.isFinite(d.geo_lat) && Number.isFinite(d.geo_lon) ? [d.geo_lat, d.geo_lon] : null);
          return position ? { district: d, position } : null;
        })
        .filter(Boolean),
    [districts, centroidMap],
  );

  const positionedAssets = useMemo(
    () =>
      assets
        .map((a) => {
          const position = resolveAssetPosition(a, centroidMap);
          return position ? { asset: a, position } : null;
        })
        .filter(Boolean),
    [assets, centroidMap],
  );

  useEffect(() => {
    if (!usesBoundaryMap || boundaryData) return undefined;
    let active = true;
    loadBoundaryData()
      .then((data) => {
        if (active) setBoundaryData(data);
      })
      .catch((err) => {
        if (active) setBoundaryError(err.message);
      });
    return () => {
      active = false;
    };
  }, [usesBoundaryMap, boundaryData]);

  const radius = (score) => 8 + (score / 100) * 14;

  return (
    <div
      className={`rounded-lg overflow-hidden border border-slate-200 ${compact ? `h-full ${usesBoundaryMap ? "min-h-[32rem]" : "min-h-[20rem]"}` : ""} ${usesBoundaryMap ? "mh-map-shell" : ""}`}
      style={compact ? undefined : { height }}
      role="application"
      aria-label={ariaLabel || "Interactive map of Maharashtra districts and geo-tagged assets"}
    >
      <MapContainer
        center={MAHARASHTRA_CENTER}
        zoom={usesBoundaryMap ? 8 : 6}
        minZoom={6}
        maxBounds={MAHARASHTRA_BOUNDS}
        maxBoundsViscosity={0.85}
        style={{ height: "100%", width: "100%", background: usesBoundaryMap ? "#ffffff" : undefined }}
        scrollWheelZoom={usesBoundaryMap}
        zoomControl
        data-testid="district-leaflet-map"
      >
        <MapInvalidateSize />
        <FitMaharashtraBounds
          padding={usesBoundaryMap ? 28 : 16}
          stateGeo={usesBoundaryMap ? boundaryData?.state : null}
          zoomOffset={usesBoundaryMap ? 1 : 0}
          onBaselineZoom={usesBoundaryMap ? setMapBaselineZoom : undefined}
        />
        {isAssetMap && (
          <FocusSelectedAsset
            selectedAssetId={selectedAssetId}
            positionedAssets={positionedAssets}
            baselineZoom={mapBaselineZoom}
          />
        )}
        {variant === "districts" && usesBoundaryMap && (
          <FocusSelectedDistrict
            selectedDistrictId={selectedDistrictId}
            positionedDistricts={positionedDistricts}
            baselineZoom={mapBaselineZoom}
          />
        )}
        {!usesBoundaryMap && (
          <TileLayer
            attribution={OSM_ATTRIBUTION}
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
        )}
        {usesBoundaryMap && boundaryData && (
          <MaharashtraBoundaries
            districtsGeo={boundaryData.districts}
            stateGeo={boundaryData.state}
          />
        )}
        {usesBoundaryMap &&
          variant === "districts" &&
          positionedDistricts.map(({ district: d, position }) => (
            <DistrictPin
              key={d.id}
              district={d}
              position={position}
              selected={selectedDistrictId === d.id}
              onSelect={onSelect}
              radiusFn={radius}
            />
          ))}
        {!usesBoundaryMap &&
          districts.map((d) => {
            const color = RAG_COLORS[d.rag]?.solid || "#94A3B8";
            return (
              <CircleMarker
                key={d.id}
                center={[d.geo_lat, d.geo_lon]}
                radius={radius(d.progress_score)}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.35, weight: 2 }}
                eventHandlers={{ click: () => onSelect && onSelect(d) }}
              >
                <Tooltip direction="top" offset={[0, -4]}>
                  <div className="text-xs">
                    <div className="font-bold">{d.name}</div>
                    <div>
                      {d.region} · {d.progress_score}%
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        {isAssetMap &&
          positionedAssets.map(({ asset: a, position }) => (
            <AssetPin
              key={a.id}
              asset={a}
              position={position}
              selected={selectedAssetId === a.id}
              onSelect={onAssetSelect}
            />
          ))}
        {!isAssetMap &&
          assets.filter((a) => a.latitude != null && a.longitude != null).map((a) => {
            const color = RAG_COLORS[a.rag]?.solid || "#2563EB";
            const selected = selectedAssetId === a.id;
            return (
              <CircleMarker
                key={a.id}
                center={[a.latitude, a.longitude]}
                radius={selected ? 9 : 6}
                pathOptions={{
                  color: selected ? "#EA580C" : color,
                  fillColor: selected ? "#FB923C" : color,
                  fillOpacity: 0.9,
                  weight: selected ? 3 : 2,
                }}
                eventHandlers={{
                  click: (e) => {
                    e.originalEvent?.stopPropagation?.();
                    onAssetSelect && onAssetSelect(a);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -2]}>
                  <div className="text-xs max-w-[180px]">
                    <div className="font-bold">{a.asset_id}</div>
                    <div className="line-clamp-2">{a.name}</div>
                    <div>{a.district_name}</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
      </MapContainer>
      {usesBoundaryMap && boundaryError && (
        <p className="absolute bottom-2 left-2 right-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          District outline unavailable offline. Pins still shown.
        </p>
      )}
    </div>
  );
}

export { BOUNDARY_ATTRIBUTION };
