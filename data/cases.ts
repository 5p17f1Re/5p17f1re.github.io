import { getLocalizedPath, type SiteLocale } from "./locales";

export type CaseDefinition = {
  slug: string;
  transitionId: string;
  access: { scope: "public" };
  availableLocales: readonly SiteLocale[];
  legacyLocale?: SiteLocale;
};

// A legacy locale describes a currently published TSX page. It is deliberately
// separate from availableLocales: once its approved MDX snapshot is published,
// the case moves to the localized routes without changing its slug.
export const cases: readonly CaseDefinition[] = [
  {
    slug: "yandex-eats-smartreserve",
    transitionId: "yandex-eats-smartreserve",
    access: { scope: "public" },
    availableLocales: ["en", "ru"],
  },
  {
    slug: "starter-foodhalls",
    transitionId: "starter-foodhalls",
    access: { scope: "public" },
    availableLocales: ["en", "ru"],
  },
  {
    slug: "starter-stories",
    transitionId: "starter-stories",
    access: { scope: "public" },
    availableLocales: [],
    legacyLocale: "ru",
  },
];

const casesBySlug = new Map(
  cases.map((caseDefinition) => [caseDefinition.slug, caseDefinition]),
);

export function getCase(slug: string) {
  return casesBySlug.get(slug);
}

export function getCasePath({ slug, locale }: { slug: string; locale: SiteLocale }) {
  const caseDefinition = getCase(slug);

  if (caseDefinition?.legacyLocale === locale) {
    return getLocalizedPath({ locale: "en", slug });
  }

  return getLocalizedPath({ locale, slug });
}
