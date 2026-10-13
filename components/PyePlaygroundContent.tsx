import { OptimizedImage } from "./OptimizedImage";
import { PyePlaygroundVideo } from "./PyePlaygroundVideo";
import { Squircle } from "./Squircle";

export { PyePlaygroundTeaserArt } from "./PyePlaygroundTeaserArt";

const mediaRoot = "pye-tryon-app/playground";

type MediaItem = { name: string; alt: string; kind?: "fragment" };
type MediaRow = MediaItem[] | { fields: [MediaItem[], MediaItem[]] };

const visualItems: Record<string, MediaRow[]> = {
  "01-before-after": [[
    { name: "01-current-screen", alt: "Экран выпущенного приложения PYE" },
    { name: "01-concept-screen", alt: "Экран новой концепции примерки PYE" },
  ]],
  "02-camera-first": [[
    { name: "02-camera-hires-screen", alt: "Камера с названием и ценой оправы поверх отражения" },
  ]],
  "04-frame-as-lens": [[
    { name: "04-camera-reference-screen", alt: "Фото-стили в камере iPhone" },
    { name: "04-pye-lens-hires-screen", alt: "Выбор оправы как линзы в камере PYE" },
  ]],
  "05-flip-card": [
    [
      { name: "05-flip-front-screen", alt: "Лицевая сторона карточки с примеркой" },
      { name: "05-flip-back-screen", alt: "Обратная сторона карточки с фотографиями" },
    ],
    [
      { name: "05-flip-photo-screen", alt: "Фотография оправы в карточке" },
      { name: "05-flip-detail-screen", alt: "Подробности оправы в карточке" },
    ],
  ],
  "06-compact-selection": [
    [
      { name: "06-compact-a-screen", alt: "Первый компактный вариант выбора оправы", kind: "fragment" },
      { name: "06-compact-b-screen", alt: "Второй компактный вариант выбора оправы", kind: "fragment" },
    ],
    [
      { name: "06-compact-c-screen", alt: "Вариант выбора цвета оправы", kind: "fragment" },
      { name: "06-compact-d-screen", alt: "Вариант компактной панели съёмки", kind: "fragment" },
    ],
    [
      { name: "06-compact-e-screen", alt: "Вариант панели примерки", kind: "fragment" },
      { name: "06-compact-f-screen", alt: "Вариант панели оправ", kind: "fragment" },
    ],
  ],
  "07-home-try-on": [[
    { name: "07-try-on-screen", alt: "Шторка выбора оправ для домашней примерки" },
    { name: "07-cart-screen", alt: "Сохранённые оправы и покупка в PYE" },
  ]],
};

function Media({ item }: { item: MediaItem }) {
  const image = (
    <OptimizedImage
      assetKey={`${mediaRoot}/${item.name}`}
      alt={item.alt}
      sizes="(max-width: 800px) min(375px, calc(100vw - 32px)), 375px"
      lossless
    />
  );

  return (
    <Squircle cornerRadius={28} className={`pye-playground__screen${item.kind === "fragment" ? " pye-playground__screen--fragment" : ""}`}>
      {image}
    </Squircle>
  );
}

function Composition({ name, alt }: { name: string; alt: string }) {
  return (
    <div className="pye-playground__stage pye-playground__stage--composition">
      <OptimizedImage
        assetKey={`${mediaRoot}/${name}`}
        alt={alt}
        sizes="(max-width: 1156px) 100vw, 1156px"
        lossless
      />
    </div>
  );
}

function MediaFields({ fields }: { fields: MediaItem[][] }) {
  return (
    <div className={`pye-playground__fields pye-playground__fields--${fields.length}`}>
      {fields.map((items) => (
        <div
          key={items[0].name}
          className={`pye-playground__stage pye-playground__stage--${items.length === 1 ? "one" : items.length === 2 ? "two" : "three"}${items[0].kind === "fragment" ? " pye-playground__stage--fragments" : ""}`}
        >
          {items.map((item) => <Media key={item.name} item={item} />)}
        </div>
      ))}
    </div>
  );
}

