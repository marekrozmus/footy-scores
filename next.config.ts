import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The generated reference endpoint (/v1/football/matches/[slug]) is meant to be fetched by
  // external QA tooling running on a different origin, so it needs CORS opened up — mirroring
  // stacy.olympics.com's own `Access-Control-Allow-Origin: *`, confirmed during this project's
  // research into the source data. Scoped to /v1/*, not the whole app: the internal /api/* routes
  // back this app's own UI and are only ever called same-origin.
  async headers() {
    return [
      {
        source: "/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
};

export default nextConfig;
