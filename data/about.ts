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
      "Дизайнер с 11-летним опытом. Соединяю системность сложных B2B-продуктов с качеством потребительских интерфейсов.",
      "Проектирую цифровые продукты от концепции до запуска, определяя, как они выглядят, работают и общаются с пользователем. Для меня важны визуальное качество, взаимодействие и характер продукта — детали, благодаря которым опыт ощущается цельным и к нему хочется возвращаться.",
      "Сейчас развиваю продукты для ресторанов в Яндекс Еде. До этого руководил продуктовым дизайном в STARTER. Ранее проектировал и запускал сайты и цифровые продукты для P·Y·E и AVGVST.",
    ],
  },
};

export function getAbout(locale: SiteLocale) {
  return aboutByLocale[locale];
}
