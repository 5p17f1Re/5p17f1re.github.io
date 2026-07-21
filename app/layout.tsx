import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { SiteShell } from "@/components/SiteShell";
import "../styles.css";

const googleAnalyticsId = "G-TLZ88JYZQZ";

const inter = localFont({
  src: [
    { path: "./fonts/inter-medium.ttf", weight: "500" },
    { path: "./fonts/inter-bold.ttf", weight: "700" },
  ],
  variable: "--font-inter",
  display: "swap",
});

const interTight = localFont({
  src: [
    { path: "./fonts/inter-tight-medium.ttf", weight: "500" },
    { path: "./fonts/inter-tight-bold.ttf", weight: "700" },
  ],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://5p17f1re.github.io"),
  title: "Seva Kudryavtsev",
  description:
    "Designer who combine the quality of consumer interfaces with the systems thinking behind complex products.",
  alternates: { canonical: "/" },
  icons: {
    icon: {
      url: "/media/images/sevakudrytavtsev-360.webp",
      type: "image/webp",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Seva Kudryavtsev",
    title: "Seva Kudryavtsev",
    description:
      "Designer who combine the quality of consumer interfaces with the systems thinking behind complex products.",
    images: [
      {
        url: "/media/images/sevakudrytavtsev-600.webp",
        width: 600,
        height: 600,
        alt: "Seva Kudryavtsev",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Seva Kudryavtsev",
    description:
      "Designer who combine the quality of consumer interfaces with the systems thinking behind complex products.",
    images: ["/media/images/sevakudrytavtsev-600.webp"],
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0F0F14",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${inter.variable} ${interTight.variable}`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.portfolioView=localStorage.getItem("portfolio-view")==="snakeview"?"snakeview":"birdview"}catch(e){document.documentElement.dataset.portfolioView="birdview"}`,
          }}
        />
        <SiteShell>{children}</SiteShell>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag("js", new Date());
gtag("config", "${googleAnalyticsId}");`}
        </Script>
      </body>
    </html>
  );
}
