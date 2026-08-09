import type { Metadata } from "next";
import { UtmLinkGenerator } from "@/components/UtmLinkGenerator";

export const metadata: Metadata = {
  title: "UTM Link Generator — Seva Kudryavtsev",
  description: null,
  alternates: null,
  openGraph: null,
  twitter: null,
  robots: { index: false, follow: false },
};

export default function UtmLinkGeneratorPage() {
  return <UtmLinkGenerator />;
}
