import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  rmdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const originalsDir = path.join(root, "media-originals");
const imagesDir = path.join(originalsDir, "images");
const videosDir = path.join(originalsDir, "videos");
const outputDir = path.join(root, "public", "media");
const generatedDir = path.join(root, "generated");
const manifestPath = path.join(generatedDir, "media-manifest.json");
const statePath = path.join(generatedDir, "media-state.json");
const publishedMediaPath = path.join(root, "data", "published-media.json");
const imagePipeline = {
  version: 1,
  widths: [360, 720, 1200, 1600],
  placeholderWidth: 96,
  avif: { quality: 72, effort: 5, chromaSubsampling: "4:4:4" },
  webp: { quality: 88, effort: 5, smartSubsample: true },
  placeholder: { blur: 0.4, quality: 42 },
};
const forceRebuild = process.argv.slice(2).includes("--force");

const unsupportedArguments = process.argv
  .slice(2)
  .filter((argument) => argument !== "--force");

if (unsupportedArguments.length > 0) {
  throw new Error(`Unknown argument: ${unsupportedArguments.join(", ")}`);
}

await mkdir(path.join(outputDir, "images"), { recursive: true });
await mkdir(path.join(outputDir, "videos"), { recursive: true });
await mkdir(generatedDir, { recursive: true });

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

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

async function hashFile(filePath) {
  const hash = createHash("sha256");

  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  return hash.digest("hex");
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJsonAtomically(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporaryPath, filePath);
}

async function allOutputsExist(outputs) {
  const results = await Promise.all(
    outputs.map((output) => pathExists(path.join(root, output))),
  );
  return results.every(Boolean);
}

async function removeOutputs(outputs) {
  await Promise.all(
    outputs.map((output) =>
      rm(path.join(root, output), { force: true, recursive: false }),
    ),
  );
}

async function removeUnexpectedOutputs(expectedOutputs) {
  const outputFiles = await listFilesRecursively(outputDir);
  const unexpectedOutputs = outputFiles
    .map((file) => toPosixPath(path.relative(root, path.join(outputDir, file))))
    .filter((file) => !expectedOutputs.has(file));

  await removeOutputs(unexpectedOutputs);
  return unexpectedOutputs.length;
}

async function removeExistingImageVariants(directory, imageName) {
  const escapedImageName = imageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const variantPattern = new RegExp(
    `^${escapedImageName}-\\d+\\.(?:avif|webp)$`,
    "i",
  );
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && variantPattern.test(entry.name))
      .map((entry) => rm(path.join(directory, entry.name), { force: true })),
  );
}

async function removeEmptyDirectories(directory, preserveDirectory = true) {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) =>
        removeEmptyDirectories(path.join(directory, entry.name), false),
      ),
  );

  if (!preserveDirectory && (await readdir(directory)).length === 0) {
    await rmdir(directory);
  }
}

const pipelineSignature = createHash("sha256")
  .update(JSON.stringify({ imagePipeline, sharp: sharp.versions }))
  .digest("hex");
const previousState = await readJson(statePath, {
  pipelineVersion: null,
  pipelineSignature: null,
  images: {},
  videos: {},
});
const publishedMedia = await readJson(publishedMediaPath, { videos: [] });
const publishedVideos = new Set(publishedMedia.videos);
const canMigrateLegacyState =
  previousState.pipelineVersion === undefined &&
  typeof previousState.pipelineSignature === "string";
const canReuseImagePipeline =
  !forceRebuild &&
  (previousState.pipelineSignature === pipelineSignature ||
    canMigrateLegacyState);
const manifest = {};
const nextState = {
  pipelineVersion: imagePipeline.version,
  pipelineSignature,
  images: {},
  videos: {},
};
let preparedImageCount = 0;
let reusedImageCount = 0;
let copiedVideoCount = 0;
let reusedVideoCount = 0;

const imageFiles = (await listFilesRecursively(imagesDir))
  .filter((file) => /\.(png|jpe?g|webp|avif)$/i.test(file))
  .sort();

