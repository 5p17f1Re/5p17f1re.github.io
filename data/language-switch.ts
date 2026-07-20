import { getCase } from "./cases";
import {
  availableHomeLocales,
  getLocalizedPath,
  primaryLocale,
  type SiteLocale,
} from "./locales";
import { getUiText } from "./ui-text";

type LanguageSwitchState = {
  currentLocale: SiteLocale;
  targetLocale: SiteLocale;
  targetPath?: string;
  unavailableMessage: string;
};

function getAlternativeLocale(locale: SiteLocale): SiteLocale {
  return locale === "en" ? "ru" : "en";
}

function getSlugFromPathname(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  return segments[0] === "ru" ? segments[1] : segments[0];
}

export function getLanguageSwitchState(pathname: string): LanguageSwitchState {
  const isRussianPath = pathname === "/ru" || pathname.startsWith("/ru/");
  const slug = getSlugFromPathname(pathname);
  const caseDefinition = slug ? getCase(slug) : undefined;
  const currentLocale =
    caseDefinition?.legacyLocale ?? (isRussianPath ? "ru" : primaryLocale);
  const targetLocale = getAlternativeLocale(currentLocale);
  const unavailableMessage = getUiText(currentLocale).languageUnavailable[
    targetLocale
  ];

  if (!slug && availableHomeLocales.includes(targetLocale)) {
    return {
      currentLocale,
      targetLocale,
      targetPath: getLocalizedPath({ locale: targetLocale }),
      unavailableMessage,
    };
  }

  if (caseDefinition?.availableLocales.includes(targetLocale)) {
    return {
      currentLocale,
      targetLocale,
      targetPath: getLocalizedPath({ locale: targetLocale, slug }),
      unavailableMessage,
    };
  }

  return {
    currentLocale,
    targetLocale,
    unavailableMessage,
  };
}
