"use client";

import { usePathname } from "next/navigation";
import { contactDetails } from "@/data/contacts";
import { getLanguageSwitchState } from "@/data/language-switch";
import type { SiteLocale } from "@/data/locales";
import { getUiText } from "@/data/ui-text";
import { trackContactIntent, trackOutboundLink } from "./analytics";

function formatSiteUpdatedAt(locale: SiteLocale) {
  const source = process.env.NEXT_PUBLIC_SITE_UPDATED_AT ?? "2026-07-23";
  const date = new Date(`${source}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    year: "numeric",
    month: locale === "ru" ? "long" : "short",
    day: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return locale === "ru"
    ? `${value("day")} ${value("month")} ${value("year")}`
    : `${value("month")} ${value("day")} ${value("year")}`;
}

export function SiteFooter() {
  const pathname = usePathname();
  const locale = getLanguageSwitchState(pathname).currentLocale;
  const text = getUiText(locale);
  const updatedAt = formatSiteUpdatedAt(locale);
  const version = process.env.NEXT_PUBLIC_SITE_VERSION ?? "1.1";
  const isHome = pathname === "/" || pathname === "/ru" || pathname === "/ru/";

  return (
    <footer className={`site-footer${isHome ? "" : " site-footer--dark"}`}>
      <div className="site-footer__content">
        <p className="site-footer__contact">
          {text.footerContactBeforeTelegram}{"\u00a0"}
          <a
            className="site-footer__link"
            href={contactDetails.telegramUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              trackOutboundLink("telegram", "site_footer");
              trackContactIntent("telegram", "site_footer");
            }}
          >
            Telegram
          </a>
          {"\u00a0"}
          {text.footerContactBetweenLinks}{"\u00a0"}
          <a
            className="site-footer__link"
            href={`mailto:${contactDetails.email}`}
            onClick={() => trackContactIntent("email", "site_footer")}
          >
            email
          </a>
        </p>
        <p className="site-footer__meta">
          {text.footerLastUpdated} {updatedAt}
        </p>
        <p className="site-footer__meta">
          {text.footerVersion} {version}
        </p>
      </div>
    </footer>
  );
}