for (const file of imageFiles) {
  const source = path.join(imagesDir, file);
  const parsedFile = path.parse(file);
  const relativeDirectory = parsedFile.dir;
  const key = toPosixPath(path.join(relativeDirectory, parsedFile.name));
  const sourceHash = await hashFile(source);
  const previousImage = previousState.images[key];
  const canReuseImage =
    canReuseImagePipeline &&
    previousImage?.sourceHash === sourceHash &&
    (await allOutputsExist(previousImage.outputs));

  if (canReuseImage) {
    manifest[key] = previousImage.manifest;
    nextState.images[key] = previousImage;
    reusedImageCount += 1;
    continue;
  }

  if (previousImage) await removeOutputs(previousImage.outputs);

  const imageOutputDirectory = path.join(
    outputDir,
    "images",
    relativeDirectory,
  );
  const publicImageDirectory = toPosixPath(
    path.join("/media/images", relativeDirectory),
  );
  await mkdir(imageOutputDirectory, { recursive: true });
  await removeExistingImageVariants(imageOutputDirectory, parsedFile.name);

  const metadata = await sharp(source).metadata();
  const sourceWidth = metadata.width ?? 1600;
  const sourceHeight = metadata.height ?? sourceWidth;
  const targetWidths = [
    ...new Set([
      ...imagePipeline.widths.filter((width) => width < sourceWidth),
      sourceWidth,
    ]),
  ].sort((left, right) => left - right);
  const variants = { avif: [], webp: [] };
  const outputs = [];

  for (const width of targetWidths) {
    const base = sharp(source)
      .rotate()
      .resize({ width, withoutEnlargement: true });
    const avifName = `${parsedFile.name}-${width}.avif`;
    const webpName = `${parsedFile.name}-${width}.webp`;
    const avifOutput = path.join(imageOutputDirectory, avifName);
    const webpOutput = path.join(imageOutputDirectory, webpName);

    await Promise.all([
      base
        .clone()
        .avif(imagePipeline.avif)
        .toFile(avifOutput),
      base
        .clone()
        .webp(imagePipeline.webp)
        .toFile(webpOutput),
    ]);

    variants.avif.push(`${publicImageDirectory}/${avifName} ${width}w`);
    variants.webp.push(`${publicImageDirectory}/${webpName} ${width}w`);
    outputs.push(
      toPosixPath(path.relative(root, avifOutput)),
      toPosixPath(path.relative(root, webpOutput)),
    );
  }

  const placeholder = await sharp(source)
    .rotate()
    .resize({
      width: imagePipeline.placeholderWidth,
      withoutEnlargement: true,
    })
    .blur(imagePipeline.placeholder.blur)
    .webp({ quality: imagePipeline.placeholder.quality })
    .toBuffer();
  const imageManifest = {
    width: sourceWidth,
    height: sourceHeight,
    fallback: `${publicImageDirectory}/${parsedFile.name}-${targetWidths.at(-1)}.webp`,
    avifSrcSet: variants.avif.join(", "),
    webpSrcSet: variants.webp.join(", "),
    placeholder: `data:image/webp;base64,${placeholder.toString("base64")}`,
  };

  manifest[key] = imageManifest;
  nextState.images[key] = { sourceHash, outputs, manifest: imageManifest };
  preparedImageCount += 1;
}

for (const [key, previousImage] of Object.entries(previousState.images)) {
  if (!nextState.images[key]) await removeOutputs(previousImage.outputs);
}

const videoFiles = (await listFilesRecursively(videosDir))
  .filter(
    (file) =>
      /\.(mp4|webm)$/i.test(file) &&
      publishedVideos.has(toPosixPath(file)),
  )
  .sort();

for (const file of videoFiles) {
  const normalizedFile = toPosixPath(file);
  const source = path.join(videosDir, file);
  const destination = path.join(outputDir, "videos", file);
  const output = toPosixPath(path.relative(root, destination));
  const sourceHash = await hashFile(source);
  const previousVideo = previousState.videos[normalizedFile];
  const canReuseVideo =
    !forceRebuild &&
    previousVideo?.sourceHash === sourceHash &&
    (await pathExists(destination));

  await mkdir(path.dirname(destination), { recursive: true });

  if (canReuseVideo) {
    reusedVideoCount += 1;
  } else {
    await cp(source, destination);
    copiedVideoCount += 1;
  }

  nextState.videos[normalizedFile] = { sourceHash, output };
}

for (const [file, previousVideo] of Object.entries(previousState.videos)) {
  if (!nextState.videos[file]) await removeOutputs([previousVideo.output]);
}

const expectedOutputs = new Set([
  ...Object.values(nextState.images).flatMap((image) => image.outputs),
  ...Object.values(nextState.videos).map((video) => video.output),
]);
const removedUnexpectedOutputCount =
  await removeUnexpectedOutputs(expectedOutputs);
await removeEmptyDirectories(outputDir);
await Promise.all([
  writeJsonAtomically(manifestPath, manifest),
  writeJsonAtomically(statePath, nextState),
]);

console.log(
  [
    `Images: ${preparedImageCount} prepared, ${reusedImageCount} reused.`,
    `Videos: ${copiedVideoCount} copied, ${reusedVideoCount} reused.`,
    `Unexpected outputs removed: ${removedUnexpectedOutputCount}.`,
  ].join(" "),
);
