import type { Metadata } from "next";
import { Portfolio } from "@/components/Portfolio";
import { getAbout } from "@/data/about";

const title = "Сева Кудрявцев";
const description = getAbout("ru").paragraphs[0];
const portrait = "/media/images/sevakudrytavtsev-600.webp";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/ru/",
    languages: {
      en: "/",
      ru: "/ru/",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/ru/",
    siteName: "Сева Кудрявцев",
    title,
    description,
    images: [
      {
        url: portrait,
        width: 600,
        height: 600,
        alt: "Сева Кудрявцев",
      },
    ],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: [portrait],
  },
};

export default function RussianHomePage() {
  return <Portfolio locale="ru" />;
}
