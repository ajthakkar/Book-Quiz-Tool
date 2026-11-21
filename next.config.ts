import type { NextConfig } from "next";

/* A static site: the questions are baked in at build time, so it needs no server and no API key.
   On GitHub Pages it lives under /chapter-and-verse; set BASE_PATH for that build. */
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
