# Настройка photo publishing v0

Этот файл описывает внешнюю настройку. Секреты, токены, реальные Cloudflare IDs
и private keys сюда не записываются.

Основной план и решения: [`photo-publishing-plan.md`](photo-publishing-plan.md).
Перед настройкой прочитай его и [`decision-log.md`](decision-log.md).

## Имена и Wrangler

Инфраструктура использует нейтральные имена:

- Worker `photo-publisher-5555`;
- D1 database `photo-publisher-5555-db`;
- приватный R2 bucket `photo-publisher-5555-staging`.

Для Telegram можно использовать отображаемое имя `Photo Publisher`. Уникальный
`@username` бот получает в BotFather; например, `@photo_publisher_5555_bot`,
если такое имя свободно. Занятость username заранее гарантировать нельзя.

Wrangler — официальный командный инструмент Cloudflare для создания, настройки
и деплоя Worker, D1 и R2. Это не отдельный сервер и не платный сервис. В нашем
репозитории он уже установлен как локальная зависимость, поэтому команда

```bash
pnpm --dir publisher-worker exec wrangler <команда>
```

запускает зафиксированную версию Wrangler из этого проекта. Фраза
«с авторизованным Wrangler» означает: один раз выполнить

```bash
pnpm --dir publisher-worker exec wrangler login
pnpm --dir publisher-worker exec wrangler whoami
```

