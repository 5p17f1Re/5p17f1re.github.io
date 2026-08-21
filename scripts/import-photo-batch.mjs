import { execFile } from "node:child_process";
import {
  appendFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import exifr from "exifr";
import sharp from "sharp";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const publisherUrl = requiredEnv("PHOTO_PUBLISHER_URL").replace(/\/$/, "");
const internalToken = requiredEnv("PUBLISHER_INTERNAL_TOKEN");
const mode = process.env.PHOTO_PUBLISH_MODE?.trim() || "publish";
const r2Endpoint = requiredEnv("R2_ENDPOINT");
const r2Bucket = requiredEnv("R2_BUCKET");
const imagePipeline = {
  widths: [480, 768, 1200, 1800],
  placeholderWidth: 96,
  avif: { quality: 72, effort: 5, chromaSubsampling: "4:4:4" },
  webp: { quality: 88, effort: 5, smartSubsample: true },
  jpeg: { quality: 88, mozjpeg: true },
};
const RAW_EXTENSIONS = new Set([
  "arw",
  "cr2",
  "cr3",
  "dng",
  "erf",
  "iiq",
  "kdc",
  "mef",
  "mos",
  "mrw",
  "nef",
  "nrw",
  "orf",
  "pef",
  "raf",
  "raw",
  "rw2",
  "rwl",
  "sr2",
  "srf",
  "srw",
  "x3f",
]);

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
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

async function callPublisher(pathname, options = {}) {
  const response = await fetch(`${publisherUrl}${pathname}`, {
    method: options.method ?? "POST",
    headers: {
      authorization: `Bearer ${internalToken}`,
      "content-type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Publisher ${pathname} failed with HTTP ${response.status}`);
  }
  return payload;
}

async function claimBatch() {
  return callPublisher("/internal/batches/claim");
}

async function claimUnpublishBatch() {
  return callPublisher("/internal/publications/claim-unpublish");
}

async function markBatchFailed(batchId, error) {
  await callPublisher(`/internal/batches/${batchId}/failed`, {
    body: { error: error instanceof Error ? error.message : String(error) },
  });
}

async function writeGithubOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath) await appendFile(outputPath, `${name}=${value}\n`);
}

async function downloadSource(objectKey, destination) {
  const environment = {
    ...process.env,
    AWS_ACCESS_KEY_ID: requiredEnv("R2_ACCESS_KEY_ID"),
    AWS_SECRET_ACCESS_KEY: requiredEnv("R2_SECRET_ACCESS_KEY"),
    AWS_DEFAULT_REGION: "auto",
  };
  await execFileAsync(
    "aws",
    [
      "s3",
      "cp",
      `s3://${r2Bucket}/${objectKey}`,
      destination,
      "--endpoint-url",
      r2Endpoint,
      "--only-show-errors",
    ],
    { env: environment },
  );
}

function cleanText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function formatCamera(exif) {
  const make = cleanText(exif?.Make);
  const model = cleanText(exif?.Model);
  return [make, model].filter(Boolean).join(" ") || undefined;
}

function formatLens(exif) {
  const make = cleanText(exif?.LensMake);
  const model = cleanText(exif?.LensModel);
  return [make, model].filter(Boolean).join(" ") || undefined;
}

function formatExifLocation(exif) {
  const values = [
    exif?.Location,
    exif?.LocationName,
    exif?.City,
    exif?.SubLocation,
    exif?.Country,
  ].filter((value) => typeof value === "string" && value.trim());
  return [...new Set(values.map((value) => value.trim()))].join(", ") || undefined;
}

function isRawDraft(draft) {
  const extension = draft.originalName?.split(".").pop()?.toLowerCase();
  return RAW_EXTENSIONS.has(extension) || draft.mimeType?.includes("raw");
}

async function decodeRawSource(draft, sourcePath, temporaryDirectory) {
  if (!isRawDraft(draft)) return sourcePath;

  const decodedPath = path.join(temporaryDirectory, `${draft.id}-decoded.tiff`);
  await execFileAsync(
    "dcraw_emu",
    ["-6", "-T", "-W", "-o", "1", "-Z", decodedPath, sourcePath],
    { maxBuffer: 4 * 1024 * 1024 },
  );
  return decodedPath;
}

async function readExif(sourcePath) {
  try {
    return await exifr.parse(sourcePath, {
      pick: [
        "DateTimeOriginal",
        "CreateDate",
        "Make",
        "Model",
        "LensMake",
        "LensModel",
        "Location",
        "LocationName",
        "City",
        "SubLocation",
        "Country",
      ],
    });
  } catch (error) {
    console.warn(`Could not read EXIF from ${sourcePath}: ${error.message}`);
    return {};
  }
}

function toDateString(value) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function pickPhotoDate(draft, exif) {
  return (
    toDateString(draft.takenAtOverride) ??
    toDateString(exif?.DateTimeOriginal) ??
    toDateString(exif?.CreateDate) ??
    toDateString(draft.createdAt)
  );
}

function getTargetWidths(sourceWidth) {
  return [...new Set([...imagePipeline.widths.filter((width) => width < sourceWidth), sourceWidth])]
    .sort((first, second) => first - second);
}

async function removePublicPhotoAssets(directory, photoId) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          await removePublicPhotoAssets(entryPath, photoId);
          return;
        }

        if (
          entry.name.startsWith(`${photoId}-`) &&
          /\.(avif|webp|jpg)$/.test(entry.name)
        ) {
          await rm(entryPath, { force: true });
        }
      }),
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function preparePhoto(draft, sourcePath, outputRoot) {
  const metadata = await sharp(sourcePath).metadata();
  const sourceWidth = metadata.width ?? 1600;
  const sourceHeight = metadata.height ?? sourceWidth;
  const targetWidths = getTargetWidths(sourceWidth);
  const outputDirectory = path.join(
    outputRoot,
    "public",
    "photos",
    draft.date.slice(0, 4),
    draft.date.slice(5, 7),
  );
  await mkdir(outputDirectory, { recursive: true });

  const publicDirectory = `/photos/${draft.date.slice(0, 4)}/${draft.date.slice(5, 7)}`;
  const variants = { avif: [], webp: [] };

  for (const width of targetWidths) {
    const stem = `${draft.id}-${width}`;
    const avifName = `${stem}.avif`;
    const webpName = `${stem}.webp`;
    const jpegName = `${stem}.jpg`;
    const base = sharp(sourcePath)
      .rotate()
      .resize({ width, withoutEnlargement: true });

    await Promise.all([
      base.clone().avif(imagePipeline.avif).toFile(path.join(outputDirectory, avifName)),
      base.clone().webp(imagePipeline.webp).toFile(path.join(outputDirectory, webpName)),
      base.clone().jpeg(imagePipeline.jpeg).toFile(path.join(outputDirectory, jpegName)),
    ]);

    variants.avif.push(`${publicDirectory}/${avifName} ${width}w`);
    variants.webp.push(`${publicDirectory}/${webpName} ${width}w`);
  }

  const placeholder = await sharp(sourcePath)
    .rotate()
    .resize({ width: imagePipeline.placeholderWidth, withoutEnlargement: true })
    .blur(0.4)
    .webp({ quality: 42 })
    .toBuffer();

  return {
    assetKey: draft.id,
    manifest: {
      width: sourceWidth,
      height: sourceHeight,
      fallback: `${publicDirectory}/${draft.id}-${targetWidths.at(-1)}.jpg`,
      avifSrcSet: variants.avif.join(", "),
      webpSrcSet: variants.webp.join(", "),
      placeholder: `data:image/webp;base64,${placeholder.toString("base64")}`,
    },
  };
}

