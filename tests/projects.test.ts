import { describe, expect, it } from "vitest";
import mediaManifest from "../generated/media-manifest.json";
import { projects, type Project } from "../data/projects";

const availableAssets = new Set(Object.keys(mediaManifest));

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
});
