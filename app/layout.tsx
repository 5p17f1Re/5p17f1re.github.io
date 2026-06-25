import type { Metadata } from "next";
import "../styles.css";

export const metadata: Metadata = {
  title: "Seva Kudryavtsev — Product Designer",
  description:
    "Product Designer who brings consumer-grade experience to complex products.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.portfolioView=localStorage.getItem("portfolio-view")==="snakeview"?"snakeview":"birdview"}catch(e){document.documentElement.dataset.portfolioView="birdview"}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
