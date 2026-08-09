import type { Metadata } from "next";
import { CaseAccessBoundary } from "@/components/CaseAccessBoundary";
import { CaseMedia, CaseMediaPair } from "@/components/CaseMedia";
import { CaseVideo } from "@/components/CaseVideo";

const mediaRoot = "starter-stories";
const media = (name: string) => `${mediaRoot}/${name}`;
const title = "Restaurant Stories in Starter";
const description =
  "Giving restaurants a self-serve way to communicate with guests.";
const cover = "/media/images/starter-stories/01-cover-1920.webp";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/starter-stories/",
    languages: {
      en: "/starter-stories/",
      ru: "/ru/starter-stories/",
      "x-default": "/starter-stories/",
    },
  },
  openGraph: {
    type: "article",
    locale: "en_US",
    url: "/starter-stories/",
    title,
    description,
    images: [
      {
        url: cover,
        width: 1920,
        height: 1080,
        alt: "Stories on a restaurant website and mobile app",
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

export default function StarterStoriesPage() {
  return (
    <CaseAccessBoundary id="starter-stories" scope="public">
      <main
        id="main-content"
        className="case-page-shell"
        lang="en"
      >
        <header className="case-title">
          <h1>{title}</h1>
        </header>

        <CaseMedia
          width="full"
          assetKey={media("01-cover")}
          alt=""
          eager
          transitionId="starter-stories"
        />

        <article className="case-content">
          <section className="case-text case-text--intro">
            <h2>Giving restaurants a self-serve way to communicate with guests</h2>
            <p>
              STARTER is a B2B2C platform for restaurants. It powers branded
              apps and websites where guests can order food, discover
              promotions, and use loyalty programmes. Restaurant owners,
              managers, and marketers work in its admin tools.
            </p>
            <p>
              Restaurants needed a simple way to talk about promotions, menu
              launches, and events. A banner had too little room; a well-made
              landing page often required a designer. We introduced Stories as
              a familiar guest-facing format, but designed it as a durable
              product capability rather than an expiring social post.
            </p>
            <p>
              As the lead designer, I was responsible for research, UX, and art
              direction across the guest app, website, and admin panel. Another
              designer produced the guest-facing and admin interfaces under my
              direction. I also worked with a product manager and the
              engineering team.
            </p>
          </section>

          <section className="case-text">
            <h2>Establishing what the first release needed</h2>
            <p>
              I began by looking at how STARTER clients already communicated
              with their guests: what they published in banners and information
              pages, which themes recurred, and where the existing formats fell
              short.
            </p>
          </section>

          <CaseMedia
            width="wide"
            assetKey={media("02-client-examples")}
            alt="Examples of client communication"
          />

          <div className="case-text">
            <p>
              I then reviewed 23 apps and several websites. I compared entry
              points, phone and desktop behaviour, in-story actions, and aspect
              ratios.
            </p>
          </div>

          <CaseMedia
            width="full"
            assetKey={media("03-market-research")}
            alt="Research into Stories across apps and websites"
          />

          <div className="case-text">
            <p>The research set four requirements for the first release:</p>
            <ol>
              <li>
                A fixed 9:16 format rather than stretching content to fill the
                screen, so one asset works predictably across devices.
              </li>
              <li>An action link on every slide.</li>
              <li>The ability to share a Story.</li>
              <li>
                Reactions or comments could be useful later, but were not
                essential to launch.
              </li>
            </ol>
          </div>

          <CaseMediaPair
            width="wide"
            items={[
              {
                assetKey: media("04-proportions"),
                alt: "Story aspect-ratio comparison",
              },
              {
                assetKey: media("04-in-product"),
                alt: "A Story inside a product flow",
              },
            ]}
          />

          <div className="case-text">
            <p>
              The important reference was not only social media. Inside a
              product, a Story can remain useful beyond a day and serve a
              concrete restaurant need: explaining an offer, introducing a
              menu, or inviting guests to an event.
            </p>
          </div>

          <CaseMedia
            width="full"
            assetKey={media("05-use-cases")}
            alt="A classification of Stories by purpose"
          />

          <div className="case-text">
            <p>
              Based on client requests and the research, we kept three
              hypotheses to test:
            </p>
            <ol>
              <li>
                Restaurants could communicate more often and more clearly
                without investing in a new content format.
              </li>
              <li>
                A familiar format could lower the barrier to publishing and
                help restaurants explain promotions, events, and launches.
              </li>
              <li>
                Richer communication could help guests decide whether to place
                a first order.
              </li>
            </ol>
          </div>

          <section className="case-text">
            <h2>Making publishing clear for restaurant marketers</h2>
            <p>
              Together with the product manager, I interviewed the lead marketer
              and operations manager of a restaurant group with three locations
              and four brands. They were active users of banners and information
              pages, so they could clearly describe the limits of the existing
              tools.
            </p>
          </section>

          <CaseMedia
            width="wide"
            assetKey={media("06-interview")}
            alt="Interview materials from the restaurant group"
          />

          <div className="case-text">
            <p>The interview showed that:</p>
            <ul>
              <li>
                Maintaining expiring content across several brands would be too
                demanding.
              </li>
              <li>
                Existing communication tools were not flexible enough, and
                pop-ups did not always work predictably.
              </li>
              <li>
                Marketers needed analytics to understand content performance.
              </li>
              <li>
                The client was concerned about website and app performance.
              </li>
              <li>
                When a marketer starts building a campaign, its copy and core
                assets are normally already available.
              </li>
            </ul>
            <p>
              After the interview, I mapped the marketer’s journey from idea to
              publication. It informed the admin-panel structure and separated
              what was essential to launch from later improvements.
            </p>
          </div>

          <CaseMedia
            width="full"
            assetKey={media("07-user-journey")}
            alt="Journey from creating to publishing a Story"
          />

          <section className="case-text">
            <h2>Integrating Stories into the guest experience</h2>
            <p>
              The home screen already contained three banner types: banners
              could open a modal, an information page, or any external link.
              Stories needed to fit this established pattern while remaining
              recognisable as a sequence of screens.
            </p>
            <p>
              We explored several markers. An inner border covered content, and
              labels added noise. An outer border was the quietest option: it
              identifies a banner with Stories without changing the creative
              itself. Standard banners remain unmarked.
            </p>
          </section>

          <CaseMedia
            width="wide"
            assetKey={media("08-banner-directions")}
            alt="Exploring the Stories banner marker"
          />

          <div className="case-text">
            <p>
              We tested the marker across every banner type and a range of
              client assets.
            </p>
          </div>

          <CaseMedia
            width="wide"
            assetKey={media("09-banner-examples")}
            alt="Testing the marker on different banners"
          />

          <div className="case-text">
            <p>
              We also adapted the viewer for desktop and mobile web. On desktop,
              the action is part of the slide, so it stays associated with its
              specific content while a guest progresses through the sequence.
              On mobile, the same placement works around the browser chrome.
            </p>
          </div>

          <CaseMedia
            width="wide"
            assetKey={media("10-web-versions")}
            alt="Stories on desktop and mobile"
          />

          <section className="case-text">
            <h2>An editor that previews the published result</h2>
            <p>
              For the admin experience, I studied Frisbuy and 2GIS. Both
              addressed a similar challenge: letting businesses assemble a
              sequence of assets without turning the product into a complex
              design tool.
            </p>
          </section>

          <CaseMedia
            width="wide"
            assetKey={media("11-admin-references")}
            alt="Frisbuy and 2GIS admin interfaces"
          />

          <div className="case-text">
            <p>
              The first version of our editor was too sprawling. Settings,
              slide ordering, and the preview competed for attention.
            </p>
          </div>

          <CaseMedia
            width="wide"
            assetKey={media("12-admin-first-version")}
            alt="The first editor version"
          />

          <div className="case-text">
            <p>
              We did not need to reproduce a social-media visual editor.
              Marketers upload prepared images and video, then control order,
              the action link, and publication. I therefore organised the
              chosen direction around the active slide: slides form a
              horizontal sequence, with settings next to the selected item.
            </p>
            <p>
              The editor mirrors the result a guest will see. A marketer can
              immediately check the sequence and ensure no interface element
              covers important imagery.
            </p>
          </div>

          <CaseMedia
            width="wide"
            assetKey={media("13-admin-directions")}
            alt="Exploring the editor layout"
          />

          <div className="case-text">
            <p>
              Settings sit around the active slide, while the larger horizontal
              sequence makes the final structure visible as it is assembled.
            </p>
          </div>

          <section className="case-text">
            <h2>Managing published Stories</h2>
            <p>
              For published Stories, we used a table. It shows live and draft
              content, the archive, core indicators, placement, and creation
              date; marketers can copy a link or archive a Story from the same
              place.
            </p>
          </section>

          <CaseMedia
            width="wide"
            assetKey={media("14-admin-list")}
            alt="Stories list and analytics in the admin panel"
          />

          <div className="case-text">
            <p>
              We designed the creation, publishing, and management states, then
              handed the solution over for development. People with very
              different levels of experience use the admin panel, so the flow
              needed to work without separate training.
            </p>
          </div>

          <CaseMedia
            width="wide"
            assetKey={media("15-admin-final")}
            alt="Final admin-panel screens"
          />

          <section className="case-text">
            <h2>What the launch showed</h2>
            <p>
              More than half of STARTER’s top 30 clients launched their own
              Stories in the first week. Early examples included Fresa’s and
              DUO.
            </p>
            <p>
              During the first month, support received no questions about how
              to use the feature. This was an early signal that restaurants
              could create and publish the new content format independently.
            </p>
            <p>
              The initial release tested feature adoption and interface clarity.
              Its effect on orders, revenue, or loyalty would have required a
              longer observation window and sufficient data, so I do not claim
              those outcomes here.
            </p>
          </section>

          <CaseVideo
            width="wide"
            src="/media/videos/starter-stories/16-web-demo.mp4"
            posterAssetKey={media("16-video-poster")}
            title="A completed Story in web view"
            locale="en"
          />
        </article>
      </main>
    </CaseAccessBoundary>
  );
}
