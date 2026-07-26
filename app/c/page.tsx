import type { Metadata } from "next";
import { UtmLinkGenerator } from "@/components/UtmLinkGenerator";

export const metadata: Metadata = {
  title: "UTM Link Generator — Seva Kudryavtsev",
  robots: { index: false, follow: false },
};

export default function UtmLinkGeneratorPage() {
  return <UtmLinkGenerator />;
}
