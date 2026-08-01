import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { SiteShell } from "@/components/SiteShell";
import { YandexMetrica } from "@/components/YandexMetrica";
import { SquircleNoScript } from "@/components/Squircle";
import "../styles.css";

const googleAnalyticsId = "G-TLZ88JYZQZ";
const yandexMetricaId = 110991707;
const shouldLoadGoogleAnalytics = process.env.NODE_ENV === "production";

const inter = localFont({
  src: [
    { path: "./fonts/inter-variable.woff2", weight: "500 700" },
  ],
  variable: "--font-inter",
  display: "swap",
});

const interTight = localFont({
  src: [
    { path: "./fonts/inter-tight-variable.woff2", weight: "500 700" },
  ],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sevakudryavtsev.com"),
  title: "Seva Kudryavtsev",
  description:
    "Designer who combines the quality of consumer interfaces with the systems thinking behind complex products.",
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
      "Designer who combines the quality of consumer interfaces with the systems thinking behind complex products.",
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
      "Designer who combines the quality of consumer interfaces with the systems thinking behind complex products.",
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
        <SquircleNoScript />
        <Script id="portfolio-view" strategy="beforeInteractive">
          {`try{document.documentElement.dataset.portfolioView=localStorage.getItem("portfolio-view")==="birdview"?"birdview":"snakeview"}catch(e){document.documentElement.dataset.portfolioView="snakeview"}`}
        </Script>
        <SiteShell>{children}</SiteShell>
        <YandexMetrica />
        {shouldLoadGoogleAnalytics ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
              strategy="lazyOnload"
            />
            <Script id="google-analytics" strategy="lazyOnload">
              {`window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
var analyticsDebugKey = "portfolio-analytics-debug";
var analyticsDebugMode = false;
try {
  var analyticsDebugValue = new URLSearchParams(window.location.search).get("analytics_debug");
  if (analyticsDebugValue === "1") sessionStorage.setItem(analyticsDebugKey, "1");
  if (analyticsDebugValue === "0") sessionStorage.removeItem(analyticsDebugKey);
  analyticsDebugMode = sessionStorage.getItem(analyticsDebugKey) === "1";
} catch (error) {}
window.gtag("js", new Date());
if (analyticsDebugMode) {
  window.gtag("config", "${googleAnalyticsId}", { debug_mode: true });
} else {
  window.gtag("config", "${googleAnalyticsId}");
}`}
            </Script>
          </>
        ) : null}
        <Script id="yandex-metrica" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){
m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return}}
k=e.createElement(t);a=e.getElementsByTagName(t)[0];k.async=1;k.src=r;a.parentNode.insertBefore(k,a)
})(window,document,"script","https://mc.yandex.ru/metrika/tag.js?id=${yandexMetricaId}","ym");
ym(${yandexMetricaId},"init",{ssr:true,webvisor:true,trackHash:true,clickmap:true,referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true,defer:true});
window.dispatchEvent(new Event("yandex-metrica-ready"));`}
        </Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element -- Yandex Metrica fallback for visitors without JavaScript. */}
          <img
            src={`https://mc.yandex.ru/watch/${yandexMetricaId}`}
            alt=""
            style={{ position: "absolute", left: "-9999px" }}
          />
        </noscript>
      </body>
    </html>
  );
}
