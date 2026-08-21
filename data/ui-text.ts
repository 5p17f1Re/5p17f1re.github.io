import type { SiteLocale } from "./locales";

export type UiText = {
  portfolioHeading: string;
  skipToContent: string;
  primaryNavigation: string;
  birdview: string;
  snakeview: string;
  readCase: string;
  openCaseStudy: (title: string) => string;
  email: string;
  copiedToClipboard: string;
  languageUnavailable: Record<SiteLocale, string>;
  pauseVideo: string;
  playVideo: string;
  pauseVideoLabel: string;
  playVideoLabel: string;
  telegramChannelTitle: string;
  telegramChannelDescription: string;
  telegramChannelHoverDescription: string;
  telegramChannelLinkLabel: string;
  footerContactBeforeTelegram: string;
  footerContactBetweenLinks: string;
  footerLastUpdated: string;
  footerVersion: string;
  photosEyebrow: string;
  photosTitle: string;
  photosDescription: string;
  photosEmpty: string;
  photosLocation: string;
  footerLanguageLinkLabel: string;
  footerLanguageLinkAriaLabel: string;
};

export const uiText: Record<SiteLocale, UiText> = {
  en: {
    portfolioHeading: "Seva Kudryavtsev",
    skipToContent: "Skip to content",
    primaryNavigation: "Primary navigation",
    birdview: "Birdview",
    snakeview: "Snakeview",
    readCase: "Read Case",
    openCaseStudy: (title) => `Open case study: ${title}`,
    email: "Email",
    copiedToClipboard: "copied to clipboard",
    languageUnavailable: {
      en: "",
      ru: "Russian version is coming soon",
    },
    pauseVideo: "Pause video",
    playVideo: "Play video",
    pauseVideoLabel: "Pause",
    playVideoLabel: "Watch",
    telegramChannelTitle: "Héraut du Sevrage",
    telegramChannelDescription:
      "Blog about profession, craft and the internet",
    telegramChannelHoverDescription: "Open @mybeautifulheaven on Telegram",
    telegramChannelLinkLabel: "Open Héraut du Sevrage on Telegram",
    footerContactBeforeTelegram: "Reach me on",
    footerContactBetweenLinks: "or",
    footerLastUpdated: "Last Update",
    footerVersion: "Version",
    photosEyebrow: "Personal space",
    photosTitle: "Photos",
    photosDescription: "A slow collection of photographs, gathered over time.",
    photosEmpty: "The first photographs will appear here after the next publication batch.",
    photosLocation: "Location",
    footerLanguageLinkLabel: "По-русски",
    footerLanguageLinkAriaLabel: "Открыть русскую версию",
  },
  ru: {
    portfolioHeading: "Сева Кудрявцев",
    skipToContent: "К содержанию",
    primaryNavigation: "Основная навигация",
    birdview: "Сетка",
    snakeview: "Лента",
    readCase: "Смотреть",
    openCaseStudy: (title) => `Открыть кейс: ${title}`,
    email: "Email",
    copiedToClipboard: "скопировано в буфер",
    languageUnavailable: {
      en: "Английская версия готовится",
      ru: "",
    },
    pauseVideo: "Поставить видео на паузу",
    playVideo: "Воспроизвести видео",
    pauseVideoLabel: "Пауза",
    playVideoLabel: "Смотреть",
    telegramChannelTitle: "Héraut du Sevrage",
    telegramChannelDescription: "Блог о профессии, ремесле и интернете",
    telegramChannelHoverDescription:
      "Открыть @mybeautifulheaven в Telegram",
    telegramChannelLinkLabel: "Открыть Héraut du Sevrage в Telegram",
    footerContactBeforeTelegram: "Связаться со мной в",
    footerContactBetweenLinks: "или",
    footerLastUpdated: "Последнее обновление",
    footerVersion: "Версия",
    photosEyebrow: "Личное пространство",
    photosTitle: "Фотографии",
    photosDescription: "Медленная коллекция фотографий, собранная со временем.",
    photosEmpty: "Первые фотографии появятся здесь после ближайшего batch публикации.",
    photosLocation: "Место",
    footerLanguageLinkLabel: "In English",
    footerLanguageLinkAriaLabel: "Open English version",
  },
};

export function getUiText(locale: SiteLocale) {
  return uiText[locale];
}
