import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import mediaManifest from "../generated/media-manifest.json";
import publishedMedia from "../data/published-media.json";
import { projects, type Project } from "../data/projects";

const availableAssets = new Set(Object.keys(mediaManifest));
const projectRoot = path.resolve(import.meta.dirname, "..");
type MediaManifestAsset =
  (typeof mediaManifest)[keyof typeof mediaManifest];

function getPublicFilePath(publicUrl: string) {
  return path.join(projectRoot, "public", publicUrl.replace(/^\//, ""));
}

function getManifestUrls(asset: MediaManifestAsset) {
  const srcSetUrls = [asset.avifSrcSet, asset.webpSrcSet].flatMap((srcSet) =>
    srcSet.split(", ").map((candidate) => candidate.split(" ")[0]),
  );

  return [asset.fallback, ...srcSetUrls];
}

function getProjectAssetKeys(project: Project) {
  if (project.mediaType === "image") {
    return [project.image];
  }

  if (project.mediaType === "video") {
    return [project.poster, ...(project.extraImages ?? [])];
  }

  return [];
}

describe("projects", () => {
  it("keeps short function words attached in localized descriptions", () => {
    const englishDescriptions = projects.map((project) => project.description);
    const russianDescriptions = projects.flatMap((project) => {
      const description = project.localizedContent?.ru?.description;
      return description ? [description] : [];
    });
    const breakableEnglishFunctionWord =
      /(?<!-)\b(?:a|an|the|and|or|to|of|in|on|at|for|with|from|by|as|is|that|I) /;
    const breakableRussianFunctionWord =
      /(?:^|[ (])(?:а|в|во|и|к|ко|о|об|от|по|с|со|у|из|за|на|для) /iu;

    expect(
      englishDescriptions.filter((description) =>
        breakableEnglishFunctionWord.test(description),
      ),
    ).toEqual([]);
    expect(
      russianDescriptions.filter((description) =>
        breakableRussianFunctionWord.test(description),
      ),
    ).toEqual([]);
  });

  it("references assets present in the generated media manifest", () => {
    const missingAssets = projects
      .flatMap(getProjectAssetKeys)
      .filter((assetKey) => !availableAssets.has(assetKey));

    expect(missingAssets).toEqual([]);
  });

  it("supports projects without media", () => {
    const textProject: Project = {
      mediaType: "text",
      tag: "note",
      title: "Text project",
      description: "A project card without an image or video.",
    };

    expect(getProjectAssetKeys(textProject)).toEqual([]);
  });

  it("keeps every generated manifest file in public media", () => {
    const missingFiles = Object.values(mediaManifest)
      .flatMap(getManifestUrls)
      .filter((publicUrl) => !existsSync(getPublicFilePath(publicUrl)));

    expect(missingFiles).toEqual([]);
  });

  it("keeps every published video in public media", () => {
    const missingVideos = publishedMedia.videos.filter(
      (video) =>
        !existsSync(path.join(projectRoot, "public", "media", "videos", video)),
    );

    expect(missingVideos).toEqual([]);
  });
});
