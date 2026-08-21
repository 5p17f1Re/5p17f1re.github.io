import type { Metadata } from "next";
import { PhotoFeed } from "@/components/PhotoFeed";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Photos",
  description: "A personal collection of photographs.",
  alternates: {
    canonical: "/photos/",
    languages: {
      en: "/photos/",
      ru: "/ru/photos/",
      "x-default": "/photos/",
    },
  },
};

export default function PhotosPage() {
  return <PhotoFeed locale="en" />;
}