async function main() {
  if (!["publish", "unpublish"].includes(mode)) {
    throw new Error(`Unsupported PHOTO_PUBLISH_MODE: ${mode}`);
  }

  const claimed = mode === "unpublish" ? await claimUnpublishBatch() : await claimBatch();
  if (!claimed.batch) {
    await writeGithubOutput("has_batch", "false");
    console.log(`No ${mode} photo changes. Nothing to update.`);
    return;
  }

  const batchId = claimed.batch.id;
  await writeGithubOutput("has_batch", "true");
  await writeGithubOutput("batch_id", batchId);
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "seva-photo-batch-"));
  const photosPath = path.join(root, "data", "photos.json");
  const manifestPath = path.join(root, "generated", "photo-media-manifest.json");

  try {
    const existingPhotos = await readJson(photosPath, []);
    const existingManifest = await readJson(manifestPath, {});

    if (mode === "unpublish") {
      const nextPhotos = existingPhotos.filter(
        (photo) => !claimed.batch.drafts.some((draft) => draft.id === photo.id),
      );
      const nextManifest = { ...existingManifest };

      for (const draft of claimed.batch.drafts) {
        delete nextManifest[draft.id];
        await removePublicPhotoAssets(path.join(root, "public", "photos"), draft.id);
      }

      await writeJsonAtomically(photosPath, nextPhotos);
      await writeJsonAtomically(manifestPath, nextManifest);
      console.log(`Prepared removal of ${claimed.batch.drafts.length} photo(s) in batch ${batchId}.`);
      return;
    }

    const nextPhotos = [...existingPhotos];
    const nextManifest = { ...existingManifest };

    for (const draft of claimed.batch.drafts) {
      const exifSourcePath = path.join(temporaryDirectory, `${draft.id}-source`);
      await downloadSource(draft.objectKey, exifSourcePath);
      const processingSourcePath = await decodeRawSource(
        draft,
        exifSourcePath,
        temporaryDirectory,
      );
      const exif = await readExif(exifSourcePath);
      const date = pickPhotoDate(draft, exif);
      if (!date) throw new Error(`Could not determine date for draft ${draft.id}`);

      const metadata = await sharp(processingSourcePath).metadata();
      const prepared = await preparePhoto(
        { ...draft, date },
        processingSourcePath,
        root,
      );
      const record = {
        id: draft.id,
        assetKey: prepared.assetKey,
        date,
        year: date.slice(0, 4),
        month: date.slice(5, 7),
        title: draft.title ?? null,
        caption: draft.caption ?? null,
        // The Telegram description is optional. Keep a non-empty accessible
        // fallback until automatic image description is added to the Worker.
        alt: draft.alt ?? "Фотография",
        location: draft.location ?? formatExifLocation(exif) ?? null,
        metadata: {
          width: metadata.width ?? prepared.manifest.width,
          height: metadata.height ?? prepared.manifest.height,
          ...(formatCamera(exif) ? { camera: formatCamera(exif) } : {}),
          ...(formatLens(exif) ? { lens: formatLens(exif) } : {}),
        },
      };

      const existingIndex = nextPhotos.findIndex((photo) => photo.id === record.id);
      if (existingIndex === -1) nextPhotos.push(record);
      else nextPhotos[existingIndex] = record;
      nextManifest[prepared.assetKey] = prepared.manifest;
    }

    nextPhotos.sort((first, second) => second.date.localeCompare(first.date));
    await writeJsonAtomically(photosPath, nextPhotos);
    await writeJsonAtomically(manifestPath, nextManifest);
    console.log(`Prepared ${claimed.batch.drafts.length} photo(s) in batch ${batchId}.`);
  } catch (error) {
    await markBatchFailed(batchId, error);
    throw error;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
