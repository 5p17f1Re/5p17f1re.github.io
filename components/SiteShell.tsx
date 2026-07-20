"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getLanguageSwitchState } from "@/data/language-switch";
import { getUiText } from "@/data/ui-text";
import { NavigationShell } from "./Navigation";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = getLanguageSwitchState(pathname).currentLocale;
  const text = getUiText(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        {text.skipToContent}
      </a>
      <NavigationShell>{children}</NavigationShell>
    </>
  );
}
