import type { Metadata } from "next";
import { CaseAccessBoundary } from "@/components/CaseAccessBoundary";
import { CaseMedia } from "@/components/CaseMedia";
import { CasePhoneMedia } from "@/components/CasePhoneMedia";
import { CaseVideo } from "@/components/CaseVideo";

const mediaRoot = "pye-tryon-app";
const slug = "pye-try-on-app";
const title = "PYE Try-On App";
const description = "An app for choosing and trying on glasses with AR try-on.";
const cover = "/media/images/pye-tryon-app/01-cover-poster-968.webp";
const media = (name: string) => `${mediaRoot}/${name}`;

const phoneMedia = [
  {
    type: "video" as const,
    src: `/media/videos/${mediaRoot}/loading.mp4`,
    title: "PYE onboarding",
  },
  {
    type: "image" as const,
    assetKey: media("image-vertical-phone-02"),
    alt: "AR try-on",
  },
  {
    type: "image" as const,
    assetKey: media("image-vertical-phone-03"),
    alt: "Glasses catalogue",
  },
  {
    type: "image" as const,
    assetKey: media("image-vertical-phone-04"),
    alt: "PYE welcome screen",
  },
  {
    type: "video" as const,
    src: `/media/videos/${mediaRoot}/filterworks.mp4`,
    title: "Glasses filters",
  },
  {
    type: "image" as const,
    assetKey: media("image-vertical-phone-05"),
    alt: "Glasses filters",
  },
  {
    type: "image" as const,
    assetKey: media("image-vertical-phone-06"),
    alt: "Home try-on request",
  },
  {
    type: "image" as const,
    assetKey: media("image-vertical-phone-07"),
    alt: "PYE home screen",
  },
];

export const metadata: Metadata = {
  title: `${title} — PYE Try-On App · Seva Kudryavtsev`,
  description,
  alternates: { canonical: "/pye-try-on-app/" },
  openGraph: {
    type: "article",
    locale: "en_US",
    url: "/pye-try-on-app/",
    title,
    description,
    images: [
      {
        url: cover,
        width: 968,
        height: 968,
        alt: "PYE Try-On App",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [cover],
  },
};

export default function PyeTryOnAppPage() {
  return (
    <CaseAccessBoundary id={slug} scope="public">
      <main
        id="main-content"
        className="case-page-shell pye-case-page"
        lang="en"
      >
        <header className="case-title">
          <h1>{title}</h1>
        </header>

        <CaseVideo
          width="wide"
          src={`/media/videos/${mediaRoot}/cover-1156.mp4`}
          posterAssetKey={media("01-cover-poster")}
          title="PYE Try-On App cover"
          aspectRatio="1 / 1"
          showToggle={false}
          transitionId={slug}
        />

        <article className="case-content case-content--pye">
          <section className="case-text">
            <p>
              PYE is an eyewear brand with its own production and stores across major cities. The company designs universal yet distinctive frames, provides a full range of optical services, and treats retail as a combination of thoughtful interiors, clear interfaces and human service.
            </p>
            <p>
              Its mobile app extended that experience beyond the store. Customers could explore the full collection, filter frames by shape, colour, material or style, try them on using augmented reality, save favourites and order selected models for delivery or an at-home fitting.
            </p>
          </section>

          <CasePhoneMedia assets={[phoneMedia[0], phoneMedia[1]]} />

          <section className="case-text">
            <p>
              The first version of the product and its core visual language had already been established before I joined the project.
            </p>
          </section>

          <CasePhoneMedia assets={[phoneMedia[2], phoneMedia[3]]} />

          <section className="case-text">
            <p>
              My role was to refine the existing experience, complete missing scenarios and bring the interface to a more polished level across onboarding, navigation, filtering, favourites, virtual try-on and system states.
            </p>
          </section>

          <CasePhoneMedia assets={[phoneMedia[4], phoneMedia[5]]} />

          <section className="case-text">
            <p>
              Every touchpoint was refined to make the journey feel more complete, consistent and enjoyable.
            </p>
          </section>

          <CasePhoneMedia assets={[phoneMedia[6], phoneMedia[7]]} />

          <section className="case-text">
            <p>
              Working with the client and the development team, I iterated on the live product, reviewed implementations and helped carry the design through to release.
            </p>
          </section>

          <CaseMedia
            width="wide"
            assetKey={media("image-08")}
            alt="Help overlay"
          />
          <CaseMedia
            width="wide"
            assetKey={media("image-09")}
            alt="Photo mode"
          />

          <section className="case-text">
            <p>
              Download on the{" "}
              <a
                href="https://apps.apple.com/ru/app/p-y-e-optics/id1538573783"
                target="_blank"
                rel="noreferrer"
              >
                AppStore
              </a>
            </p>
          </section>
        </article>
      </main>
    </CaseAccessBoundary>
  );
}
