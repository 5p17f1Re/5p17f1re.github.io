import type { Metadata } from "next";
import { CaseAccessBoundary } from "@/components/CaseAccessBoundary";
import { CaseMedia } from "@/components/CaseMedia";
import { CaseVideo } from "@/components/CaseVideo";

const mediaRoot = "starter-foodhalls";
const media = (name: string) => `${mediaRoot}/${name}`;
const title = "STARTER for Food Halls";
const description =
  "Designing a multi-vendor ordering flow for a restaurant platform.";
const cover = "/media/images/starter-foodhalls/01-cover-1920.webp";

export const metadata: Metadata = {
  title: `${title} — Seva Kudryavtsev`,
  description,
  alternates: {
    canonical: "/starter-foodhalls/",
    languages: {
      en: "/starter-foodhalls/",
      ru: "/ru/starter-foodhalls/",
      "x-default": "/starter-foodhalls/",
    },
  },
  openGraph: {
    type: "article",
    locale: "en_US",
    url: "/starter-foodhalls/",
    title,
    description,
    images: [
      {
        url: cover,
        width: 1920,
        height: 1080,
        alt: "A multi-vendor order in a food hall app",
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

export default function StarterFoodhallsPage() {
  return (
    <CaseAccessBoundary id="starter-foodhalls" scope="public">
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
          transitionId="starter-foodhalls"
        />

        <article className="case-content">
          <section className="case-text case-text--intro">
            <h2>Designing a multi-vendor ordering flow for a restaurant platform</h2>
            <p>
              STARTER is a foodtech platform for restaurants and restaurant
              groups. It combines customer-facing apps and websites, a loyalty
              programme, order management, and administrative tools.
            </p>
            <p>
              In 2024, a large food hall in St Petersburg approached us to
              launch its own app. Customers needed to order food from several
              vendors at once. For STARTER, the project was an opportunity to
              adapt an existing restaurant platform to a new business model.
            </p>
            <p>
              As Lead Product Designer, I was responsible for the core
              multi-vendor ordering flow: the shared basket, order page, and
              collection experience. My task was to keep the order simple for
              customers even though the platform split it into several
              sub-orders with different statuses and collection options.
            </p>
          </section>

          <section className="case-text">
            <h2>One order, several operational flows</h2>
            <p>
              In a typical restaurant app, a customer chooses items from one
              menu and receives one order. A food hall is different: items
              belong to different vendors, each vendor has its own menu and
              point-of-sale integration, and one customer order becomes several
              sub-orders inside the platform.
            </p>
            <p>
              For customers, the experience still needed to feel unified:
              choose items from different menus, pay once, and understand when
              and where to collect each part of the order.
            </p>
            <p>
              The operational model worked differently. Each vendor needed to
              receive only its own items, while the food hall operator needed
              to see the full order and track each sub-order. For delivery and
              collection, food hall staff had to assemble the sub-orders before
              handover.
            </p>
          </section>

          <CaseMedia
            width="full"
            assetKey={media("02-scenario-map")}
            alt="A scenario map for customers, vendor staff, and food hall operators"
          />

          <div className="case-text">
            <p>
              Product managers and designers researched the client’s processes
              before the design stage and mapped scenarios for customers, vendor
              staff, and food hall operators. The Product Director defined the
              MVP scope. I organised the design work within that scope and was
              responsible for keeping the solution coherent.
            </p>
            <p>
              Three designers worked on the project in parallel. One designed
              the home page and catalogue; another worked on administrative
              tools; I focused on the basket, order page, and collection flows.
              I also art-directed the remaining parts of the product.
            </p>
          </div>

          <CaseMedia
            width="wide"
            assetKey={media("03-storefront-directions")}
            alt="Exploration of a compact food hall storefront"
          />

          <CaseMedia
            width="wide"
            assetKey={media("04-foodhall-home")}
            alt="The food hall home page on the website and in the mobile app"
          />

          <section className="case-text">
            <h2>One basket across several vendors</h2>
            <p>
              The basket already existed in the product. I needed to define how
              it would work when items came from different vendors and became
              separate sub-orders after payment.
            </p>
            <p>
              I kept a shared basket and a single payment so that the platform’s
              internal complexity would not become the customer’s problem. In
              the basket, I grouped items under compact vendor headings. We
              considered adding vendor logos next to the headings, but removed
              them: food photography already separated the groups, while
              additional marks created visual noise.
            </p>
            <p>
              The vendor page kept STARTER’s familiar menu structure. We added
              the vendor name, logo, and a short description to preserve
              context. For eat-in orders, customers could also open the food
              hall map after choosing their items.
            </p>
          </section>

          <CaseMedia
            width="wide"
            assetKey={media("05-corner-cart")}
            alt="A vendor page and shared basket in the mobile app"
          />

          <section className="case-text">
            <h2>Collection depended on context</h2>
            <p>
              The order page was the most complex part of the experience. One
              interface had to explain several scenarios:
            </p>
            <ul>
              <li>one or several vendors;</li>
              <li>delivery or collection;</li>
              <li>collecting the full order or separate parts;</li>
              <li>eat-in orders where customers collected food themselves.</li>
            </ul>
            <p>
              For delivery and collection, food hall staff assembled the
              sub-orders, so the customer experience stayed close to a standard
              restaurant order. Eat-in worked differently. Each vendor prepared
              its own part, and customers needed to understand what was ready,
              where to go, and what was still being prepared.
            </p>
            <p>
              When the team began to fall behind schedule, I joined another
              designer to explore order-page options, discuss constraints with
              product managers, and consolidate the work into one flow.
            </p>
          </section>

          <CaseMedia
            width="wide"
            assetKey={media("06-order-directions")}
            alt="Exploration of the eat-in collection order page"
          />

          <div className="case-text">
            <p>For each sub-order, we showed:</p>
            <ul>
              <li>food photos to help customers recognise their order;</li>
              <li>the vendor name and logo to show where to collect it;</li>
              <li>a status to explain whether it was ready;</li>
              <li>directions to the vendor;</li>
              <li>
                a collection instruction that brought the next action to the
                top.
              </li>
            </ul>
            <p>
              The resulting interface treated the purchase as one order while
              making each vendor’s status visible. Customers saw a clear plan:
              what was ready, what to wait for, and where to go next.
            </p>
          </div>

          <CaseMedia
            width="full"
            assetKey={media("07-order-flow")}
            alt="The final multi-vendor eat-in collection flow"
          />

          <section className="case-text">
            <h2>Six notifications instead of ten</h2>
            <p>
              The previous notification model sent an update for every status
              change in every order. For an order from three vendors, that meant
              ten notifications. The phone reflected the platform’s internal
              mechanics instead of helping the customer.
            </p>
            <p>
              I redesigned the notification rules and copy around meaningful
              customer moments. The same scenario required six messages rather
              than ten. The messages focused on moments when customers needed
              to pay attention or take action, not every technical transition.
            </p>
          </section>

          <CaseMedia
            width="wide"
            assetKey={media("08-notification-rules")}
            alt="Notification rules and copy for a multi-vendor order"
          />

          <section className="case-text">
            <h2>One model across customer and operational interfaces</h2>
            <p>
              In parallel, two designers adapted the admin panel and
              order-management system. Vendors needed to see only their own
              items, while food hall operators needed the complete order and the
              status of each sub-order.
            </p>
            <p>
              I art-directed the administrative work, checked the underlying
              logic, and edited interface copy. This kept employee actions and
              order statuses aligned with what customers saw.
            </p>
          </section>

          <CaseMedia
            width="wide"
            assetKey={media("09-admin-settings")}
            alt="Food hall and vendor settings in the admin panel"
          />

          <CaseMedia
            width="wide"
            assetKey={media("10-order-management")}
            alt="A complete order and its sub-orders in the order-management system"
          />

          <section className="case-text">
            <h2>Outcome</h2>
            <p>
              Within six weeks, the team released a platform solution for food
              halls and restaurant groups. It supported one basket across
              several menus and split the order between vendors, their
              point-of-sale systems, and operational tools.
            </p>
            <p>
              After release, the sales team had a finished product to present to
              prospective clients.
            </p>
          </section>

          <CaseVideo
            width="wide"
            src="/media/videos/starter-foodhalls/12-demo.mp4"
            posterAssetKey={media("12-video-poster")}
            title="Demonstration of the released food hall solution"
            hasAudio
            locale="en"
          />

          <section className="case-text">
            <h2>What I learned</h2>
            <p>
              The challenge was not a single screen. It was coordinating several
              systems and roles: an order had to remain unified for the customer,
              split for vendors, and come back together for collection or
              delivery.
            </p>
            <p>
              The key design decision was to preserve a simple customer model
              over a complex operational structure: one basket, one payment, and
              a clear collection flow, even when the platform worked with
              several menus, sub-orders, and point-of-sale integrations.
            </p>
          </section>
        </article>
      </main>
    </CaseAccessBoundary>
  );
}
