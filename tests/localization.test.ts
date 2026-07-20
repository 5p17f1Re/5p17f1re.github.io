import { describe, expect, it } from "vitest";
import { getLanguageSwitchState } from "../data/language-switch";
import { getCasePath } from "../data/cases";
import { getLocalizedPath } from "../data/locales";
import { getAbout } from "../data/about";
import { getProjects } from "../data/projects";
import { getUiText } from "../data/ui-text";

describe("localized paths", () => {
  it("keeps English paths unprefixed and puts Russian under /ru", () => {
    expect(getLocalizedPath({ locale: "en" })).toBe("/");
    expect(getLocalizedPath({ locale: "en", slug: "starter-foodhalls" })).toBe(
      "/starter-foodhalls/",
    );
    expect(getLocalizedPath({ locale: "ru", slug: "starter-foodhalls" })).toBe(
      "/ru/starter-foodhalls/",
    );
  });

  it("keeps Russian legacy cases reachable from the Russian homepage", () => {
    expect(getCasePath({ locale: "ru", slug: "starter-foodhalls" })).toBe(
      "/starter-foodhalls/",
    );
  });

  it("publishes SmartReserve in English and Russian localized routes", () => {
    expect(getCasePath({ locale: "en", slug: "yandex-eats-smartreserve" })).toBe(
      "/yandex-eats-smartreserve/",
    );
    expect(getCasePath({ locale: "ru", slug: "yandex-eats-smartreserve" })).toBe(
      "/ru/yandex-eats-smartreserve/",
    );

    expect(getLanguageSwitchState("/yandex-eats-smartreserve/").targetPath).toBe(
      "/ru/yandex-eats-smartreserve/",
    );
    expect(
      getLanguageSwitchState("/ru/yandex-eats-smartreserve/").targetPath,
    ).toBe("/yandex-eats-smartreserve/");
  });

  it("enables the language control for the published Russian homepage", () => {
    const homepageSwitch = getLanguageSwitchState("/");
    const caseSwitch = getLanguageSwitchState("/starter-foodhalls/");

    expect(homepageSwitch).toMatchObject({
      currentLocale: "en",
      targetLocale: "ru",
    });
    expect(homepageSwitch.targetPath).toBe("/ru/");
    expect(caseSwitch).toMatchObject({
      currentLocale: "ru",
      targetLocale: "en",
    });
    expect(caseSwitch.targetPath).toBeUndefined();
    expect(caseSwitch.unavailableMessage).toBe(
      "Английская версия готовится",
    );
  });

  it("uses approved Russian card copy when it is available", () => {
    const [englishProject] = getProjects("en");
    const [russianProject] = getProjects("ru");

    expect(englishProject.description).toBe(
      "Designed partner analytics that help restaurants understand guest behavior, track retention and forecast revenue",
    );
    expect(russianProject.description).toBe(
      "Аналитика для ресторанов в Яндекс Еде: рабочий кабинет с данными о гостях, зале и прогнозах",
    );
    expect(russianProject.title).toBe("Аналитика в Яндекс Еде");
  });

  it("keeps interface copy separate from publication content", () => {
    expect(getUiText("ru")).toMatchObject({
      birdview: "Сетка",
      snakeview: "Лента",
      readCase: "Смотреть",
      email: "Email",
      copiedToClipboard: "скопировано в буфер",
    });
  });

  it("keeps approved biographies separate from interface copy", () => {
    const russianAbout = getAbout("ru");

    expect(russianAbout.name).toBe("Сева Кудрявцев");
    expect(russianAbout.paragraphs[0]).toBe(
      "Дизайнер с 11-летним опытом. Соединяю системность сложных B2B-продуктов с качеством потребительских интерфейсов.",
    );
  });
});
