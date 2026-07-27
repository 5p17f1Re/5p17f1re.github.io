import type { Metadata } from "next";
import { CaseAccessBoundary } from "@/components/CaseAccessBoundary";
import { CasePhoneMedia } from "@/components/CasePhoneMedia";
import { CaseMedia } from "@/components/CaseMedia";
import { CaseVideo } from "@/components/CaseVideo";

const root = "pye-tryon-app";
const slug = "pye-try-on-app";
const media = (name: string) => `${root}/${name}`;
const title = "PYE Try-On App";
export const metadata: Metadata = { title: `${title} — Сева Кудрявцев`, description: "An app for choosing and trying on glasses with AR try-on." };

export default function PyeTryOnAppPage() {
  const phones = [
    { type: "video" as const, src: `/media/videos/${root}/loading.mp4`, title: "PYE onboarding" },
    { type: "image" as const, assetKey: media("image-vertical-phone-02"), alt: "AR try-on" },
    { type: "image" as const, assetKey: media("image-vertical-phone-03"), alt: "Glasses catalogue" },
    { type: "image" as const, assetKey: media("image-vertical-phone-04"), alt: "PYE welcome screen" },
    { type: "video" as const, src: `/media/videos/${root}/filterworks.mp4`, title: "Glasses filters" },
    { type: "image" as const, assetKey: media("image-vertical-phone-05"), alt: "Glasses filters" },
    { type: "image" as const, assetKey: media("image-vertical-phone-06"), alt: "Home try-on request" },
    { type: "image" as const, assetKey: media("image-vertical-phone-07"), alt: "PYE home screen" },
  ];
  return <CaseAccessBoundary id={slug} scope="public"><main id="main-content" className="case-page-shell pye-case-page" lang="en"><header className="case-title"><h1>{title}</h1></header><CaseVideo width="wide" src={`/media/videos/${root}/cover-1156.mp4`} posterAssetKey={media("01-cover-poster")} title="PYE Try-On App cover" aspectRatio="1 / 1" showToggle={false} transitionId={slug} /><article className="case-content case-content--pye"><section className="case-text"><p>PYE is an eyewear brand with its own production and&nbsp;stores across major cities. The company designs universal but distinctive frames, provides a full range of&nbsp;optical services and treats retail as a combination of&nbsp;thoughtful interiors, clear interfaces and human service.</p><p>Its mobile app extended that experience beyond the store. Customers could explore the full collection, filter frames by shape, colour, material or style, try them on using augmented reality, save favourites and order selected models for delivery or an at-home fitting.</p></section><CasePhoneMedia assets={[phones[0], phones[1]]} /><section className="case-text"><p>The first version of the product took one step closer to the project’s visual language.</p></section><CasePhoneMedia assets={[phones[2], phones[3]]} /><section className="case-text"><p>My role was to refine the existing experience, anticipate scenarios and bring the interface closer to a consistent visual language.</p></section><CasePhoneMedia assets={[phones[4], phones[5]]} /><section className="case-text"><p>We refined the journey across onboarding, registration, filtering and home try-on.</p></section><CasePhoneMedia assets={[phones[6], phones[7]]} /><section className="case-text"><p>Working with the client and a development team, I&nbsp;iterated on the live product and helped carry the&nbsp;design through to release.</p></section><CaseMedia width="wide" assetKey={media("image-08")} alt="Help overlay" /><CaseMedia width="wide" assetKey={media("image-09")} alt="Photo mode" /><section className="case-text"><p>Download App on the <a href="https://apps.apple.com/ru/app/p-y-e-optics/id1538573783" target="_blank" rel="noreferrer">AppStore</a></p></section></article></main></CaseAccessBoundary>;
}
