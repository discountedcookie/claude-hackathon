"use client";

import { useEffect, useRef } from "react";
import Map, { Marker, type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// The bundler moves maplibre's code, so it can't find its worker next to itself; serve it from /public (see postinstall).
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export type Point = { lat: number; lng: number };

// OpenFreeMap tiles: free, no key. Attribution is a fixed line under the map (maplibre's own box kept covering it).
const STYLE = "https://tiles.openfreemap.org/styles/liberty";

export default function MapView({
  center,
  zoom = 12,
  markers = [],
  onPick,
  follow = false,
  className = "h-64",
}: {
  center: Point;
  zoom?: number;
  markers?: { point: Point; color: string; label?: string }[];
  onPick?: (p: Point) => void;
  follow?: boolean;
  className?: string;
}) {
  const map = useRef<MapRef>(null);

  // Keep a moving point in view (safety share viewer).
  useEffect(() => {
    if (follow) map.current?.easeTo({ center: [center.lng, center.lat], duration: 800 });
  }, [follow, center.lat, center.lng]);

  return (
    <div>
      <div className={`overflow-hidden rounded-xl border border-cnx-line ${className}`}>
        <Map
          ref={map}
          initialViewState={{ latitude: center.lat, longitude: center.lng, zoom }}
          mapStyle={STYLE}
          attributionControl={false}
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
      <p className="mt-1 text-right text-[10px] text-cnx-muted">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" className="underline">OpenStreetMap</a> ·{" "}
        <a href="https://openfreemap.org" target="_blank" className="underline">OpenFreeMap</a>
      </p>
    </div>
  );
}
