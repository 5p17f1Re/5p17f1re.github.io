import type { Metadata } from "next";
import { Portfolio } from "@/components/Portfolio";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
      ru: "/ru/",
      "x-default": "/",
    },
  },
};

export default function HomePage() {
  return <Portfolio locale="en" />;
}
