import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const siteVersionMajor = 1;
const siteVersionFirstRun = 29;
const githubRunNumber = Number.parseInt(
  process.env.GITHUB_RUN_NUMBER ?? "",
  10,
);
const siteVersionMinor = Number.isFinite(githubRunNumber)
  ? Math.max(1, githubRunNumber - siteVersionFirstRun + 1)
  : 1;
const siteUpdatedAt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Moscow",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

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
  env: {
    NEXT_PUBLIC_SITE_UPDATED_AT:
      process.env.SITE_UPDATED_AT ?? siteUpdatedAt,
    NEXT_PUBLIC_SITE_VERSION:
      process.env.SITE_VERSION ?? `${siteVersionMajor}.${siteVersionMinor}`,
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
