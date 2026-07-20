export const siteLocales = ["en", "ru"] as const;

export type SiteLocale = (typeof siteLocales)[number];

export const primaryLocale: SiteLocale = "en";

// The Russian homepage becomes publishable once its approved card copy exists.
export const availableHomeLocales: readonly SiteLocale[] = ["en", "ru"];

export function isSiteLocale(value: string): value is SiteLocale {
  return siteLocales.includes(value as SiteLocale);
}

export function getLocalizedPath({
  locale,
  slug,
}: {
  locale: SiteLocale;
  slug?: string;
}) {
  const path = slug ? `/${slug}/` : "/";

  return locale === primaryLocale ? path : `/ru${path}`;
}
