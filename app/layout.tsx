import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { SiteShell } from "@/components/SiteShell";
import { YandexMetrica } from "@/components/YandexMetrica";
import "../styles.css";

const googleAnalyticsId = "G-TLZ88JYZQZ";
const yandexMetricaId = 110991707;

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
        <Script id="portfolio-view" strategy="beforeInteractive">
          {`try{document.documentElement.dataset.portfolioView=localStorage.getItem("portfolio-view")==="snakeview"?"snakeview":"birdview"}catch(e){document.documentElement.dataset.portfolioView="birdview"}`}
        </Script>
        <SiteShell>{children}</SiteShell>
        <YandexMetrica />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
var analyticsDebugKey = "portfolio-analytics-debug";
var analyticsDebugMode = false;
try {
  var analyticsDebugValue = new URLSearchParams(window.location.search).get("analytics_debug");
  if (analyticsDebugValue === "1") sessionStorage.setItem(analyticsDebugKey, "1");
  if (analyticsDebugValue === "0") sessionStorage.removeItem(analyticsDebugKey);
  analyticsDebugMode = sessionStorage.getItem(analyticsDebugKey) === "1";
} catch (error) {}
gtag("js", new Date());
gtag("config", "${googleAnalyticsId}", analyticsDebugMode ? { debug_mode: true } : undefined);`}
        </Script>
        <Script id="yandex-metrica" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){
m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=Date.now();
for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return}}
k=e.createElement(t);a=e.getElementsByTagName(t)[0];k.async=1;k.src=r;a.parentNode.insertBefore(k,a)
})(window,document,"script","https://mc.yandex.ru/metrika/tag.js?id=${yandexMetricaId}","ym");
ym(${yandexMetricaId},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true,defer:true});
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
