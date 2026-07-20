import type { Metadata } from "next";
import { Portfolio } from "@/components/Portfolio";

export const metadata: Metadata = {
  title: "Сева Кудрявцев — продуктовый дизайнер",
  description: "Портфолио продуктового дизайнера Севы Кудрявцева.",
  alternates: {
    canonical: "/ru/",
    languages: {
      en: "/",
      ru: "/ru/",
      "x-default": "/",
    },
  },
  openGraph: {
    locale: "ru_RU",
    url: "/ru/",
    title: "Сева Кудрявцев — продуктовый дизайнер",
    description: "Портфолио продуктового дизайнера Севы Кудрявцева.",
  },
};

export default function RussianHomePage() {
  return <Portfolio locale="ru" />;
}
