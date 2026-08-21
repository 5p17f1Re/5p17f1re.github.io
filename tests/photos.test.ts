import { describe, expect, it } from "vitest";
import { groupPhotosByYearAndMonth, type PhotoRecord } from "../data/photos";

const fixturePhotos: PhotoRecord[] = [
  {
    id: "older",
    assetKey: "older",
    date: "2025-12-14",
    year: "2025",
    month: "12",
    title: null,
    caption: null,
    alt: "Older photo",
    location: null,
    metadata: { width: 1200, height: 800 },
  },
  {
    id: "newer",
    assetKey: "newer",
    date: "2026-08-20",
    year: "2026",
    month: "08",
    title: "A new photo",
    caption: "A caption",
    alt: "Newer photo",
    location: "Moscow",
    metadata: { width: 1800, height: 1200, camera: "Camera", lens: "Lens" },
  },
  {
    id: "same-month",
    assetKey: "same-month",
    date: "2026-08-01",
    year: "2026",
    month: "08",
    title: null,
    caption: null,
    alt: "Another newer photo",
    location: null,
    metadata: { width: 800, height: 800 },
  },
];

describe("photo publication data", () => {
  it("groups records by year and month without losing order", () => {
    expect(groupPhotosByYearAndMonth(fixturePhotos)).toEqual([
      {
        year: "2025",
        months: [{ month: "12", photos: [fixturePhotos[0]] }],
      },
      {
        year: "2026",
        months: [{ month: "08", photos: [fixturePhotos[1], fixturePhotos[2]] }],
      },
    ]);
  });
});
