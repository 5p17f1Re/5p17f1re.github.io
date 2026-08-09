import type { SiteLocale } from "./locales";

export type AboutContent = {
  name: string;
  paragraphs: string[];
};

const aboutByLocale: Record<SiteLocale, AboutContent> = {
  en: {
    name: "Seva Kudryavtsev",
    paragraphs: [
      "Designer who combines the quality of consumer interfaces with the systems thinking behind complex products.",
      "I design digital products from early concepts to launch, shaping how they look, behave, and communicate.",
      "Currently I design products for restaurants at Yandex Eats.",
      "Before that, I led product design at Starter. Earlier, I designed and launched digital products for P·Y·E, AVGVST, Samokat and Auto.ru.",
    ],
  },
  ru: {
    name: "Сева Кудрявцев",
    paragraphs: [
      "Дизайнер, который сочетает качество потребительских интерфейсов с системным мышлением, необходимым для сложных продуктов.",
      "Веду продукт от идеи до запуска: определяю, как он выглядит, работает и ощущается.",
      "Сейчас проектирую продукты для ресторанов в Яндекс Еде.",
      "До этого руководил продуктовым дизайном в Starter. Ранее проектировал и запускал цифровые продукты для P·Y·E, Avgvst, Самоката и Auto.ru.",
    ],
  },
};

export function getAbout(locale: SiteLocale) {
  return aboutByLocale[locale];
}
