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
const publishedVideos = new Set([
  "samokat-cover.mp4",
  "starter-foodhalls/12-demo.mp4",
  "starter-stories/16-web-demo.mp4",
]);

await rm(outputDir, { recursive: true, force: true });
await mkdir(path.join(outputDir, "images"), { recursive: true });
await mkdir(path.join(outputDir, "videos"), { recursive: true });
await mkdir(generatedDir, { recursive: true });

async function listFilesRecursively(directory, relativeDirectory = "") {
  const entries = await readdir(path.join(directory, relativeDirectory), {
    withFileTypes: true,
  });

  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = path.join(relativeDirectory, entry.name);

      return entry.isDirectory()
        ? listFilesRecursively(directory, relativePath)
        : [relativePath];
    }),
  );

  return files.flat();
}

const manifest = {};
const imageFiles = (await listFilesRecursively(imagesDir))
  .filter((file) => /\.(png|jpe?g|webp|avif)$/i.test(file))
  .sort();

for (const file of imageFiles) {
  const source = path.join(imagesDir, file);
  const parsedFile = path.parse(file);
  const relativeDirectory = parsedFile.dir;
  const key = path
    .join(relativeDirectory, parsedFile.name)
    .split(path.sep)
    .join("/");
  const imageOutputDirectory = path.join(outputDir, "images", relativeDirectory);
  const publicImageDirectory = path
    .join("/media/images", relativeDirectory)
    .split(path.sep)
    .join("/");
  await mkdir(imageOutputDirectory, { recursive: true });
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
    const avifName = `${parsedFile.name}-${width}.avif`;
    const webpName = `${parsedFile.name}-${width}.webp`;

    await Promise.all([
      base
        .clone()
        .avif({ quality: 72, effort: 5, chromaSubsampling: "4:4:4" })
        .toFile(path.join(imageOutputDirectory, avifName)),
      base
        .clone()
        .webp({ quality: 88, effort: 5, smartSubsample: true })
        .toFile(path.join(imageOutputDirectory, webpName)),
    ]);

    variants.avif.push(`${publicImageDirectory}/${avifName} ${width}w`);
    variants.webp.push(`${publicImageDirectory}/${webpName} ${width}w`);
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
    fallback: `${publicImageDirectory}/${parsedFile.name}-${targetWidths.at(-1)}.webp`,
    avifSrcSet: variants.avif.join(", "),
    webpSrcSet: variants.webp.join(", "),
    placeholder: `data:image/webp;base64,${placeholder.toString("base64")}`,
  };
}

const videoFiles = (await listFilesRecursively(videosDir))
  .filter(
    (file) =>
      /\.(mp4|webm)$/i.test(file) &&
      publishedVideos.has(file.split(path.sep).join("/")),
  )
  .sort();

for (const file of videoFiles) {
  const destination = path.join(outputDir, "videos", file);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join(videosDir, file), destination);
}

await writeFile(
  path.join(generatedDir, "media-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(
  `Prepared ${imageFiles.length} images and ${videoFiles.length} videos.`,
);
