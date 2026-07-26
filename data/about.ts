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
      "Before that, I led product design at STARTER. Earlier, I designed and launched digital products for P·Y·E, AVGVST, Samokat and Auto.ru.",
    ],
  },
  ru: {
    name: "Сева Кудрявцев",
    paragraphs: [
      "Диджитал-дизайнер, проектирую сложные сервисы, сохраняя удобство потребительских продуктов.",
      "Веду продукт от первой идеи до запуска: определяю, как он выглядит, работает и общается с пользователем.",
      "Сейчас проектирую продукты для ресторанов в Яндекс Еде.",
      "До этого руководил продуктовым дизайном в STARTER. Ранее проектировал и запускал цифровые продукты для P·Y·E, AVGVST, Самоката и Auto.ru.",
    ],
  },
};

export function getAbout(locale: SiteLocale) {
  return aboutByLocale[locale];
}
