import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "With CNX",
    short_name: "With CNX",
    description: "Find an event and someone to go with in Chiang Mai.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f3",
    theme_color: "#285c48",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