Первая команда откроет окно Cloudflare в браузере и попросит разрешить доступ,
вторая покажет, под каким аккаунтом выполнен вход. Для этого первоначального
входа может понадобиться VPN. Установка и login описаны в [официальной
документации Wrangler](https://developers.cloudflare.com/workers/wrangler/).

## 1. Что нужно создать один раз

### Cloudflare

Создай или проверь:

- Worker `photo-publisher-5555`;
- D1 database `photo-publisher-5555-db`;
- приватный R2 bucket `photo-publisher-5555-staging`;
- отдельный R2 API token с разрешением **Object Read only** только для bucket
  `photo-publisher-5555-staging` — он нужен GitHub Actions.

Account ID можно скопировать в Cloudflare через Workers & Pages → Account
Details или через команду поиска `Copy account ID`; это объясняется в [официальной
инструкции Cloudflare](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/).

### Telegram

Нужны:

- token бота;
- числовой `chat_id` твоего личного чата с ботом.

Бота создай через [@BotFather](https://t.me/BotFather), команда `/newbot`.
Telegram выдаст token один раз; относись к нему как к паролю и не отправляй его
в чат или Git. Официальное объяснение — в [гайде Telegram от BotFather до
первого бота](https://core.telegram.org/bots/tutorial).

`chat_id` берётся не в BotFather. До установки webhook:

1. открой своего бота и отправь ему `/start`;
2. выполни запрос `getUpdates` с полученным token;
3. найди в ответе `result[].message.chat.id` — это и есть `OWNER_CHAT_ID`;
4. после этого можно устанавливать webhook.

`getUpdates` и webhook — взаимоисключающие способы получения сообщений, поэтому
этот шаг выполняется до `setWebhook`. Подробности и формат объекта `Update` — в
[Telegram Bot API](https://core.telegram.org/bots/api#getupdates).

Для проверки вручную команда выглядит так:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates"
```

Не вставляй настоящий token в документацию, commit или общий shell history.

### GitHub

Открой репозиторий → **Settings → Secrets and variables → Actions → New
repository secret**. Это официальный [гайд по секретам в GitHub
Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

Создай следующие repository secrets:

| Secret | Что положить | Где взять |
| --- | --- | --- |
| `PHOTO_PUBLISHER_URL` | URL Worker, например `https://photo-publisher-5555.<subdomain>.workers.dev` | вывод команды `wrangler deploy` |
| `PUBLISHER_INTERNAL_TOKEN` | случайная строка для внутренних batch endpoints | сгенерировать локально; то же значение записать в Worker Secret `INTERNAL_API_TOKEN` |
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` | Account ID Cloudflare; формат подтверждён в [документации R2](https://developers.cloudflare.com/r2/api/tokens/) |
| `R2_BUCKET` | `photo-publisher-5555-staging` | имя созданного R2 bucket |
| `R2_ACCESS_KEY_ID` | Access Key ID | создаётся вместе с R2 API token |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key | показывается при создании R2 API token один раз |

`GITHUB_TOKEN` вручную создавать не нужно: GitHub Actions выдаёт его workflow
автоматически. В этом workflow он используется для commit и push в тот же
репозиторий.

## 2. Создание Cloudflare-ресурсов

Команды выполняются из `site-nextjs/` после `wrangler login`:

```bash
pnpm --dir publisher-worker exec wrangler d1 create photo-publisher-5555-db
pnpm --dir publisher-worker exec wrangler r2 bucket create photo-publisher-5555-staging
```

Команда D1 напечатает `database_id`. Впиши его в
`publisher-worker/wrangler.jsonc` вместо `REPLACE_WITH_D1_DATABASE_ID`. Это не
секрет, но он относится к конкретному Cloudflare аккаунту.

После создания R2 открой Cloudflare Dashboard → R2 → Overview → Manage API
Tokens → Create API token. Выбери **Object Read only**, ограничь токен bucket
`photo-publisher-5555-staging`, затем сохрани выданные `Access Key ID` и
`Secret Access Key` в GitHub Secrets. Cloudflare не показывает Secret Access
Key повторно; [официальная инструкция R2](https://developers.cloudflare.com/r2/api/tokens/)
описывает этот шаг.

## 3. Worker secrets и случайные значения

Сгенерируй два разных случайных значения локально:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Первое используй как `PUBLISHER_INTERNAL_TOKEN` в GitHub и как
`INTERNAL_API_TOKEN` в Worker. Второе используй как `TELEGRAM_WEBHOOK_SECRET`
в Worker и в команде `setWebhook`. Не используй один секрет для обеих целей.

Установи Worker secrets:

```bash
pnpm --dir publisher-worker exec wrangler secret put TELEGRAM_BOT_TOKEN
pnpm --dir publisher-worker exec wrangler secret put TELEGRAM_WEBHOOK_SECRET
pnpm --dir publisher-worker exec wrangler secret put INTERNAL_API_TOKEN
pnpm --dir publisher-worker exec wrangler secret put OWNER_CHAT_ID
pnpm --dir publisher-worker exec wrangler secret put GITHUB_ACTIONS_TOKEN
```

На каждом запросе Wrangler попросит вставить значение. Локально для разработки
можно создать `publisher-worker/.dev.vars` по образцу `.dev.vars.example`; этот
файл не коммитится.

`GITHUB_ACTIONS_TOKEN` — отдельный fine-grained GitHub token только для этого
репозитория с разрешением **Actions: Read and write**. Он нужен команде
`publish`, чтобы Worker мог вызвать `workflow_dispatch`; в Telegram или Git этот
token не записывается. Для workflow dispatch GitHub требует именно write-доступ
к Actions ([официальная документация](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)).

Примени миграцию и задеплой Worker:

```bash
pnpm --dir publisher-worker exec wrangler d1 migrations apply DB --remote
pnpm --dir publisher-worker exec wrangler deploy
```

`wrangler deploy` выведет URL Worker. Его положи в `PHOTO_PUBLISHER_URL` без
завершающего `/`.

## 4. Подключение Telegram webhook

Выполняй команду локально, подставив свои значения:

```bash
curl --fail-with-body --silent --show-error \
  -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://photo-publisher-5555.<subdomain>.workers.dev/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
  -d 'allowed_updates=["message","callback_query"]'
```

Проверь Worker:

```bash
curl --fail-with-body --silent --show-error \
  "https://photo-publisher-5555.<subdomain>.workers.dev/health"
```

Worker должен вернуть JSON с `"ok":true`. Доступ к Cloudflare Dashboard, API и
первоначальной настройке может потребовать VPN из России; это не должно
влиять на обычную раздачу уже опубликованного GitHub Pages сайта.

## 5. Первый ручной E2E

До включения cron:

1. отправь боту `/start`;
2. отправь одну небольшую фотографию;
3. отправь фотофайл с необязательной подписью в том же сообщении;
4. проверь одну квитанцию с датой и местом из EXIF; при необходимости нажми
   «Изменить подпись», «Изменить дату» или «Изменить место»;
5. убедись, что после текстового ответа новый вопрос появляется ниже ответа,
   а не редактирует сообщение сверху;
6. нажми «Отправить в очередь» и проверь, что в чате осталась одна итоговая
   квитанция;
7. проверь, что Worker отвечает, а фото находится в приватном R2;
8. добавь GitHub Secrets из таблицы выше;
9. запусти workflow **Publish photo batch** через `workflow_dispatch`;
10. проверь один commit, `public/photos/<year>/<month>/`, JSON и Pages deploy;
11. открой `/photos/` и `/ru/photos/` на публичном домене;
12. проверь в D1, что draft перешёл в `published`.
13. отправь `/published`, затем `/unpublish 1`; дождись второго workflow и проверь,
    что запись исчезла с обоих photo-маршрутов, а строка draft осталась в D1 с
    `publication_status = unpublished`.

После этого в Telegram доступны команды:

```text
/help
/q
/1 2 5 cancel
/cancel all
/publish
/published
/unpublish 3
```

`/publish` запускает тот же workflow сразу. Отмена действует только на элементы
со статусом `ready`; уже захваченный batch (`batching`) не прерывается.
`/unpublish` работает только с уже опубликованными записями, которые сначала
нужно увидеть через `/published`; он снимает публичные производные, но не
удаляет историю в D1 и оригиналы.

Если batch или Pages завершается ошибкой, staging-копия должна остаться в R2,
а запись — стать `failed` и быть доступной для следующего запуска.

## 6. Включение расписания

Cron намеренно закомментирован в `.github/workflows/publish-photos.yml`. После
успешного ручного E2E раскомментируй блок `schedule` и закоммить это отдельным
техническим изменением. Значение `0 17 * * 3` означает среду 20:00 по
Москве в периоде UTC+3.

Если за неделю нет подтверждённых фотографий, workflow должен завершиться без
commit и без deploy. Пауза в несколько месяцев не требует отдельной активации.

## 7. Безопасное обслуживание

- не делай R2 bucket public и не добавляй `r2.dev` URL на сайт;
- не копируй Telegram token или R2 secret в workflow YAML;
- не используй read-only R2 key в локальном Worker или браузере;
- не удаляй staging до статуса `published`;
- при снятии публикации не удаляй D1-запись: она нужна для истории и диагностики;
- при смене токена обновляй Worker Secret и GitHub Secret в одном техническом
  окне, затем повторяй health и ручной E2E;
- оригиналы продолжай хранить в двух локальных копиях — этот сервис их не
  заменяет.
