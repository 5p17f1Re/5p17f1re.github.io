"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getLanguageSwitchState } from "@/data/language-switch";
import { getCase } from "@/data/cases";
import { getUiText } from "@/data/ui-text";
import { NavigationShell } from "./Navigation";
import { trackEvent } from "./analytics";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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

  return (
    <>
      <a className="skip-link" href="#main-content">
        {text.skipToContent}
      </a>
      <NavigationShell>{children}</NavigationShell>
    </>
  );
}
