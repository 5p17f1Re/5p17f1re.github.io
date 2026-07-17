import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://5p17f1re.github.io/sitemap.xml",
    host: "https://5p17f1re.github.io",
  };
}
