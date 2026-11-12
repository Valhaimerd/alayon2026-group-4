import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CISC SchedFlow",
    short_name: "SchedFlow",
    description: "Building explorer and published room schedules",
    start_url: "/",
    display: "standalone",
    background_color: "#eef2ef",
    theme_color: "#18563f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
