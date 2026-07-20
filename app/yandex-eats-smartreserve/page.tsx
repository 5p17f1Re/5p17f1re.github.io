import type { Metadata } from "next";
import { CaseAccessBoundary } from "@/components/CaseAccessBoundary";
import { CaseMedia, CaseMediaPair } from "@/components/CaseMedia";

const mediaRoot = "yandex-eats-smartreserve";
const media = (name: string) => `${mediaRoot}/${name}`;
const title = "SmartReserve Analytics for Yandex Eats";
const description =
  "Launching the first analytics view and building the foundation for a restaurant analytics platform.";
const cover =
  "/media/images/yandex-eats-smartreserve/01-cover-1600.webp";

export const metadata: Metadata = {
  title: `${title} — Seva Kudryavtsev`,
  description,
  alternates: {
    canonical: "/yandex-eats-smartreserve/",
    languages: {
      en: "/yandex-eats-smartreserve/",
      ru: "/ru/yandex-eats-smartreserve/",
      "x-default": "/yandex-eats-smartreserve/",
    },
  },
  openGraph: {
    type: "article",
    locale: "en_US",
    url: "/yandex-eats-smartreserve/",
    title,
    description,
    images: [
      {
        url: cover,
        width: 1600,
        height: 1000,
        alt: "Restaurant analytics in SmartReserve",
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

export default function SmartReservePage() {
  return (
    <CaseAccessBoundary id="yandex-eats-smartreserve" scope="public">
      <main
        id="main-content"
        className="case-page-shell case-page-shell--entering"
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
          transitionId="yandex-eats-smartreserve"
        />

        <article className="case-content">
          <section className="case-text case-text--intro">
            <h2>
              Launching the first analytics view and building the foundation
              for a platform
            </h2>
            <p>
              SmartReserve is a Yandex Eats product for managing restaurant
              reservations. It was built after the acquisition of LeClick and
              has two parts:
            </p>
          </section>

          <CaseMediaPair
            width="inline"
            items={[
              {
                assetKey: media("02-platform-hostess"),
                alt: "Diagram of SmartReserve for hostesses",
                caption: (
                  <>
                    <strong>SmartReserve for hostesses</strong>
                    <span>seating guests and managing reservations</span>
                  </>
                ),
              },
              {
                assetKey: media("02-platform-manager"),
                alt: "Diagram of the SmartReserve admin panel",
                caption: (
                  <>
                    <strong>Admin panel</strong>
                    <span>schedules, guests, reviews, and campaigns</span>
                  </>
                ),
              },
            ]}
          />

          <div className="case-text">
            <p>I worked on the admin panel.</p>
          </div>

          <section className="case-text">
            <h2>The problem</h2>
            <p>
              Yandex Eats had acquired a working reservation service, but its
              administrative side was not ready to scale. Restaurants still
              relied on support or account managers for many changes:
              configuration, access rights, and analytics.
            </p>
            <p>
              We needed to launch the first version of the admin panel quickly
              — a product restaurant partners could use without a manager’s
              help. The product already included Guests and Reservations, but
              it had no clear home view.
            </p>
          </section>

          <CaseMedia
            width="wide"
            assetKey={media("03-version-navigation")}
            alt="Information architecture of the first admin panel release"
          />

          <section className="case-text">
            <h2>My role</h2>
            <p>
              I contributed to the launch of the SmartReserve admin panel and
              designed key areas including analytics, guest segments, tags,
              campaigns, reviews, venue settings, authentication, and
              onboarding.
            </p>
            <p>
              This case focuses on restaurant analytics. The goal was to make
              it a clear entry point into the panel and help partners make
              decisions using their data.
            </p>
          </section>

          <section className="case-text">
            <h2>Starting with the questions the product needed to answer</h2>
            <p>
              The product manager brought a map of future directions, developed
              with their lead. They then presented a table of metrics to the
              team, grouped into reservation analytics, guest analytics, and
              service-quality metrics. Once the team aligned on it, we moved
              into implementation.
            </p>
          </section>

          <CaseMedia
            width="inline"
            assetKey={media("04-research-board")}
            alt="Map of questions restaurant managers needed analytics to answer"
          />

          <div className="case-text">
            <p>
              We used these questions to define the metrics and organise them
              into three areas.
            </p>
          </div>

          <CaseMedia
            width="wide"
            assetKey={media("05-metrics-map")}
            alt="Map of metrics for the future analytics platform"
          />

          <div className="case-text">
            <p>
              We planned three future areas: Dining Room Occupancy, Guest
              Profile, and Quality. Shipping all of them at once would have
              taken too long, so we started with an Overview: one page of key
              metrics that answered three questions:
            </p>
            <ul>
              <li>What is happening in my restaurant right now?</li>
              <li>Where is there a problem or a change?</li>
              <li>What should I investigate next?</li>
            </ul>
            <p>
              The first release combined high-level restaurant metrics with
              data on dining room occupancy, booking sources, guest segments,
              and tags. A helper widget highlighted issues in the top metrics
              or confirmed that everything looked normal. It was designed as
              the first step toward a more capable assistant in the future.
            </p>
          </div>

          <CaseMedia
            width="wide"
            assetKey={media("06-summary-wireframe")}
            alt="The first Overview page"
          />

          <section className="case-text">
            <h2>Making data readable</h2>
            <p>
              Most partners were not professional analysts. Adding more charts
              would not make the product more useful. Each chart had to help a
              restaurant manager notice a pattern and decide what to do next.
            </p>
            <p>
              My scope covered data visualisation, the analytics component
              system, colour, time ranges, and choosing the right chart form
              for each metric.
            </p>
          </section>

          <section className="case-text">
            <h2>Finding the right chart form</h2>
            <p>
              For each metric, I started by asking what the user needed to see:
              a trend, a comparison between categories, or an outlier.
            </p>
          </section>

          <CaseMedia
            width="wide"
            assetKey={media("07-chart-forms")}
            alt="Chart forms explored for different metrics"
          />

          <div className="case-text">
            <p>
              Once the direction was clear, we tested the charts on real data
              and defined the behaviour they needed to support. Components had
              to work with two to five values, show forecasts, and remain
              understandable for the current day.
            </p>
            <p>
              One difficult decision was how to show parts of a whole. Pie
              charts initially caused concern: some stakeholders saw them as
              imprecise and too difficult for an untrained audience. I explored
              several alternatives and argued for a pie chart in the specific
              case of two to five values. It made the whole and each share
              immediately legible, while values and trends remained visible
              without requiring hover.
            </p>
          </div>

          <CaseMedia
            width="wide"
            assetKey={media("08-chart-states")}
            alt="Chart explorations and alternatives for the pie chart"
          />

          <div className="case-text">
            <p>
              I also developed the colour system. The palette had to work in
              line and bar charts, stay calm, and preserve contrast. I tested
              adjacent colours and the ordering of segments.
            </p>
          </div>

          <CaseMedia
            width="wide"
            assetKey={media("09-color-search")}
            alt="Colour exploration for analytics charts"
          />

          <div className="case-text">
            <p>
              When a segment had no data, other colours could unexpectedly
              become neighbours, so I added one-pixel dividers between
              segments. This kept the chart readable even when the visual order
              changed.
            </p>
          </div>

          <CaseMedia
            width="inline"
            assetKey={media("10-color-system")}
            alt="Base and extended analytics colour palettes"
          />

          <div className="case-text">
            <p>
              We also explored a dining-room occupancy heatmap. It did not make
              the first release: several important partners did not see a need
              for it at that point. We postponed the idea and focused on
              familiar chart forms.
            </p>
          </div>

          <CaseMedia
            width="wide"
            assetKey={media("11-heatmap")}
            alt="Dining-room occupancy heatmap concept"
          />

          <div className="case-text">
            <p>
              The resulting approach used familiar charts, a clear hierarchy,
              restrained colour, and enough context to compare metrics.
            </p>
          </div>

          <CaseMedia
            width="wide"
            assetKey={media("12-analytics-system")}
            alt="Analytics chart system for the first Overview release"
          />

          <section className="case-text">
            <h2>Designing for time and growth</h2>
            <p>
              Restaurants work across different time horizons. A manager may
              need to assess today, compare weeks, or understand a monthly
              change. I made the time range a visible part of the interface
              rather than an option hidden in a menu. Users could switch
              between day, week, month, and a custom range, then move quickly to
              adjacent periods.
            </p>
            <p>
              For daily analytics, charts followed the restaurant’s opening
              hours and marked the current time. This made it clear which data
              had already been collected and which part was a forecast.
            </p>
          </section>

          <CaseMedia
            width="wide"
            assetKey={media("13-time-behavior")}
            alt="Time filter and daily forecast"
          />

          <section className="case-text">
            <p>
              Overview was the first analytics tab, so I designed a system
              rather than a set of cards for one screen. We tested how many bars
              and values a chart could hold before becoming noise.
            </p>
          </section>

          <CaseMedia
            width="wide"
            assetKey={media("14-graph-density")}
            alt="Chart-density tests"
          />

          <CaseMediaPair
            width="wide"
            items={[
              {
                assetKey: media("15-graph-comparison"),
                alt: "Patterns for comparing analytics values",
              },
              {
                assetKey: media("15-graph-mobile"),
                alt: "Mobile analytics chart layouts",
              },
            ]}
          />

          <div className="case-text">
            <p>
              The resulting system included full-width and half-width layouts,
              mobile versions, empty states, and rules for different data
              densities. That gave later analytics sections a consistent
              foundation instead of requiring each screen to be designed from
              scratch.
            </p>
          </div>

          <section className="case-text">
            <h2>Applying the system to Dining Room Occupancy</h2>
            <p>
              When we started working on Dining Room Occupancy, the metrics did
              not form a coherent story about how a restaurant was performing.
              We involved an analyst and structured the page into three parts:
              booking setup health, dynamics and sources, and occupancy
              structure.
            </p>
            <p>
              Even then, the first block still lacked a clear answer to one
              question: “How is my dining room occupied right now?” We added a
              pie chart that showed the dining room as a whole and the
              relationship between walk-ins, reservations, and available seats.
            </p>
            <p>
              This gave the page a clear top-level conclusion. The charts below
              could then explain why occupancy looked the way it did.
            </p>
          </section>

          <CaseMedia
            width="wide"
            assetKey={media("16-hall-load")}
            alt="Final Dining Room Occupancy analytics"
          />

          <section className="case-text">
            <h2>Outcome</h2>
            <p>
              We launched the first Overview: a clear entry point into the
              admin panel and a foundation for the next analytics sections.
            </p>
            <p>
              During the first six months of the panel’s development, the
              number of supported scenarios grew by approximately 32 times and
              the number of tracked events by approximately 43 times. These
              figures describe the growth of the admin panel as a whole, not
              the impact of Overview alone.
            </p>
            <p>
              For me, the main outcome was not a single dashboard. It was a
              system of decisions and components that could support the next
              areas of restaurant analytics.
            </p>
          </section>

          <CaseMedia
            width="wide"
            assetKey={media("17-result")}
            alt="Project team meeting restaurant partners"
          />
        </article>
      </main>
    </CaseAccessBoundary>
  );
}
