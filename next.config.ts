import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { execFileSync } from "node:child_process";

const siteVersionMajor = 1;
const siteVersionFirstCommit = 29;
const siteUpdatedAt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Moscow",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

function getRepositoryCommitCount() {
  try {
    return execFileSync("git", ["rev-list", "--count", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "0";
  }
}

const repositoryCommitCount =
  process.env.SITE_COMMIT_COUNT ?? getRepositoryCommitCount();
const parsedRepositoryCommitCount = Number.parseInt(
  repositoryCommitCount,
  10,
);
const siteVersionMinor = Number.isFinite(parsedRepositoryCommitCount)
  ? Math.max(1, parsedRepositoryCommitCount - siteVersionFirstCommit + 1)
  : 1;

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  allowedDevOrigins: ["127.0.0.1"],
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
    NEXT_PUBLIC_SITE_COMMIT_COUNT: repositoryCommitCount,
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
