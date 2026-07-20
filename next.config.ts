import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  turbopack: {
    root: process.cwd(),
  },
  images: {
    unoptimized: true,
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
