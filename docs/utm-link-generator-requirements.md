# UTM-ссылки: требования к генератору

Документ — единственный словарь для генератора ссылок на `sevakudryavtsev.com`.
Цель: в GA4 понимать, откуда пришёл человек, где именно он увидел ссылку и какую
страницу портфолио открыл — без длинных и разнородных меток.

## Формат ссылки

```text
https://sevakudryavtsev.com/<страница>?utm_source=<source>&utm_medium=<medium>&utm_campaign=<campaign>&utm_content=<content>
```

- Базовый адрес — выбранная страница сайта. По умолчанию: `https://sevakudryavtsev.com/`.
- Всегда добавлять четыре параметра: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`.
- Если в адресе уже есть параметры, добавлять UTM через `&`, иначе через `?`.
- Генератор должен кодировать параметры URL-encoding.
- Порядок параметров всегда одинаковый: `source`, `medium`, `campaign`, `content`.

## Общие правила значений

- Только строчные латинские буквы, цифры, `_` и `-`.
- Не использовать пробелы, кириллицу, эмодзи, сокращения «на глаз» и разные варианты одного названия.
- Для одного размещения выпускать одну и ту же ссылку повторно; не создавать новую метку без причины.
- Не использовать персональные данные, имя получателя, текст сообщения или дату в UTM.
- Максимум 40 символов на значение. Предпочтительны короткие значения.

## Поля генератора

### `utm_source` — площадка

Обязательное поле. Выбирается только из словаря.

| Площадка | Значение |
| --- | --- |
| Telegram | `telegram` |
| LinkedIn | `linkedin` |
| Instagram | `instagram` |
| Behance | `behance` |
| Dribbble | `dribbble` |
| Read.cv | `readcv` |
| Medium | `medium` |
| Substack | `substack` |
| X / Twitter | `x` |
| Facebook | `facebook` |
| VK | `vk` |
| YouTube | `youtube` |
| TikTok | `tiktok` |
| Pinterest | `pinterest` |
| Reddit | `reddit` |
| GitHub | `github` |
| ADPList | `adplist` |
| VC.ru | `vc` |
| DTF | `dtf` |
| Product Hunt | `producthunt` |
| WhatsApp | `whatsapp` |
| Discord | `discord` |
| Slack | `slack` |
| Email / рассылка | `email` |
| QR-код офлайн | `qr` |
| Партнёрский сайт или статья | короткий домен без `.com`, например `example` |

Для новой площадки генератор должен предлагать короткое латинское название и
сохранять его в этом документе до первого использования.

### `utm_medium` — тип размещения

Обязательное поле. Это не название платформы, а способ, которым человек увидел ссылку.

| Ситуация | Значение |
| --- | --- |
| Публичный пост, профиль, комментарий, сторис, видео | `social` |
| Личное сообщение в мессенджере | `messenger` |
| Письмо, рассылка, подпись | `email` |
| Ссылка с чужого сайта или статьи | `referral` |
| QR-код | `qr` |
| Платное размещение | `paid_social` |

Не использовать `link`, `post`, `profile`, `telegram` и похожие значения в
`utm_medium`: для этого есть `utm_content` и `utm_source`.

### `utm_campaign` — зачем размещена ссылка

Обязательное поле. Кампания объединяет ссылки одной цели, а не одного поста.

| Цель | Значение |
| --- | --- |
| Основное представление портфолио | `portfolio` |
| Поиск работы | `job_search` |
| Конкретный кейс | `case_<slug>` |
| Новое обновление сайта или кейса | `site_update` |
| Нетворкинг / знакомство | `networking` |
| Выступление, статья, интервью | `publication` |
| Личная рекомендация | `recommendation` |

Примеры `case_<slug>`: `case_starter_foodhalls`, `case_yandex_eats_smartreserve`.

### `utm_content` — конкретное место ссылки

Обязательное поле. Позволяет сравнивать видимые размещения внутри одной площадки.

| Место | Значение |
| --- | --- |
| Ссылка в профиле | `profile` |
| Обычный пост | `post` |
| Закреплённый пост | `pinned_post` |
| Комментарий | `comment` |
| Сторис | `story` |
| Видео / описание видео | `video` |
| Канал Telegram | `channel` |
| Чат Telegram | `chat` |
| Личное сообщение | `dm` |
| Подпись письма | `signature` |
| Письмо / рассылка | `newsletter` |
| Карточка профиля на внешнем сервисе | `listing` |
| QR-код на визитке | `business_card` |
| QR-код на событии | `event` |
| Ссылка в чужой статье | `article` |

Если на одной площадке одновременно несколько одинаковых размещений, добавлять
к значению короткий порядковый суффикс: `post_1`, `post_2`, `channel_1`.
Не добавлять дату, пока без неё можно отличить размещения.

## Готовые примеры

| Сценарий | Ссылка |
| --- | --- |
| Ссылка в LinkedIn-профиле | `https://sevakudryavtsev.com/?utm_source=linkedin&utm_medium=social&utm_campaign=portfolio&utm_content=profile` |
| Пост в Telegram-канале о поиске работы | `https://sevakudryavtsev.com/?utm_source=telegram&utm_medium=social&utm_campaign=job_search&utm_content=channel` |
| Личное сообщение в Telegram | `https://sevakudryavtsev.com/?utm_source=telegram&utm_medium=messenger&utm_campaign=networking&utm_content=dm` |
| Ссылка на кейс в Behance-профиле | `https://sevakudryavtsev.com/yandex-eats-smartreserve/?utm_source=behance&utm_medium=social&utm_campaign=case_yandex_eats_smartreserve&utm_content=profile` |
| Подпись в письме | `https://sevakudryavtsev.com/?utm_source=email&utm_medium=email&utm_campaign=job_search&utm_content=signature` |
| QR-код на визитке | `https://sevakudryavtsev.com/?utm_source=qr&utm_medium=qr&utm_campaign=portfolio&utm_content=business_card` |

## Поведение генератора

1. Показывать выбор страницы сайта, источника, типа размещения, кампании и места ссылки.
2. Для источника, типа размещения и места ссылки использовать выпадающие списки из этого документа.
3. Для кампании предлагать готовые варианты и отдельный режим `case_<slug>`.
4. Показывать готовую ссылку, кнопку копирования и расшифровку выбранных меток.
5. Перед копированием проверять: все четыре UTM заполнены, значения соответствуют правилам, а ссылка ведёт на `https://sevakudryavtsev.com`.
6. Не сокращать ссылку через сторонний сервис: UTM-ссылка должна оставаться прозрачной и доступной для проверки.

## Как смотреть результат в GA4

- Основной отчёт: `Traffic acquisition`.
- Сравнение площадок: `Session source`.
- Сравнение типов размещения: `Session medium`.
- Сравнение целей: `Session campaign`.
- Сравнение конкретных размещений: `Session manual ad content`.
- Для оценки качества трафика сопоставлять эти поля с событиями `case_opened`, `case_viewed`, `case_read_depth`, `contact_intent` и `outbound_link_clicked`.
