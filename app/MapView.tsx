"use client";

import Map, { Marker, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// The bundler moves maplibre's code, so it can't find its worker next to itself; serve it from /public (see postinstall).
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export type Point = { lat: number; lng: number };

// OpenFreeMap tiles: free, no key; the style carries the OSM/OpenFreeMap attribution.
const STYLE = "https://tiles.openfreemap.org/styles/liberty";

export default function MapView({
  center,
  zoom = 12,
  markers = [],
  onPick,
  className = "h-64",
}: {
  center: Point;
  zoom?: number;
  markers?: { point: Point; color: string; label?: string }[];
  onPick?: (p: Point) => void;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-cnx-line ${className}`}>
      <Map
        initialViewState={{ latitude: center.lat, longitude: center.lng, zoom }}
        mapStyle={STYLE}
        attributionControl={{ compact: true }}
        // Compact attribution starts expanded; fold it to the (i) button so it doesn't cover the small map.
        onLoad={(e) => e.target.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show")}
        onClick={onPick ? (e: MapLayerMouseEvent) => onPick({ lat: e.lngLat.lat, lng: e.lngLat.lng }) : undefined}
        style={{ width: "100%", height: "100%" }}
      >
        {markers.map((m, i) => (
          <Marker key={i} latitude={m.point.lat} longitude={m.point.lng} color={m.color}>
            {m.label && (
              <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-cnx-ink shadow">{m.label}</span>
            )}
          </Marker>
        ))}
      </Map>
    </div>
  );
}
