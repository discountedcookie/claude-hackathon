"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useLang, useT, type Lang } from "@/lib/i18n";
import Icon from "./Icon";
import type { Point } from "./MapView";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

export type Place = Point & { label: string };

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: { name?: string; city?: string; state?: string; country?: string };
};

// City (or place) name for coordinates, via Photon's reverse geocoder; "" if unknown.
export async function placeName(lat: number, lng: number, lang: Lang): Promise<string> {
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}${lang === "en" ? "&lang=en" : ""}`);
    const p = ((await res.json()) as { features: PhotonFeature[] }).features[0]?.properties;
    return p?.city ?? p?.name ?? p?.state ?? "";
  } catch {
    return "";
  }
}

// Fallback when browser location is denied: search a place (Photon geocoder) or tap the map.
export default function LocationPicker({ onPick, onLocate }: { onPick: (p: Place) => void; onLocate: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [tapped, setTapped] = useState<Point | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
    const body = (await res.json()) as { features: PhotonFeature[] };
    setResults(
      body.features.map((f) => ({
        lng: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
        label: [f.properties.name, f.properties.city ?? f.properties.state, f.properties.country].filter(Boolean).join(", "),
      })),
    );
  }

  return (
    <section className="cnx-card space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{t("locWhere")}</h2>
        <button onClick={onLocate} className="cnx-btn-light text-sm">
          <Icon name="locate" className="h-4 w-4" />
          {t("locMine")}
        </button>
      </div>
      <form onSubmit={search} className="flex gap-2">
        <input className="cnx-input" placeholder={t("locSearchPh")} value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="cnx-btn shrink-0" aria-label={t("locSearchPh")}>
          <Icon name="search" className="h-5 w-5" />
        </button>
      </form>
      {results.map((r) => (
        <button key={`${r.lat},${r.lng}`} onClick={() => onPick(r)} className="block w-full rounded-xl border border-cnx-line p-2 text-left text-sm hover:bg-cnx-pale">
          {r.label}
        </button>
      ))}
      <p className="text-xs text-cnx-muted">{t("locOrTap")}</p>
      <MapView
        center={tapped ?? { lat: 18.7883, lng: 98.9853 }}
        zoom={tapped ? 10 : 3}
        markers={tapped ? [{ point: tapped, color: "#285c48" }] : []}
        onPick={setTapped}
      />
      {tapped && (
        <button onClick={async () => onPick({ ...tapped, label: await placeName(tapped.lat, tapped.lng, lang) })} className="cnx-btn w-full">
          {t("locUse")}
        </button>
      )}
    </section>
  );
}
