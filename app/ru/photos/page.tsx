import type { Metadata } from "next";
import { PhotoFeed } from "@/components/PhotoFeed";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Фотографии",
  description: "Личная коллекция фотографий.",
  alternates: {
    canonical: "/ru/photos/",
    languages: {
      en: "/photos/",
      ru: "/ru/photos/",
      "x-default": "/photos/",
    },
  },
};

export default function RussianPhotosPage() {
  return <PhotoFeed locale="ru" />;
}