function Visual({
  name,
  alt,
}: {
  name: string;
  alt: string;
}) {
  if (name === "03-mirror-reference") {
    return (
      <figure className="pye-playground__visual" aria-label={alt}>
        <Composition name="03-mirror-composition" alt="Коллаж зеркал и текста поверх камеры PYE" />
        <MediaFields fields={[[
          { name: "03-mirror-screen-b", alt: "Первый вариант надписи поверх камеры" },
          { name: "03-mirror-screen-c", alt: "Второй вариант надписи поверх камеры" },
          { name: "03-mirror-screen-d", alt: "Третий вариант надписи поверх камеры" },
        ]]} />
      </figure>
    );
  }

  if (name === "08-pye-bag") {
    return (
      <figure className="pye-playground__visual" aria-label={alt}>
        <Composition name="08-bag-composition" alt={alt} />
      </figure>
    );
  }

  return (
    <figure className="pye-playground__visual" aria-label={alt}>
      {visualItems[name].map((row) => {
        const fields = Array.isArray(row) ? [row] : row.fields;
        return <MediaFields key={fields[0][0].name} fields={fields} />;
      })}
    </figure>
  );
}

export function PyePlaygroundContent() {
  return (
    <article className="pye-playground">
      <section className="pye-playground__text pye-playground__intro">
        <p>
          У PYE уже было работающее приложение для виртуальной примерки очков.
          Мы поддерживали его, добавляли новые сценарии и выпускали изменения
          в production.
        </p>
        <p>Параллельно я исследовал другой вопрос:</p>
        <blockquote>
          «Если перестать воспринимать существующий интерфейс как данность,
          каким вообще может быть опыт виртуальной примерки?»
        </blockquote>
        <p>
          Меня интересовало не столько новое оформление, сколько более цельный
          опыт — чтобы камера, выбор оправы, фотография, сохранение и покупка
          ощущались не набором отдельных функций, а единым сценарием.
        </p>
      </section>

      <Visual
        name="01-before-after"
        alt="Работающее приложение PYE и направление новой виртуальной примерки рядом"
      />

      <section className="pye-playground__text">
        <h3>Новая версия Try-On</h3>
        <p>
          Виртуальная примерка — это в первую очередь камера. Но в существующей
          версии вокруг неё накопилось много интерфейса: выбор оправы и цвета,
          фото, избранное, карточка товара, домашняя примерка.
        </p>
        <p>
          Мне хотелось попробовать обратное: не помещать камеру внутрь
          интерфейса, а растворить интерфейс внутри камеры.
        </p>
        <p>
          Чтобы первым слоем оставался человек и его отражение, а всё остальное
          появлялось только тогда, когда действительно нужно.
        </p>
      </section>

      <Visual
        name="02-camera-first"
        alt="Концепция камеры PYE с названием и ценой оправы поверх отражения"
      />

      <section className="pye-playground__text">
        <h3>Камера как зеркало</h3>
        <p>
          Физически примерка очков начинается с зеркала. Поэтому мне было
          интересно посмотреть не только на другие AR-приложения, но и на то,
          как вообще люди взаимодействуют с отражением.
        </p>
        <p>
          На выставках, в магазинах и публичных пространствах на зеркалах часто
          появляется текст. Он существует прямо поверх отражения и дополняет
          опыт.
        </p>
        <p>
          Эта логика хорошо ложилась и на приложение. Название оправы и её цена
          могли жить прямо в камере — почти как надпись на зеркале.
        </p>
        <p>
          Для PYE это было особенно полезно: у моделей собственные имена, которые
          постоянный покупатель со временем начинает узнавать. Чем чаще название
          оказывается рядом с оправой, тем быстрее оно становится частью языка
          бренда.
        </p>
      </section>

      <Visual
        name="03-mirror-reference"
        alt="Примеры надписей на зеркалах и варианты текста поверх камеры PYE"
      />

      <section className="pye-playground__text">
        <h3>Оправа как линза</h3>
        <p>Ещё один референс пришёл из самой камеры телефона.</p>
        <p>
          В интерфейсе iPhone фото-стили переключаются карточками-линзами,
          меняя вид фотографии. Мне понравилась эта модель: камера остаётся на
          месте, а пользователь перебирает разные способы посмотреть на себя.
        </p>
        <p>
          Похожим образом можно переключать оправы. Тогда выбор модели
          переставал ощущаться отдельным каталогом, который перекрывает камеру,
          и становился частью самой примерки.
        </p>
      </section>

      <Visual
        name="04-frame-as-lens"
        alt="Сопоставление интерфейса камеры телефона и выбора оправы в PYE"
      />

      <section className="pye-playground__text">
        <h3>Карточку можно перевернуть</h3>
        <p>
          AR хорошо отвечает на главный вопрос: «как эти очки выглядят на мне?».
          Но материал, детали дужек, конструкцию оправы всё равно удобнее
          рассматривать на обычных фотографиях.
        </p>
        <p>
          Поэтому карточка оправы могла работать как физический объект: с одной
          стороны — примерка, с другой — подробности и фотографии. Так камера
          оставалась главным пространством приложения, а информация о товаре
          появлялась, когда она нужна.
        </p>
      </section>

      <Visual
        name="05-flip-card"
        alt="Концепты лицевой стороны карточки с примеркой и обратной стороны с фотографиями"
      />

      <section className="pye-playground__text">
        <h3>Выбор оправы не должен съедать зеркало</h3>
        <p>
          В существующем интерфейсе большая лента оправ занимает заметную часть
          экрана. Но разглядеть продукт в маленькой превьюшке всё равно сложно —
          для деталей удобнее открыть подробности.
        </p>
        <p>
          Я пробовал сделать сам выбор компактнее и вернуть больше пространства
          камере.
        </p>
        <p>
          В одном из направлений цвет оправы стал почти слайдером внутри
          карточки, а съёмка стала ближе к привычной логике камеры — круглая
          кнопка под пальцем.
        </p>
      </section>

      <Visual
        name="06-compact-selection"
        alt="Варианты уменьшения панели выбора оправы, освобождающие место для камеры"
      />

      <div className="pye-playground__text">
        <p>
          Фотография — естественный результат примерки: человек уже смотрит на
          себя через камеру.
        </p>
        <p>
          Поэтому мне не хотелось делать из съёмки отдельный сценарий. В первых
          же вариантах я вынес кнопку из отдельного режима и сделал привычный
          паттерн: короткое нажатие делает фото, удержание начинает запись видео.
        </p>
      </div>

      <section className="pye-playground__text">
        <h3>Избранное</h3>
        <p>
          Очки — это вещь, с которой трудно определиться за секунду. Они
          находятся прямо на лице и сильно меняют то, как человек выглядит.
        </p>
        <p>
          Поэтому идея обычного «избранного» казалась слишком абстрактной. Мне
          хотелось одного понятного места, где можно собрать понравившиеся
          оправы, а уже потом решить, что с ними делать.
        </p>
        <p>
          Так появился домик — общее место для сохранённых моделей и домашней
          примерки.
        </p>
      </section>

      <PyePlaygroundVideo />

      <div className="pye-playground__text">
        <p>
          До четырёх оправ можно примерить дома. Это стало частью самой
          механики: пользователь выбирает понравившиеся модели, складывает их
          в отдельную шторку, а пустые слоты показывают, сколько ещё можно
          добавить.
        </p>
      </div>

      <Visual
        name="07-home-try-on"
        alt="Состояния домашней примерки с выбранными оправами и пустыми местами"
      />

      <div className="pye-playground__text">
        <p>
          Интерфейс здесь не просто сообщает ограничение, а подталкивает
          воспользоваться домашней примеркой на полную: если примерка
          бесплатная, почему бы не взять четыре?
        </p>
        <p>
          Для покупки появился второй физический образ — пакет PYE. Сами пакеты
          являются заметной частью визуальной культуры: они меняются, выглядят
          как отдельные коллекционные объекты и легко узнаются.
        </p>
      </div>

      <Visual
        name="08-pye-bag"
        alt="Пакеты PYE рядом с концепцией экрана покупки оправ"
      />

      <section className="pye-playground__text pye-playground__ending">
        <h3>Интерфейс не обязан начинаться с интерфейсов</h3>
        <p>
          В этой части проекта мне было интереснее всего искать решения не
          только среди других приложений.
        </p>
        <p>
          Зеркало подсказало, как показать информацию поверх камеры. Линзы —
          как переключать оправы, а пакет — как отделить покупку от примерки.
        </p>
        <p>
          Интерфейс может использовать цифровые паттерны, но опыт физического
          мира у человека намного старше любого приложения.
        </p>
        <p>Мне хотелось, чтобы виртуальная примерка опиралась и на то, и на другое.</p>
      </section>
    </article>
  );
}
