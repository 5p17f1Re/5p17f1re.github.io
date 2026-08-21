"use client";

import { usePathname } from "next/navigation";
import type { RefObject } from "react";
import { contactDetails } from "@/data/contacts";
import { getLanguageSwitchState } from "@/data/language-switch";
import { getLocalizedPath, type SiteLocale } from "@/data/locales";
import { getPublishedPhotos } from "@/data/photos";
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

export function SiteFooter({
  contentRef,
}: {
  contentRef?: RefObject<HTMLDivElement | null>;
}) {
  const pathname = usePathname();
  const languageSwitch = getLanguageSwitchState(pathname);
  const locale = languageSwitch.currentLocale;
  const text = getUiText(locale);
  const updatedAt = formatSiteUpdatedAt(locale);
  const version = process.env.NEXT_PUBLIC_SITE_VERSION ?? "1.1";
  const commitCount = process.env.NEXT_PUBLIC_SITE_COMMIT_COUNT ?? "0";
  const isHome = pathname === "/" || pathname === "/ru" || pathname === "/ru/";
  const hasPublishedPhotos = getPublishedPhotos().length > 0;
  return (
    <footer className={`site-footer${isHome ? "" : " site-footer--dark"}`}>
      <div ref={contentRef} className="site-footer__content">
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
        {languageSwitch.targetPath ? (
          <p className="site-footer__meta site-footer__locale">
            <a
              className="site-footer__link site-footer__locale-link"
              href={languageSwitch.targetPath}
              lang={languageSwitch.targetLocale}
              aria-label={text.footerLanguageLinkAriaLabel}
            >
              {text.footerLanguageLinkLabel}
            </a>
          </p>
        ) : null}
        {hasPublishedPhotos ? (
          <p className="site-footer__meta site-footer__photos">
            <a
              className="site-footer__link"
              href={getLocalizedPath({ locale, slug: "photos" })}
              aria-label={text.photosTitle}
            >
              {text.photosTitle}
            </a>
          </p>
        ) : null}
        <p className="site-footer__meta">
          {text.footerLastUpdated} {updatedAt}
        </p>
        <p className="site-footer__meta">
          {text.footerVersion} {version}{"\u00a0\u00a0"}
          <a
            className="site-footer__link site-footer__repository-link"
            href="https://github.com/5p17f1Re/5p17f1re.github.io"
            target="_blank"
            rel="noreferrer"
            onClick={() => trackOutboundLink("github", "site_footer")}
          >
            {commitCount} commits
          </a>
        </p>
      </div>
    </footer>
  );
}
