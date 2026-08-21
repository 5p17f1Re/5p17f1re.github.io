import photoRecords from "./photos.json";

export type PhotoMetadata = {
  width: number;
  height: number;
  camera?: string;
  lens?: string;
};

export type PhotoRecord = {
  id: string;
  assetKey: string;
  date: string;
  year: string;
  month: string;
  title: string | null;
  caption: string | null;
  alt: string;
  location: string | null;
  metadata: PhotoMetadata;
};

export const photos = (photoRecords as PhotoRecord[]).toSorted((first, second) =>
  second.date.localeCompare(first.date),
);

export function getPublishedPhotos() {
  return photos;
}

export function groupPhotosByYearAndMonth(records: readonly PhotoRecord[]) {
  const years = new Map<string, Map<string, PhotoRecord[]>>();

  for (const photo of records) {
    const months = years.get(photo.year) ?? new Map<string, PhotoRecord[]>();
    const monthPhotos = months.get(photo.month) ?? [];
    months.set(photo.month, [...monthPhotos, photo]);
    years.set(photo.year, months);
  }

  return [...years.entries()].map(([year, months]) => ({
    year,
    months: [...months.entries()].map(([month, monthPhotos]) => ({
      month,
      photos: monthPhotos,
    })),
  }));
}
