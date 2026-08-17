"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { getLanguageSwitchState } from "@/data/language-switch";
import { getCase } from "@/data/cases";
import { getUiText } from "@/data/ui-text";
import { NavigationShell } from "./Navigation";
import { SiteFooter } from "./SiteFooter";
import {
  CaseCoverMotionProvider,
  CaseMotionRoutes,
} from "./CaseCoverMotion";
import { trackEvent } from "./analytics";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const footerContentRef = useRef<HTMLDivElement>(null);
  const locale = getLanguageSwitchState(pathname).currentLocale;
  const text = getUiText(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const slug = pathname.split("/").filter(Boolean).at(-1);
    if (!slug || !getCase(slug)) return;

    trackEvent("case_viewed", { case_slug: slug, locale });
    const thresholds = [25, 50, 75, 90];
    const reached = new Set<number>();
    const reportReadDepth = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0) return;
      const depth = Math.round((window.scrollY / scrollableHeight) * 100);
      for (const threshold of thresholds) {
        if (depth >= threshold && !reached.has(threshold)) {
          reached.add(threshold);
          trackEvent("case_read_depth", { case_slug: slug, locale, read_depth: threshold });
        }
      }
    };

    window.addEventListener("scroll", reportReadDepth, { passive: true });
    reportReadDepth();
    return () => window.removeEventListener("scroll", reportReadDepth);
  }, [locale, pathname]);

  useEffect(() => {
    let frame = 0;

    function updateMobileNavigationOffset() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = document.documentElement;
        const navigation = document.querySelector<HTMLElement>(".nav");
        const footerContent = footerContentRef.current;

        if (window.innerWidth > 600 || !navigation || !footerContent) {
          root.style.removeProperty("--mobile-nav-footer-offset");
          return;
        }

        const footerTop = footerContent.getBoundingClientRect().top;
        const navigationHeight = navigation.getBoundingClientRect().height;
        const maxOffset = Math.max(
          0,
          window.innerHeight - navigationHeight - 32,
        );
        const offset = Math.min(
          maxOffset,
          Math.max(0, window.innerHeight - footerTop),
        );

        root.style.setProperty(
          "--mobile-nav-footer-offset",
          `${offset}px`,
        );
      });
    }

    updateMobileNavigationOffset();
    window.addEventListener("scroll", updateMobileNavigationOffset, {
      passive: true,
    });
    window.addEventListener("resize", updateMobileNavigationOffset);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateMobileNavigationOffset);
      window.removeEventListener("resize", updateMobileNavigationOffset);
      document.documentElement.style.removeProperty(
        "--mobile-nav-footer-offset",
      );
    };
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        {text.skipToContent}
      </a>
      <CaseCoverMotionProvider>
        <NavigationShell>
          <CaseMotionRoutes>{children}</CaseMotionRoutes>
        </NavigationShell>
      </CaseCoverMotionProvider>
      <SiteFooter contentRef={footerContentRef} />
    </>
  );
}
