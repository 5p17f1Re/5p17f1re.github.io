import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const media = path.join(root, "media-originals/cases/pye-tryon-app/playground");

const compositions = [
  {
    output: "03-mirror-composition.png",
    width: 1158,
    height: 720,
    layers: [
      ["03-mirror-photo-a.png", 220, 0],
      ["03-mirror-photo-b.png", 818, 33],
      ["03-mirror-photo-c.png", 41, 301],
      ["03-mirror-screen-a.png", 742, 495],
    ],
  },
  {
    output: "08-bag-composition.png",
    width: 1158,
    height: 920,
    layers: [
      ["08-bag-photo-a.png", 80, 90],
      ["08-bag-photo-b.png", 198, 387],
      ["08-bag-screen.png", 648, 54],
    ],
  },
];

for (const { output, width, height, layers } of compositions) {
  await sharp({ create: { width, height, channels: 4, background: "#00000000" } })
    .composite(layers.map(([file, left, top]) => ({ input: path.join(media, file), left, top })))
    .png()
    .toFile(path.join(media, output));
  console.log(`Created ${output}`);
}
