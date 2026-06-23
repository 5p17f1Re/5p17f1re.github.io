import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const originalsDir = path.join(root, "media-originals");
const imagesDir = path.join(originalsDir, "images");
const videosDir = path.join(originalsDir, "videos");
const outputDir = path.join(root, "public", "media");
const generatedDir = path.join(root, "generated");
const widths = [360, 720, 1200, 1600];
const publishedVideos = new Set(["samokat-cover.mp4"]);

await rm(outputDir, { recursive: true, force: true });
await mkdir(path.join(outputDir, "images"), { recursive: true });
await mkdir(path.join(outputDir, "videos"), { recursive: true });
await mkdir(generatedDir, { recursive: true });

const manifest = {};
const imageFiles = (await readdir(imagesDir))
  .filter((file) => /\.(png|jpe?g|webp|avif)$/i.test(file))
  .sort();

for (const file of imageFiles) {
  const source = path.join(imagesDir, file);
  const key = path.parse(file).name;
  const metadata = await sharp(source).metadata();
  const sourceWidth = metadata.width ?? 1600;
  const sourceHeight = metadata.height ?? sourceWidth;
  const targetWidths = widths.filter((width) => width < sourceWidth);

  if (!targetWidths.includes(sourceWidth)) targetWidths.push(sourceWidth);

  const variants = { avif: [], webp: [] };

  for (const width of targetWidths) {
    const base = sharp(source)
      .rotate()
      .resize({ width, withoutEnlargement: true });
    const avifName = `${key}-${width}.avif`;
    const webpName = `${key}-${width}.webp`;

    await Promise.all([
      base
        .clone()
        .avif({ quality: 72, effort: 5, chromaSubsampling: "4:4:4" })
        .toFile(path.join(outputDir, "images", avifName)),
      base
        .clone()
        .webp({ quality: 88, effort: 5, smartSubsample: true })
        .toFile(path.join(outputDir, "images", webpName)),
    ]);

    variants.avif.push(`/media/images/${avifName} ${width}w`);
    variants.webp.push(`/media/images/${webpName} ${width}w`);
  }

  const placeholder = await sharp(source)
    .rotate()
    .resize({ width: 24, withoutEnlargement: true })
    .blur(1.2)
    .webp({ quality: 34 })
    .toBuffer();

  manifest[key] = {
    width: sourceWidth,
    height: sourceHeight,
    fallback: `/media/images/${key}-${targetWidths.at(-1)}.webp`,
    avifSrcSet: variants.avif.join(", "),
    webpSrcSet: variants.webp.join(", "),
    placeholder: `data:image/webp;base64,${placeholder.toString("base64")}`,
  };
}

const videoFiles = (await readdir(videosDir))
  .filter(
    (file) =>
      /\.(mp4|webm)$/i.test(file) && publishedVideos.has(file),
  )
  .sort();

for (const file of videoFiles) {
  await cp(path.join(videosDir, file), path.join(outputDir, "videos", file));
}

await writeFile(
  path.join(generatedDir, "media-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(
  `Prepared ${imageFiles.length} images and ${videoFiles.length} videos.`,
);
