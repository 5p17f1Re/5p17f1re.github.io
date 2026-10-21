import type { SiteLocale } from "./locales";

export type AboutContent = {
  name: string;
  photoCaption: string;
  photoYear: string;
  paragraphs: string[];
};

const aboutByLocale: Record<SiteLocale, AboutContent> = {
  en: {
    name: "Seva Kudryavtsev",
    photoCaption: "Photo of Seva Kudryavtsev",
    photoYear: "2026",
    paragraphs: [
      "Digital Designer — combines the quality of consumer interfaces with the systems thinking behind complex products.",
      "Currently I design products for restaurants at Yandex Eats. Before that, I led product design at Starter. Earlier, I designed and launched digital products for ecom, foodtech and bigtech.",
    ],
  },
  ru: {
    name: "Сева Кудрявцев",
    photoCaption: "Фото Севы Кудрявцева",
    photoYear: "2026",
    paragraphs: [
      "Продуктовый дизайнер — создаю сложные сервисы, сохраняя удобство потребительских продуктов.",
      "Сейчас проектирую продукты для ресторанов в Яндекс Еде. До этого руководил продуктовым дизайном в Starter. Ранее проектировал и запускал цифровые продукты для екома, фудтеха и бигтеха.",
    ],
  },
};

export function getAbout(locale: SiteLocale) {
  return aboutByLocale[locale];
}
