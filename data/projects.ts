import type { SiteLocale } from "./locales";

type ProjectContent = {
  title: string;
  description: string;
};

type ProjectBase = ProjectContent & {
  slug?: string;
  transitionId?: string;
  tag: string;
  localizedContent?: Partial<Record<SiteLocale, ProjectContent>>;
};

type ImageProject = ProjectBase & {
  mediaType: "image";
  image: string;
};

type VideoProject = ProjectBase & {
  mediaType: "video";
  video: string;
  poster: string;
  extraImages?: string[];
};

type TextProject = ProjectBase & {
  mediaType: "text";
};

export type Project = ImageProject | VideoProject | TextProject;

export function getProjects(locale: SiteLocale): Project[] {
  return projects.map(({ localizedContent, ...project }) => ({
    ...project,
    ...localizedContent?.[locale],
  })) as Project[];
}

export const projects: Project[] = [
  {
    slug: "yandex-eats-smartreserve",
    transitionId: "yandex-eats-smartreserve",
    mediaType: "image",
    tag: "b2b",
    title: "Yandex Eats Analytics",
    image: "yandex-eats-panel",
    description:
      "Analytics for Yandex Eats restaurants: a partner workspace with guest, hall and forecast data",
    localizedContent: {
      ru: {
        title: "Аналитика в Яндекс Еде",
        description:
          "Аналитика для ресторанов в Яндекс Еде: рабочий кабинет с данными о гостях, зале и прогнозах",
      },
    },
  },
  {
    slug: "starter-foodhalls",
    transitionId: "starter-foodhalls",
    mediaType: "image",
    tag: "b2b",
    title: "Starter for Food Halls",
    image: "starter-foodhalls",
    description:
      "A food hall ordering flow where one basket hides the complexity of ordering from several corners",
    localizedContent: {
      ru: {
        title: "Стартер для фудхоллов",
        description:
          "Сценарий заказа из фудхолла, где одна корзина скрывает сложный процесс заказа из нескольких корнеров",
      },
    },
  },
  {
    slug: "starter-stories",
    transitionId: "starter-stories",
    mediaType: "video",
    tag: "product",
    title: "Starter Stories",
    video: "/media/videos/starter-stories/16-web-demo.mp4",
    poster: "starter-stories/16-video-poster",
    description:
      "Stories inside restaurant apps and websites: a familiar format for events, promotions and menu updates",
    localizedContent: {
      ru: {
        title: "Сторис в Стартере",
        description:
          "Сторис внутри ресторанных приложений и сайтов: привычный формат, чтобы рассказать о событиях, акциях и новинках меню",
      },
    },
  },
  {
    mediaType: "image",
    tag: "ecom",
    title: "Avgvst Jewelry",
    image: "avgvst-jewelry",
    description:
      "A website for jewelry brand AVGVST, bringing shopping together with stories about production and brand character",
    localizedContent: {
      ru: {
        title: "AVGVST",
        description:
          "Сайт бренда украшений AVGVST, который объединяет покупку и сторителлинг о производстве и характере бренда",
      },
    },
  },
  {
    mediaType: "video",
    tag: "promo",
    title: "Samokat",
    video: "/media/videos/samokat-cover.mp4",
    poster: "samokat-1",
    extraImages: ["samokat-2", "samokat-3"],
    description:
      "A promo site for Samokat about the service’s value, assortment and cities where fast delivery is already available",
    localizedContent: {
      ru: {
        title: "Самокат",
        description:
          "Промосайт Самоката о ценности сервиса, ассортименте и городах, где уже работает быстрая доставка",
      },
    },
  },
  {
    mediaType: "image",
    tag: "platform",
    title: "Arxel",
    image: "arxl",
    description:
      "A platform for architects, developers and construction teams, showing the roles and contributions behind a built project",
    localizedContent: {
      ru: {
        title: "Arxel",
        description:
          "Платформа для архитекторов, девелоперов и строительных команд, где видны роли и вклад каждого участника",
      },
    },
  },
  {
    mediaType: "image",
    tag: "editorial",
    title: "Re.View",
    image: "review",
    description:
      "A digital magazine about beauty, health and culture, grown from print into an online publication",
    localizedContent: {
      ru: {
        title: "Re.View",
        description:
          "Цифровой журнал о красоте, здоровье и культуре, который вырос из печатного журнала в онлайн-медиа",
      },
    },
  },
  {
    mediaType: "image",
    tag: "app",
    title: "PYE Home Try-On",
    image: "pye-home-tryon",
    description:
      "An app for choosing and trying on glasses: AR try-on, saved frames and home try-on orders",
    localizedContent: {
      ru: {
        title: "Приложение PYE",
        description:
          "Приложение для выбора и примерки очков: AR-примерка, избранное и заказ оправ домой",
      },
    },
  },
  {
    mediaType: "image",
    tag: "place",
    title: "Sevcableport",
    image: "sevcableport",
    description:
      "A website for Sevcableport as a city space: events, territory navigation and places worth visiting",
    localizedContent: {
      ru: {
        title: "Севкабельпорт",
        description:
          "Сайт городского пространства Севкабельпорта: события, навигация по территории и места, куда хочется пойти",
      },
    },
  },
  {
    mediaType: "image",
    tag: "product",
    title: "Yandex Eats: Big Orders",
    image: "yandex-eats",
    description:
      "A special-courier call flow for large, heavy and oversized orders",
    localizedContent: {
      ru: {
        title: "Большие заказы в Яндекс Еде",
        description:
          "Сценарий вызова спецкурьера для больших, тяжёлых и негабаритных заказов",
      },
    },
  },
];
