import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import mediaManifest from "../generated/media-manifest.json";

describe("PYE Playground screen media", () => {
  it("publishes original PNGs for screens, compositions, and cover cards", () => {
    const assets = mediaManifest as Record<string, { original?: string }>;
    const entries = Object.entries(assets).filter(([key]) =>
      key.startsWith("pye-tryon-app/playground/") &&
      (key.endsWith("-screen") || key.endsWith("-composition") || /10-card-(front|back)-image$/.test(key)),
    );

    expect(entries.length).toBeGreaterThan(20);

    for (const [key, asset] of entries) {
      expect(asset.original, key).toMatch(/\.png$/);
      expect(existsSync(join(process.cwd(), "public", asset.original!.replace(/^\//, ""))), key).toBe(true);
    }

    expect(assets["pye-tryon-app/playground/03-mirror-composition"]?.original).toMatch(/\.png$/);
    expect(assets["pye-tryon-app/playground/08-bag-composition"]?.original).toMatch(/\.png$/);
  });

  it("keeps collage backgrounds transparent for the theme surface", async () => {
    const assets = mediaManifest as Record<string, { original?: string }>;

    for (const name of ["03-mirror-composition", "08-bag-composition"]) {
      const original = assets[`pye-tryon-app/playground/${name}`].original;
      const { data, info } = await sharp(join(process.cwd(), "public", original!.replace(/^\//, "")))
        .raw()
        .toBuffer({ resolveWithObject: true });

      expect(info.channels).toBe(4);
      expect(data[3], name).toBe(0);
      let hasOpaquePixel = false;
      for (let offset = 3; offset < data.length; offset += 4) {
        if (data[offset] === 255) {
          hasOpaquePixel = true;
          break;
        }
      }
      expect(hasOpaquePixel, name).toBe(true);
    }
  });

  it("keeps the unified gallery artwork transparent and full width", async () => {
    const { data, info } = await sharp(join(process.cwd(), "public/illustrations/pye-gallery-strip.png"))
      .raw()
      .toBuffer({ resolveWithObject: true });

    expect(info.width).toBe(9228);
    expect(info.height).toBe(1440);
    expect(info.channels).toBe(4);
    expect(data[3]).toBeLessThan(255);
    expect(data[(Math.floor(info.height / 2) * info.width + 500) * 4 + 3]).toBe(255);
  });
});
