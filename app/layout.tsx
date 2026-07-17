import type { Metadata } from "next";
import localFont from "next/font/local";
import { NavigationShell } from "@/components/Navigation";
import "../styles.css";

const inter = localFont({
  src: "./fonts/inter-medium.ttf",
  variable: "--font-inter",
  weight: "500",
  display: "swap",
});

const interTight = localFont({
  src: "./fonts/inter-tight-medium.ttf",
  variable: "--font-inter-tight",
  weight: "500",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://5p17f1re.github.io"),
  title: "Seva Kudryavtsev — Product Designer",
  description:
    "Product Designer who brings consumer-grade experience to complex products.",
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
        <NavigationShell>{children}</NavigationShell>
      </body>
    </html>
  );
}
